"""Backend API for generating tailored resumes using OpenAI GPT."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from pathlib import Path
import os
from dotenv import load_dotenv
from langsmith import traceable, Client
import json
from diff import redline_diff

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
PROMPT_DIFF = PROMPT_DIR / "prompt_resume_diff_GOLD.txt"
# Temp working files
RESUME_DIFF = TEMP_DIR / "resume_diff.txt"
RESUME_BASELINE = TEMP_DIR / "resume_baseline.txt"
RESUME_REVISED = TEMP_DIR / "resume_revised.txt"
USER_RESPONSE_FILE = TEMP_DIR / "user_response.json"
OUTPUT_FROM_LLM_PRIOR_FILE = TEMP_DIR / "LLM_response_prior.json"
OUTPUT_FROM_LLM_CURRENT_FILE = TEMP_DIR / "LLM_response_current.json"
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


def create_review_prompt(job_description: str) -> str:
    """Replace placeholders in prompt template to create final prompt."""
    # read prompt template
    with open(PROMPT_RESUME_REVIEW_FILE, "r") as file:
        prompt = file.read()

    # replace {{placeholders}} with actual data
    prompt = prompt.replace("{{JOB_DESCRIPTION}}", job_description)

    with open(RESUME_FILE, "r") as file:
        resume = file.read()
    prompt = prompt.replace("{{RESUME}}", resume)

    with open(ADDITIONAL_EXPERIENCE_FILE, "r") as file:
        additional_experience = file.read()
    prompt = prompt.replace("{{ADDITIONAL_EXPERIENCE}}", additional_experience)

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
    """Generate a review and tailored resume based on the job listing."""
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
    with open(RESUME_REVISED, "w") as file:
        file.write(revised_resume)
    # diff the baseline and revised resumes, and save the diff in the API response
    with open(RESUME_BASELINE, "r") as file:
        baseline = file.read()
    diff = create_resume_diff(baseline, revised_resume)
    response["Tailored_Resume"] = diff

    return response


class URL(BaseModel):
    """Define the shape of data expected by /jobdescription."""
    url: str  # URL of the page requesting the job description
    demo: bool = False   # if true, return static demo response


@app.post("/jobdescription")
def get_job_description_from_URL(url: URL):
    """Fetch the job description from a given URL."""
    # TODO: Implement logic to fetch job description based on URL vs. canned response
    # STUBBED WITH CANNED RESPONSE
    with open(JOB_DESCRIPTION_DEMO_FILE, "r") as file:
        job_description = file.read()
    response = {"job_description": job_description}
    return response


@traceable(name="create_resume_diff")
def create_resume_diff(baseline:str, revised:str) -> str:
    """Create a redlined diff between two resume versions."""
    diff = redline_diff(baseline, revised)
    return diff


class QuestionAnswers(BaseModel):
    """Define the shape of data expected by /questions_answers."""
    qa_pairs: list[dict[str, str]]  # list of question-answer pairs
    demo: bool = False   # if true, return static demo response


@app.post("/questions")
def process_questions_and_answers(user_response: QuestionAnswers):
    """Save user response and revise review with the additional information."""
    demo = user_response.demo
    # if demo:
    #     with open(RESPONSE_REVIEW_ADD_INFO_DEMO_FILE, "r") as file:
    #         response_json = file.read()
    #         response = json.loads(response_json)
    #     return response

    # Save user response to a file
    user_response_dict = user_response.qa_pairs
    with open(USER_RESPONSE_FILE, "w") as file:
        json.dump(user_response_dict, file, indent=4)

    # Assemble API response
    # TODO: change this to call update review_review
    with open(OUTPUT_FROM_LLM_PRIOR_FILE, "r") as file:
        response_prior = json.loads(file.read())
    response: dict = {
        "Fit": response_prior["Fit"],
        "Gap_Map": response_prior["Gap_Map"],
        "Questions": response_prior["Questions"]
    }
    with open(RESUME_BASELINE, "r") as file:
        baseline = file.read()
    with open(RESUME_REVISED, "r") as file:
        revised = file.read()
    response["Tailored_Resume"] = create_resume_diff(baseline, revised)

    with open(OUTPUT_FROM_LLM_CURRENT_FILE, "w") as file:
        file.write(json.dumps(response, indent=4))

    return response




