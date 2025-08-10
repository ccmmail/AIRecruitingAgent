"""Backend API for generating tailored resumes using OpenAI."""

from fastapi import FastAPI
from pydantic import BaseModel
from openai import OpenAI
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
BASE_DIR = Path(__file__).resolve().parent.parent
PROMPT_RESUME_REVIEW = BASE_DIR / "prompts" / "prompt_resume_review.txt"
app = FastAPI()
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
    with open(PROMPT_RESUME_REVIEW, "r") as file:
        prompt = file.read()
        return prompt
    # add in code to sub in the job description


class JobListing(BaseModel):
    """Define the shape of data expected by /generate/resume."""
    job_description: str
    company: str

@app.post("/generate/resume")
def generate_resume(job: JobListing):
    """Generate a tailored resume based on the job listing."""
    prompt = create_resume_review_prompt(job.job_description)
    response = prompt_LLM(prompt)
    return {
        "message": f"{response}"
    }

