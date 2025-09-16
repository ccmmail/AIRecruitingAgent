"""APIs for generating a resume review and changes tailored to a given job description."""

from fastapi import FastAPI, Security, HTTPException, status
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pydantic import BaseModel
from openai import OpenAI
from langsmith import traceable, Client
from pathlib import Path
import os, shutil, datetime
import httpx
import json
from dotenv import load_dotenv
from .redline import redline_diff
from .security import check_authorized_user, verify_token, security
from .security import router as oauth_router

# Load environment variables from .env file
REPO_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = REPO_ROOT / ".env"
load_dotenv(dotenv_path=ENV_FILE, override=False)

# Define the directory paths for working files
BASE_DIR = Path(__file__).resolve().parent.parent
USER_DIR = BASE_DIR / "user"
PROMPT_DIR = BASE_DIR / "prompts"
TEMP_DIR = BASE_DIR / "temp"
DEMO_DIR = BASE_DIR / "demo"
STATIC_DIR = BASE_DIR / "static"
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
RESUME_DEMO_FILE = DEMO_DIR / "resume_demo.txt"
JOB_DESCRIPTION_DEMO_FILE = DEMO_DIR / "job_description_demo.txt"
RESPONSE_REVIEW_ADD_INFO_DEMO_FILE = DEMO_DIR / "API_response_review_add_info_demo.json"
RESPONSE_REVIEW_DEMO_FILE = DEMO_DIR / "API_response_review_demo.json"

# setup httpx client with proxy if needed (needed for PythonAnywhere)
print(f"{datetime.datetime.now()} starting up API server...")
proxy_url = os.getenv("HTTPS_PROXY") or os.getenv("HTTP_PROXY")
print("proxy url for pythonanywhere:", proxy_url)
if proxy_url:
    transport = httpx.HTTPTransport(proxy=proxy_url, retries=3)
    http_client = httpx.Client(transport=transport, timeout=60.0)
else:
    http_client = httpx.Client(timeout=60.0)

