"""Backend API for generating tailored resumes using OpenAI."""
from clickhouse_connect.cc_sqlalchemy.datatypes.sqltypes import Nullable
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from pathlib import Path
import os
from dotenv import load_dotenv
from langsmith import traceable, Client
import json

# Load environment variables from .env file
load_dotenv()

# Define the base directory and paths for prompts and data files
BASE_DIR = Path(__file__).resolve().parent.parent
PROMPT_RESUME_REVIEW_FILE = BASE_DIR / "prompts" / "prompt_resume_review_GOLD.txt"
RESUME_FILE = BASE_DIR / "data" / "resume.txt"
ADDITIONAL_EXPERIENCE_FILE = BASE_DIR / "data" / "additional_experience.txt"
JOB_DESCRIPTION_DEMO_FILE = BASE_DIR / "data" / "job_description_demo.txt"
OUTPUT_FROM_LLM_FILE = BASE_DIR / "output" / "LLM_response.json"
OUTPUT_FROM_LLM_DEMO_FILE = BASE_DIR / "output" / "LLM_response_demo.json"
OUTPUT_RESUME_FILE = BASE_DIR / "output" / "resume.md"


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


def get_job_description(url: str="") -> str:
    """Return the job description from a given URL."""
    # TODO: Implement logic to fetch job description based on URL
    with open(JOB_DESCRIPTION_DEMO_FILE, "r") as file:
        job_description = file.read()
    return job_description


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
    if not job_listing.demo: # not a demo call
        prompt = create_review_prompt(job_listing.job_description)
        response_json = prompt_LLM(prompt)
    else: # demo call
        with open(OUTPUT_FROM_LLM_DEMO_FILE, "r") as file:
            response_json = file.read()

    if job_listing.save_output and job_listing.demo is False:
        # Save the response to a file
        with open(OUTPUT_FROM_LLM_FILE, "w") as file:
            file.write(response_json)
        # Save the resume markdown to a file
        response_dict = json.loads(response_json)
        resume = response_dict.get("Tailored_Resume")
        with open(OUTPUT_RESUME_FILE, "w") as file:
            file.write(resume)

    response_dict = json.loads(response_json)
    return response_dict


class URL(BaseModel):
    """Define the shape of data expected by /jobdescription."""
    url: str  # URL of the page requesting the job description
    demo: bool = False   # if true, return static demo response

@app.post("/jobdescription")
def get_job_description_from_URL(url: URL):
    """Fetch the job description from a given URL."""
    response_dict = {"job_description": get_job_description(url.url)}
    return response_dict


class QuestionAnswers(BaseModel):
    """Define the shape of data expected by /questions_answers."""
    question: str  # Question to be answered
    answer: str  # Answer to the question


@app.post("/questions")
def process_questions_answers(question_answers: QuestionAnswers):
    """Process questions and answers from a given URL."""
    # TODO: Implement logic to process questions and answers
    return
