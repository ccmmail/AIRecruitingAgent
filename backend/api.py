"""API for generating a resume review and changes tailored to a given job description."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from pathlib import Path
import os, shutil
from dotenv import load_dotenv
from langsmith import traceable, Client
import json
from .diff import redline_diff

# Load environment variables from .env file
load_dotenv()
# Define the directory paths for working files
BASE_DIR = Path(__file__).resolve().parent.parent
USER_DIR = BASE_DIR / "user"
PROMPT_DIR = BASE_DIR / "prompts"
TEMP_DIR = BASE_DIR / "temp"
# User data
RESUME_FILE = USER_DIR / "resume.txt"
ADDITIONAL_EXPERIENCE_FILE = USER_DIR / "additional_candidate_info.txt"
# Prompt templates
PROMPT_RESUME_REVIEW_FILE = PROMPT_DIR / "prompt_resume_review_GOLD.txt"
PROMPT_DIFF_FILE = PROMPT_DIR / "prompt_resume_diff_GOLD.txt"
# Temp working files
RESUME_DIFF_FILE = TEMP_DIR / "resume_diff.txt"
RESUME_BASELINE_FILE = TEMP_DIR / "resume_baseline.txt"
RESUME_REVISED_FILE = TEMP_DIR / "resume_revised.txt"
USER_RESPONSE_FILE = TEMP_DIR / "user_response.json"
OUTPUT_FROM_LLM_PRIOR_FILE = TEMP_DIR / "LLM_response_prior.json"
OUTPUT_FROM_LLM_CURRENT_FILE = TEMP_DIR / "LLM_response_current.json"
JOB_DESCRIPTION_FILE = TEMP_DIR / "job_description.txt"
# Demo files
JOB_DESCRIPTION_DEMO_FILE = TEMP_DIR / "job_description_demo.txt"
RESPONSE_REVIEW_ADD_INFO_DEMO_FILE = TEMP_DIR / "API_response_review_add_info_demo.json"
RESPONSE_REVIEW_DEMO_FILE = TEMP_DIR / "API_response_review_demo.json"


# Initialize the FastAPI application, OpenAI client, and LangSmith tracer
app = FastAPI(debug=True)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
LLM = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
os.environ["LANGSMITH_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "AIRecruitingAgent"
langsmith_client = Client(api_key=os.getenv("LANGSMITH_API_KEY"))


@app.get("/")
def show_heartbeat():
    """Return a message to show API is up."""
    return {"message": "Hello World"}

@traceable(name="prompt_LLM")
def prompt_LLM(prompt: str) -> str:
    """Call OpenAI API to get a response."""
    response = LLM.chat.completions.create(
        model="gpt-5-mini",
        temperature=1,
        messages=[{"role": "user",
                   "content": prompt}
                  ]
    )
    return response.choices[0].message.content.strip()


def create_resume_diff(baseline:str, revised:str) -> str:
    """Create a redlined diff between two resume versions."""
    diff = redline_diff(baseline, revised)
    return diff


class URL(BaseModel):
    """Define the shape of data expected by /jobdescription."""
    url: str  # URL of the page requesting the job description
    demo: bool = False   # if true, return static demo response


@app.post("/jobdescription")
def get_job_description_from_URL(url:URL):
    """Clear old working files and fetch job description from URL."""
    # delete old working files
    try:
        shutil.copyfile(RESUME_FILE, RESUME_BASELINE_FILE) # make the user's saved resume.txt the new baseline
        os.remove(RESUME_REVISED_FILE)
        os.remove(OUTPUT_FROM_LLM_PRIOR_FILE)
        os.remove(OUTPUT_FROM_LLM_CURRENT_FILE)
        os.remove(USER_RESPONSE_FILE)
    except FileNotFoundError:
        pass

    # TODO: Implement logic to fetch job description based on URL vs. canned response
    with open(JOB_DESCRIPTION_DEMO_FILE, "r") as file:
        job_description = file.read()

    # save the job description to a file
    with open(JOB_DESCRIPTION_FILE, "w") as file:
        file.write(job_description)

    response = {"job_description": job_description}
    return response


def create_review_prompt(job_description: str) -> str:
    """Create JSON input and inject into prompt template."""
    # create the JSON input for the LLM
    input_dict = {}
    input_dict["Job_Description"] = job_description
    with open(RESUME_BASELINE_FILE, "r") as file:
        input_dict["Resume"] = file.read()
    with open(ADDITIONAL_EXPERIENCE_FILE, "r") as file:
        input_dict["Additional_Info"] = file.read()

    # add fit, gap_map and qa_pairs if they exist
    try:
        with open(OUTPUT_FROM_LLM_CURRENT_FILE, "r") as file:
            LLM_response = json.load(file)
            input_dict["Fit"] = LLM_response["Fit"]
            input_dict["Gap_Map"] = LLM_response["Gap_Map"]
    except FileNotFoundError:  # no working files on first run
        pass
    try:
        with open(USER_RESPONSE_FILE, "r") as file:
            user_response = json.load(file)
            input_dict["qa_pairs"] = user_response
    except FileNotFoundError:  # no user response on first run
        pass

    # replace placeholder {{input}} in the prompt template
    with open(PROMPT_RESUME_REVIEW_FILE, "r") as file:
        prompt = file.read()

    input_json = json.dumps(input_dict, indent=4)
    prompt = prompt.replace("{{INPUT}}", input_json)

    return prompt


class JobListing(BaseModel):
    """Define the shape of data expected by /review."""
    job_description: str  # Job description to be reviewed
    url: str  # URL of calling page for tracking purposes
    save_output: bool = False   # if true, save LLM response and markdown resume to files
    demo: bool = False   # if true, return static demo response


@app.post("/review")
@traceable(name="generate_review_endpoint")
def generate_review(job_listing: JobListing):
    """Generate a review and tailored resume based on the job description.
    Algo:
    1. If demo is true, return canned response
    2. Create LLM prompt with create_review_prompt()
    3. Call prompt_LLM with the prompt
    4. Save the response to OUTPUT_FROM_LLM_CURRENT_FILE
    5. Save the revised resume to RESUME_REVISED
    6. Save the diff of baseline and revised resumes in the API response
    7. Return the response
    """
    if job_listing.demo:
        # returned stubbed API response
        with open(RESPONSE_REVIEW_DEMO_FILE, "r") as file:
            response_json = file.read()
            response = json.loads(response_json)
        return response

    prompt = create_review_prompt(job_listing.job_description)
    LLM_response_json = prompt_LLM(prompt)
    response = json.loads(LLM_response_json)

    # rotate the files to keep the last two LLM responses
    try:
        os.replace(OUTPUT_FROM_LLM_CURRENT_FILE, OUTPUT_FROM_LLM_PRIOR_FILE)
    finally:
        with open(OUTPUT_FROM_LLM_CURRENT_FILE, "w") as file:
            file.write(LLM_response_json)

    revised_resume = response["Tailored_Resume"]
    # update the resume_revised file with the one from the response
    with open(RESUME_REVISED_FILE, "w") as file:
        file.write(revised_resume)
    # diff the baseline and revised resumes, and save the diff in the API response
    with open(RESUME_BASELINE_FILE, "r") as file:
        baseline = file.read()
    diff = create_resume_diff(baseline, revised_resume)
    response["Tailored_Resume"] = diff

    return response


class QuestionAnswers(BaseModel):
    """Define the shape of data expected by /questions_answers."""
    qa_pairs: list[dict[str, str]]  # list of question-answer pairs
    demo: bool = False   # if true, return static demo response


@app.post("/questions")
def process_questions_and_answers(user_response: QuestionAnswers):
    """Generate an updated review and resume based on candidate's answers.
    Algo:
    1. If demo is true, return canned response
    2. Save user response to USER_RESPONSE_FILE
    4. Call generate_review() to get the updated review and resume
    """
    if user_response.demo:
        with open(RESPONSE_REVIEW_ADD_INFO_DEMO_FILE, "r") as file:
            response_json = file.read()
            response = json.loads(response_json)
        return response

    user_response_dict = user_response.qa_pairs
    with open(USER_RESPONSE_FILE, "w") as file:
        json.dump(user_response_dict, file, indent=4)

    job_listing = JobListing()
    with open(JOB_DESCRIPTION_FILE, "r") as file:
        job_listing.job_description = file.read()
    job_listing.url = "Follow-up prompt from user"

    return generate_review(job_listing)





