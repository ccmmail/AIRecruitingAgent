"""Backend API for generating tailored resumes using OpenAI."""
# TO-DO: Add Langsmith tracking
# TO-DO: write tests for the API endpoints

from fastapi import FastAPI
from pydantic import BaseModel
from openai import OpenAI
import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()


# Define the base directory and paths for prompts and data files
BASE_DIR = Path(__file__).resolve().parent.parent
PROMPT_RESUME_REVIEW_DIR = BASE_DIR / "prompts" / "prompt_resume_review_GOLD.txt"
RESUME_DIR = BASE_DIR / "data" / "resume.txt"
ADDITIONAL_EXPERIENCE_DIR = BASE_DIR / "data" / "additional_experience.txt"

# Set up the FastAPI application and OpenAI client
app = FastAPI(debug=True)
LLM = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


@app.get("/")
def show_heartbeat():
    """Return a message to show API is up."""
    return {"message": "Hello World"}


def prompt_LLM(prompt: str) -> str:
    """Call the OpenAI API to get a response."""
    response = LLM.chat.completions.create(
        model="gpt-5-mini",
        temperature=0,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content.strip()


def create_resume_review_prompt(job_description: str) -> str:
    """Create an LLM prompt to generate a tailored resume."""
    with open(PROMPT_RESUME_REVIEW_DIR, "r") as file:
        prompt = file.read()
    prompt = prompt.replace("{{JOB_DESCRIPTION}}", job_description)

    with open(RESUME_DIR, "r") as file:
        resume = file.read()
    prompt = prompt.replace("{{RESUME}}", resume)

    with open(ADDITIONAL_EXPERIENCE_DIR, "r") as file:
        additional_experience = file.read()
    prompt = prompt.replace("{{ADDITIONAL_EXPERIENCE}}", additional_experience)

    return prompt


class JobListing(BaseModel):
    """Define the shape of data expected by /generate/resume."""
    job_description: str


@app.post("/generate/resume")
def generate_resume(job: JobListing):
    """Generate a tailored resume based on the job listing."""
    prompt = create_resume_review_prompt(job.job_description)
    return {"prompt": prompt}
    # response = prompt_LLM(prompt)
    # return {"message": f"{response}"}

