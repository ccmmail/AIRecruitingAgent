"""Unit tests for the backend module."""

import pytest
from backend import backend
from fastapi.testclient import TestClient
from pathlib import Path
import time

# Define the directory paths for the working files for test environment
BASE_DIR = Path(__file__).resolve().parent
USER_DIR = BASE_DIR / "user"
PROMPT_DIR = BASE_DIR / "prompts"
TEMP_DIR = BASE_DIR / "temp"
# User data
TEST_RESUME_FILE = USER_DIR / "test_resume.txt"
TEST_ADDITIONAL_EXPERIENCE_FILE = USER_DIR / "test_additional_experience.txt"
# Prompt templates
TEST_PROMPT_RESUME_REVIEW_FILE = BASE_DIR / "prompts" / "test_prompt.txt"
# Temp working files
RESUME_BASELINE = TEMP_DIR / "test_resume_baseline.txt"
RESUME_REVISED = TEMP_DIR / "test_resume_revised.txt"
TEST_JOB_DESCRIPTION_FILE = BASE_DIR / "temp" / "test_job_description.txt"
# PRODUCTION FILES
USER_RESPONSE_FILE = BASE_DIR.resolve().parent / "temp" / "user_response.json"
OUTPUT_FROM_LLM_CURRENT_FILE = BASE_DIR.resolve().parent / "temp" / "LLM_response_current.json"
# STUBBED LLM RESPONSE FILES
TEST_OUTPUT_FROM_LLM_FILE = BASE_DIR / "temp" / "test_LLM_response.json"


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
    """Test /generate/review endpoint parses the LLM response and rotates saved LLM outputs."""
    def mock_prompt_LLM(prompt: str) -> str:
        with open(TEST_OUTPUT_FROM_LLM_FILE, "r") as file:
            mock_LLM_response = file.read()
        return mock_LLM_response
    monkeypatch.setattr(backend, "prompt_LLM", mock_prompt_LLM)

    with open(TEST_JOB_DESCRIPTION_FILE, "r") as file:
        job_description = file.read()
    response = HTTP_client.post(
        "/review",
        json={
            "job_description": job_description,
            "save_output": True,
            "url": "https://example.com/bestjobever",
            "demo": False
        }
    )
    assert response.status_code == 200
    data_dict = response.json()
    # need stronger validation of the response
    assert "Tailored_Resume" in data_dict
    assert check_file_created_recently(OUTPUT_FROM_LLM_CURRENT_FILE) is True


def test_generate_review_demo(HTTP_client, monkeypatch):
    """Test /generate/review endpoint returns demo JSON."""
    response = HTTP_client.post(
        "/review",
        json={
            "job_description": "fake job description for demo",
            "save_output": True,
            "url": "https://demo.com/bestjobever",
            "demo": True
        }
    )
    assert response.status_code == 200
    data_dict = response.json()
    assert "Tailored_Resume" in data_dict
    assert "Chung Meng Cheong" in data_dict["Tailored_Resume"]


def test_get_job_description_demo(HTTP_client):
    """Test /get_JD endpoint returns (currently stubbed) job description."""
    response = HTTP_client.post(
        "/jobdescription",
        json={"url": "https://example.com/job"}
    )
    assert response.status_code == 200
    data_dict = response.json()
    assert "Chief Executive Officer" in data_dict["job_description"]


def test_process_questions_and_answers_demo(HTTP_client):
    """Test /questions endpoint processes user answers."""
    response = HTTP_client.post(
        "/questions",
        json={
            "qa_pairs": [
                {"question": "What is your name?", "answer": "John Doe"},
                {"question": "What is your profession?", "answer": "Software Engineer"}
            ],
            "demo": True
        }
    )
    assert response.status_code == 200
    data_dict = response.json()
    # assert check_file_created_recently(USER_RESPONSE_FILE) is True  # check user response is saved
    assert data_dict["Fit"]["score"] == 7  # check that score is corect
    revised_text = '''<span style="color:#c00000"><del>Responsible for improving operating effectiveness and efficiencies of portfolio companies.</del></span><span style="color:#008000"><add>Focused on scaling portfolio companies through strategy, AI adoption, and organizational transformation.</add></span>'''
    assert revised_text in data_dict["Tailored_Resume"]  # check diff resume is present
    # assert check_file_created_recently(OUTPUT_FROM_LLM_CURRENT_FILE) is True  # check LLM response is saved
    print(data_dict)


@pytest.mark.skip()
def test_create_resume_diff():
    """Test create_resume_diff creates correct diff output and file."""
    # with open(RESUME_BASELINE, "r") as file:
    #     baseline = file.read()
    # with open(RESUME_REVISED, "r") as file:
    #     revised = file.read()

    baseline = "This is a text\nThis is a text on a new line"
    revised = "This is a short text\nThis is gibberish on a new line"
    expected_diff = '''This is a <span style="color:#008000"><add>short </add></span>text
This is<span style="color:#c00000"><del> a text</del></span><span style="color:#008000"><add> gibberish</add></span> on a new line'''
    actual_diff = backend.create_resume_diff(baseline, revised, demo=False)
    # assert actual_diff == expected_diff


