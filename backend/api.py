"""APIs for generating a resume review and changes tailored to a given job description."""

from fastapi import FastAPI, Depends
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from openai import OpenAI
from langsmith import traceable, Client
from pathlib import Path
import os, shutil
import json
from dotenv import load_dotenv
from .utils import redline_diff
from .security import check_authorized_user


# Load environment variables from .env file
load_dotenv()
# Define the directory paths for working files
BASE_DIR = Path(__file__).resolve().parent.parent
USER_DIR = BASE_DIR / "user"
PROMPT_DIR = BASE_DIR / "prompts"
TEMP_DIR = BASE_DIR / "temp"
DEMO_DIR = BASE_DIR / "demo"
# User data
RESUME_FILE = USER_DIR / "resume.txt"
ADDITIONAL_EXPERIENCE_FILE = USER_DIR / "additional_candidate_info.txt"
# Prompt templates
PROMPT_RESUME_REVIEW_FILE = PROMPT_DIR / "prompt_resume_review_GOLD.txt"
PROMPT_DIFF_FILE = PROMPT_DIR / "prompt_resume_diff_GOLD.txt"
# Temp working files
RESUME_BASELINE_FILE = TEMP_DIR / "resume_baseline.txt"
RESUME_REVISED_FILE = TEMP_DIR / "resume_revised.txt"
USER_RESPONSE_FILE = TEMP_DIR / "user_response.json"
OUTPUT_FROM_LLM_PRIOR_FILE = TEMP_DIR / "LLM_response_prior.json"
OUTPUT_FROM_LLM_CURRENT_FILE = TEMP_DIR / "LLM_response_current.json"
JOB_DESCRIPTION_FILE = TEMP_DIR / "job_description.txt"
# Demo files
JOB_DESCRIPTION_DEMO_FILE = DEMO_DIR / "job_description_demo.txt"
RESPONSE_REVIEW_ADD_INFO_DEMO_FILE = DEMO_DIR / "API_response_review_add_info_demo.json"
RESPONSE_REVIEW_DEMO_FILE = DEMO_DIR / "API_response_review_demo.json"


