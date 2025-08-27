"""Unit tests for the backend module."""

import pytest
from backend import api
from fastapi.testclient import TestClient
from pathlib import Path
import time
from backend.utils import verify_token
get_current_user = verify_token  # alias for clarity

# Define the directory paths for the working files for test environment
BASE_DIR = Path(__file__).resolve().parent
TEST_RESUME_FILE = BASE_DIR / "user" / "test_resume.txt"
TEST_ADDITIONAL_EXPERIENCE_FILE = BASE_DIR / "user" / "test_additional_experience.txt"
TEST_OUTPUT_FROM_LLM_CURRENT_FILE = BASE_DIR / "temp_stub" / "test_LLM_response_current.json"
TEST_USER_RESPONSE_FILE = BASE_DIR / "temp_stub" / "test_user_response.json"

@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    api.app.dependency_overrides[get_current_user] = lambda: {
        "sub": "test-user-123",
        "email": "test@example.com",
        "name": "Test User",
    }
    with TestClient(api.app) as c:
        yield c
    api.app.dependency_overrides.clear()


def test_get_job_description(test_client):
    """Test /get_JD endpoint returns (currently stubbed) job description."""
    response = test_client.post(
        "/jobdescription",
        json={"url": "https://example.com/job"}
    )
    assert response.status_code == 200
    data_dict = response.json()
    assert "CEO/Co-founder" in data_dict["job_description"]


def test_create_resume_diff():
    """Test create_resume_diff creates correct diff output and file."""
    baseline = "This is a text\nThis is a text on a new line"
    revised = "This is a short text\nThis is gibberish on a new line"
    expected_diff = '''This is a<span style="color:#008000"><add> short</add></span> text
This is <span style="color:#c00000"><del>a text</del></span><span style="color:#008000"><add>gibberish</add></span> on a new line'''
    actual_diff = api.create_resume_diff(baseline, revised)
    assert actual_diff == expected_diff


def test_create_review_prompt(monkeypatch):
    """Test prompt template placeholders are replaced and data from previous
     LLM output is read and injected into the prompt."""
    job_description = "This the test job description"
    resume = "This is a test resume"
    additional_experience = "This is a test additional experience"
    rationale = "This is a test rationale"
    question2 = "Question2?"
    answer3 = "Answer3"

    monkeypatch.setattr(api, "RESUME_BASELINE_FILE", TEST_RESUME_FILE)
    monkeypatch.setattr(api, "ADDITIONAL_EXPERIENCE_FILE", TEST_ADDITIONAL_EXPERIENCE_FILE)
    monkeypatch.setattr(api, "OUTPUT_FROM_LLM_CURRENT_FILE", TEST_OUTPUT_FROM_LLM_CURRENT_FILE)
    monkeypatch.setattr(api, "USER_RESPONSE_FILE", TEST_USER_RESPONSE_FILE)
    prompt = api.create_review_prompt(job_description)

    assert "{{INPUT}}" not in prompt
    assert resume in prompt
    assert additional_experience in prompt
    assert job_description in prompt
    # test whether data from previous LLM output is parsed and injected
    assert rationale in prompt
    assert question2 in prompt
    assert answer3 in prompt


def test_generate_review_demo(test_client, monkeypatch):
    """Test /generate/review endpoint returns demo JSON."""
    response = test_client.post(
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


def test_generate_review(test_client, monkeypatch):
    """Test /generate/review endpoint parses the LLM response and injects
    a diff resume."""
    def mock_prompt_LLM(prompt: str) -> str:
        return TEST_OUTPUT_FROM_LLM_CURRENT_FILE.read_text()
    monkeypatch.setattr(api, "prompt_LLM", mock_prompt_LLM)

    response = test_client.post(
        "/review",
        json={
            "job_description": "This the test job description",
            "url": "https://example.com/bestjobever",
            "demo": False
        }
    )
    assert response.status_code == 200
    data_dict = response.json()
    assert data_dict["Fit"]["score"] == 10
    assert data_dict["Gap_Map"][1]["JD Requirement/Keyword"] == "Test Requirement1"


def test_process_questions_and_answers_demo(test_client, monkeypatch):
    """Test /questions endpoint creates an updated review off user's answers."""
    response = test_client.post(
        "/questions",
        json={
            "qa_pairs": [
                {"question": "Question1?", "answer": "Answer1"},
                {"question": "Question2?", "answer": "Answer2"}
            ],
            "demo": True
        }
    )
    assert response.status_code == 200
    data_dict = response.json()
    assert data_dict["Fit"]["score"] == 8
    assert data_dict["Questions"][0] == "Have you personally led or closed a seed or Series A round? If yes, list round (seed/Series A), amount, year, and your role (lead/co-founder/executive)."


def test_process_questions_and_answers(test_client, monkeypatch):
    """Test /questions endpoint creates an updated review off user's answers."""
    # TODO: Implement a non-demo test once we have a suitable stubbed LLM response file
    return


def test_manage_resume(test_client, monkeypatch):
    """Test /resume endpoint loads and saves resume files."""
    resume = "This is a test resume"
    monkeypatch.setattr(api, "RESUME_FILE", TEST_RESUME_FILE)
    response = test_client.get(
        "/resume",
        params={"command": "load"})
    assert response.status_code == 200
    data_dict = response.json()
    assert data_dict["resume"] == resume