# Setup Open AI and LangSmith tracing
LLM = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
os.environ["LANGSMITH_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "AIRecruitingAgent"
langsmith_client = Client(api_key=os.getenv("LANGSMITH_API_KEY"))

# Setup FastAPI app by setting up temp dir & working files
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Setup temp working directory on startup."""
    ## startup items
    # make temp directory
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    # copy the user's saved resume.txt into temp directory as the baseline
    shutil.copyfile(RESUME_DEMO_FILE, RESUME_BASELINE_FILE)
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

# setup FastAPI app with CORS; mount oauth_router and static files
app = FastAPI(debug=True, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Chrome extension
        "chrome-extension://oblgighcolckndbinadplmmmebjemido",
        # Vercel deployed frontend
        "https://ai-recruiting-agent.vercel.app",
        # Local Next.js dev server (two variants to be safe)
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Mount the callback rounter /oauth2cb
app.include_router(oauth_router)
# Serve static files at /static
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# # Diagnostic route to check outbound connectivity to OpenAI
# @app.get("/diag/openai")
# def diag_openai():
#     """Quick outbound check from the *web app process* (not the console)."""
#     results = {}
#     try:
#         # 1) Raw HTTPS GET without auth (should be 401)
#         r = httpx.get("https://api.openai.com/v1/models", timeout=10.0)
#         results["httpx_models_status"] = r.status_code
#         results["httpx_ok"] = (r.status_code in (200, 401))
#         results["httpx_body_snippet"] = r.text[:120]
#     except Exception as e:
#         results["httpx_exception"] = f"{type(e).__name__}: {e}"
#
#     try:
#         # 2) Minimal OpenAI SDK call
#         chat = LLM.chat.completions.create(
#             model="gpt-5-mini",
#             messages=[{"role": "user", "content": "ping"}],
#             temperature=0,
#         )
#         results["openai_ok"] = True
#         results["openai_choice_present"] = bool(chat.choices and chat.choices[0].message.content)
#     except Exception as e:
#         results["openai_exception"] = f"{type(e).__name__}: {e}"
#
#     return results

@app.get("/", include_in_schema=False)
def splash():
    """Serve the marketing splash page."""
    return FileResponse(STATIC_DIR / "index.html")


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


def create_review_prompt(job_description: str) -> str:
    """Construct JSON input and inject into prompt template."""
    input_dict = {
        "Job_Description": job_description,
        "Resume": RESUME_BASELINE_FILE.read_text(),
    }
    if ADDITIONAL_EXPERIENCE_FILE.exists():
        input_dict["Additional_Info"] = ADDITIONAL_EXPERIENCE_FILE.read_text()
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


def create_resume_diff(baseline:str, revised:str) -> str:
    """Create a redlined diff between two resume versions."""
    return redline_diff(baseline, revised)


@app.get("/health")
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
    # TODO: Implement logic to fetch job description based on URL vs. demo JD
    if url.demo:
        job_description = JOB_DESCRIPTION_FILE.read_text()
        return {"job_description": job_description}

    # For now, always return the demo JD when not implemented.
    job_description = JOB_DESCRIPTION_FILE.read_text()
    return {"job_description": job_description}


class JobListing(BaseModel):
    """Define the shape of data expected by /review."""
    job_description: str  # Job description to be reviewed
    url: str  # URL of calling page for tracking purposes
    demo: bool = False   # if true, return static demo response


@app.post("/review")
@traceable(name="generate_review_endpoint")
def generate_review(job_listing: JobListing,
                    creds=Security(security)
                    ):
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

    # authenticate/authorize
    claims = verify_token(creds)
    check_authorized_user(claims)

    # get the LLM response
    prompt = create_review_prompt(job_listing.job_description)
    print("generate_review: calling OpenAI with prompt length", len(prompt))
    try:
        llm_response_json = prompt_llm(prompt)
    except Exception as e:
        print("generate_review: OpenAI call failed:", type(e).__name__, str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error calling LLM ({type(e).__name__}): {e}"
        )

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
                                  creds=Security(security)
                                  ):
    """Generate an updated review and resume based on candidate's answers.
    Algo:
    1. If demo is true, return canned response
    2. Save user response to USER_RESPONSE_FILE
    4. Call generate_review() to get the updated review and resume
    """
    # return stubbed response for demo
    if user_response.demo:
        response = json.loads(RESPONSE_REVIEW_ADD_INFO_DEMO_FILE.read_text())
        return response

    # authenticate/authorize before proceeding
    claims = verify_token(creds)
    check_authorized_user(claims)

    # save user response to file
    user_response_dict = user_response.qa_pairs
    USER_RESPONSE_FILE.write_text(json.dumps(user_response_dict, indent=4))

    # call generate_review() to get the updated review and resume
    job_listing = JobListing(
        job_description=JOB_DESCRIPTION_FILE.read_text(),
        url="Follow-up prompt from user",
    )
    response = generate_review(job_listing=job_listing, creds=creds)

    return response


@app.get("/resume")
def manage_resume(command: str, demo: bool = False,
                  creds = Security(security),
                  ):
    """Return the user's saved resume."""
    # return stubbed response for demo (no auth required for demo)
    if demo:
        shutil.copyfile(RESUME_DEMO_FILE, RESUME_BASELINE_FILE)
        return {"resume": RESUME_BASELINE_FILE.read_text()}

    # If not in demo and no credentials provided, avoid 401 spam and return a clear error
    if not creds:
        return {"error": "Authentication required to load resume."}

    # authenticate/authorize before proceeding
    claims = verify_token(creds)
    check_authorized_user(claims)

    if command == "load":
        shutil.copyfile(RESUME_FILE, RESUME_BASELINE_FILE)
        response = {"resume": RESUME_FILE.read_text()}
    else:
        response = {"error": "Invalid command"}
    return response