# Initialize OpenAI client and LangSmith tracer
LLM = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
os.environ["LANGSMITH_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "AIRecruitingAgent"
langsmith_client = Client(api_key=os.getenv("LANGSMITH_API_KEY"))


# Start the FastAPI app by setting up temp dir & working files
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Setup temp working directory on startup."""
    ## startup items
    # make temp directory
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    # copy the user's saved resume.txt into temp directory as the baseline
    shutil.copyfile(RESUME_FILE, RESUME_BASELINE_FILE)
    # Make the demo job description the working job description
    shutil.copyfile(JOB_DESCRIPTION_DEMO_FILE, JOB_DESCRIPTION_FILE)
    # delete temp working files if they exist
    try:
        os.remove(OUTPUT_FROM_LLM_CURRENT_FILE)
        os.remove(RESUME_REVISED_FILE)
        os.remove(USER_RESPONSE_FILE)
        os.remove(OUTPUT_FROM_LLM_PRIOR_FILE)
    except FileNotFoundError:
        pass
    yield
    ## cleanup items here
    # none for now


app = FastAPI(debug=True, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ # In production, restrict to specific origins
        "chrome-extension://oblgighcolckndbinadplmmmebjemido",
        # "localhost"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)


@traceable(name="prompt_LLM")
def prompt_llm(prompt: str) -> str:
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
    return redline_diff(baseline, revised)


@app.get("/")
def show_heartbeat():
    """Return a message to show API is up."""
    return {"message": "Hello World"}


class Url(BaseModel):
    """Define the shape of data expected by /jobdescription."""
    url: str  # URL of the page requesting the job description
    demo: bool = False   # if true, return static demo response


@app.post("/jobdescription")
def get_job_description_from_url(url:Url):
    """Fetch job description from URL."""
    # TODO: Implement logic to fetch job description based on URL vs. canned response
    if url.demo:
        job_description = JOB_DESCRIPTION_FILE.read_text()
    return {"job_description": job_description}


def create_review_prompt(job_description: str) -> str:
    """Construct JSON input and inject into prompt template."""
    input_dict = {
        "Job_Description": job_description,
        "Resume": RESUME_BASELINE_FILE.read_text(),
        "Additional_Info": ADDITIONAL_EXPERIENCE_FILE.read_text()
    }
    if OUTPUT_FROM_LLM_CURRENT_FILE.exists():
        llm_response = json.loads(OUTPUT_FROM_LLM_CURRENT_FILE.read_text())
        input_dict["Fit"] = llm_response.get("Fit")
        input_dict["Gap_Map"] = llm_response.get("Gap_Map")
    if USER_RESPONSE_FILE.exists():
        input_dict["qa_pairs"] = json.loads(USER_RESPONSE_FILE.read_text())

    # replace placeholder {{input}} in the prompt template
    input_json = json.dumps(input_dict, indent=4)
    prompt = PROMPT_RESUME_REVIEW_FILE.read_text()
    prompt = prompt.replace("{{INPUT}}", input_json)

    return prompt


class JobListing(BaseModel):
    """Define the shape of data expected by /review."""
    job_description: str  # Job description to be reviewed
    url: str  # URL of calling page for tracking purposes
    demo: bool = False   # if true, return static demo response


@app.post("/review")
@traceable(name="generate_review_endpoint")
def generate_review(job_listing: JobListing,
                    user=Depends(check_authorized_user)):
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
    if job_listing.demo:  # returned stubbed API response
        response = json.loads(RESPONSE_REVIEW_DEMO_FILE.read_text())
        return response

    # get the LLM response
    prompt = create_review_prompt(job_listing.job_description)
    llm_response_json = prompt_llm(prompt)

    # rotate the files to keep the last two LLM responses
    if OUTPUT_FROM_LLM_CURRENT_FILE.exists():
        os.replace(OUTPUT_FROM_LLM_CURRENT_FILE, OUTPUT_FROM_LLM_PRIOR_FILE)
    OUTPUT_FROM_LLM_CURRENT_FILE.write_text(llm_response_json)

    # diff the baseline and revised resumes, and save the diff in the API response
    response = json.loads(llm_response_json)
    revised_resume = response["Tailored_Resume"]
    RESUME_REVISED_FILE.write_text(revised_resume)  # save revised resume
    baseline_resume = RESUME_BASELINE_FILE.read_text()
    response["Tailored_Resume"] = create_resume_diff(baseline_resume, revised_resume)

    return response


class QuestionAnswers(BaseModel):
    """Define the shape of data expected by /questions_answers."""
    qa_pairs: list[dict[str, str]]  # list of question-answer pairs
    demo: bool = False   # if true, return static demo response


@app.post("/questions")
@traceable(name="process_questions_and_answers_endpoint")
def process_questions_and_answers(user_response: QuestionAnswers,
                                  user=Depends(check_authorized_user)):
    """Generate an updated review and resume based on candidate's answers.
    Algo:
    1. If demo is true, return canned response
    2. Save user response to USER_RESPONSE_FILE
    4. Call generate_review() to get the updated review and resume
    """
    if user_response.demo:  # returned stubbed API response
        response = json.loads(RESPONSE_REVIEW_ADD_INFO_DEMO_FILE.read_text())
        return response

    # save user response to file
    user_response_dict = user_response.qa_pairs
    USER_RESPONSE_FILE.write_text(json.dumps(user_response_dict, indent=4))

    # call generate_review() to get the updated review and resume
    job_listing = JobListing(
        job_description=JOB_DESCRIPTION_FILE.read_text(),
        url="Follow-up prompt from user"
    )
    response = generate_review(job_listing)

    return response


@app.get("/resume")
def manage_resume(command:str, user=Depends(check_authorized_user)):
    """Return the user's saved resume."""
    if command == "load":
        response = {"resume": RESUME_FILE.read_text()}
    else:
        response = {"error": "Invalid command"}
    return response


