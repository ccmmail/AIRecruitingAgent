"""Utility program to create the JSON temp files."""
import json
from pathlib import Path
from backend.api import create_resume_diff

BASE_DIR = Path(__file__).resolve().parent.parent
USER_DIR = BASE_DIR / "user"
TEMP_DIR = BASE_DIR / "temp"
# User data
RESUME_FILE = USER_DIR / "resume.txt"
ADDITIONAL_EXPERIENCE_FILE = USER_DIR / "additional_candidate_info.txt"
# Temp working files
OUTPUT_FROM_LLM_PRIOR_FILE = TEMP_DIR / "LLM_response_prior.json"
OUTPUT_FROM_LLM_CURRENT_FILE = TEMP_DIR / "LLM_response_current.json"
RESUME_BASELINE_FILE = TEMP_DIR / "resume_baseline.txt"
RESUME_REVISED_FILE = TEMP_DIR / "resume_revised.txt"
USER_RESPONSE_FILE = TEMP_DIR / "user_response.json"
# Demo files
JOB_DESCRIPTION_DEMO_FILE = TEMP_DIR / "job_description_demo.txt"
RESPONSE_REVIEW_ADD_INFO_DEMO_FILE = TEMP_DIR / "API_response_review_add_info_demo.json"
RESPONSE_REVIEW_DEMO_FILE = TEMP_DIR / "API_response_review_demo.json"


def create_prompt_JSON_input():
    """Create the JSON input for the LLM."""
    input_json = {}

    with open(JOB_DESCRIPTION_DEMO_FILE, "r") as file:
        input_json["Job_Description"] = file.read()

    with open(RESUME_BASELINE_FILE, "r") as file:
        input_json["Resume"] = file.read()

    with open(ADDITIONAL_EXPERIENCE_FILE, "r") as file:
        input_json["Additional_Info"] = file.read()

    # change to OUTPUT_FROM_LLM_CURRENT_FILE if creating input for additional info
    with open(OUTPUT_FROM_LLM_PRIOR_FILE, "r") as file:
        LLM_response = json.load(file)
        input_json["Fit"] = LLM_response["Fit"]
        input_json["Gap_Map"] = LLM_response["Gap_Map"]

    with open(USER_RESPONSE_FILE, "r") as file:
        user_response = json.load(file)
        input_json["qa_pairs"] = user_response

    with open(BASE_DIR / "LLM_JSON_input.json", "w") as file:
        json.dump(input_json, file, indent=4)

def create_API_response():
    """Create the API response JSON for demo."""
    response = {}

    # change ot OUTPUT_FROM_LLM_CURRENT_FILE if creating response for additional info
    with open(OUTPUT_FROM_LLM_CURRENT_FILE, "r") as file:
        response_prior = json.loads(file.read())

    response: dict = {
        "Fit": response_prior["Fit"],
        "Gap_Map": response_prior["Gap_Map"],
        "Questions": response_prior["Questions"]
    }

    revised = response_prior["Tailored_Resume"]
    with open(RESUME_BASELINE_FILE, "r") as file:
        baseline = file.read()
    response["Tailored_Resume"] = create_resume_diff(baseline, revised)

    # Change to RESPONSE_REVIEW_ADD_INFO_DEMO_FILE if creating response for additional info
    with open(RESPONSE_REVIEW_ADD_INFO_DEMO_FILE, "w") as file:
        file.write(json.dumps(response, indent=4))

create_API_response()






