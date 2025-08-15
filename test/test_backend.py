"""Unit tests for the backend module."""

import pytest
from backend import backend
from fastapi.testclient import TestClient
from pathlib import Path
import json
import time

# Setup file paths
BASE_DIR = Path(__file__).resolve().parent
TEST_JOB_DESCRIPTION_FILE = BASE_DIR / "data" / "test_job_description.txt"
TEST_PROMPT_RESUME_REVIEW_FILE = BASE_DIR / "prompts" / "test_prompt.txt"
TEST_RESUME_FILE = BASE_DIR / "data" / "test_resume.txt"
TEST_ADDITIONAL_EXPERIENCE_FILE = BASE_DIR / "data" / "test_additional_experience.txt"
TEST_OUTPUT_FILE = BASE_DIR / "output" / "test_output.txt"  # use as input for mock LLM response
OUTPUT_FILE = BASE_DIR.resolve().parent / "output" / "output.txt"
OUTPUT_RESUME_FILE = BASE_DIR.resolve().parent / "output" / "resume.md"


@pytest.fixture
def HTTP_client():
    """Create a test client for the FastAPI app."""
    return TestClient(backend.app)


def check_file_created_recently(file_path: Path) -> bool:
    """Check if the output file was created within the last 5 seconds (helper function)."""
    age_seconds = time.time() - file_path.stat().st_mtime
    if file_path.exists() and age_seconds < 5:
        return True
    else:
        return False


def test_create_review_prompt(monkeypatch):
    """Test the create_resume_review_prompt function."""
    job_description = "This a test job description"
    resume = "This is a test resume"
    additional_experience = "This is a test additional experience"

    monkeypatch.setattr(backend, "PROMPT_RESUME_REVIEW_FILE", TEST_PROMPT_RESUME_REVIEW_FILE)
    monkeypatch.setattr(backend, "RESUME_FILE", TEST_RESUME_FILE)
    monkeypatch.setattr(backend, "ADDITIONAL_EXPERIENCE_FILE", TEST_ADDITIONAL_EXPERIENCE_FILE)
    prompt = backend.create_review_prompt(job_description)

    assert "{{JOB_DESCRIPTION}}" not in prompt
    assert "{{RESUME}}" not in prompt
    assert "{{ADDITIONAL_EXPERIENCE}}" not in prompt

    assert job_description in prompt
    assert resume in prompt
    assert additional_experience in prompt


def test_generate_review(HTTP_client, monkeypatch):
    """Test /generate/review endpoint parses the LLM response (stubbed response)
    and generates output.txt (logs JSON response) and resume.md (clean markdown)"""
    def mock_prompt_LLM(prompt: str) -> str:
        with open(TEST_OUTPUT_FILE, "r") as file:
            mock_LLM_response = file.read()
        return mock_LLM_response

    monkeypatch.setattr(backend, "prompt_LLM", mock_prompt_LLM)
    monkeypatch.setattr(backend, "JOB_DESCRIPTION_FILE", TEST_JOB_DESCRIPTION_FILE)

    with open(TEST_JOB_DESCRIPTION_FILE, "r") as file:
        job_description = file.read()
    response = HTTP_client.post(
        "/generate/review",
        json={
            "job_description": job_description,
            "save_output": True,
            "URL": "https://example.com/bestjobever",
            "demo": False
        }
    )
    assert response.status_code == 200
    data_dict = json.loads(response.json())
    assert "Tailored_Resume" in data_dict
    assert check_file_created_recently(OUTPUT_FILE) is True
    assert check_file_created_recently(OUTPUT_RESUME_FILE) is True
    print("\n", data_dict)


def test_generate_demo_review(HTTP_client, monkeypatch):
    """Test /generate/review endpoint returns demo JSON."""
    response = HTTP_client.post(
        "/generate/review",
        json={
            "job_description": "fake job description for demo",
            "save_output": True,
            "URL": "https://demo.com/bestjobever",
            "demo": True
        }
    )
    assert response.status_code == 200
    data_dict = json.loads(response.json())
    assert "Tailored_Resume" in data_dict
    assert "Chung Meng Cheong" in data_dict["Tailored_Resume"]
    assert check_file_created_recently(OUTPUT_FILE) is False
    assert check_file_created_recently(OUTPUT_RESUME_FILE) is False