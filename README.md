## AI Recruiting Agent

The AI Recruiting Agent is an AI agent that maximizes your chances of landing an interview! 

(I'm using this project to get hands-on experience with (a) creating and supporting an AI powered product, especially on the AI pipeline such as evals, and (b) building using the latest AI design and development tools. I wrote most of the back-end manually and vibe-coded the front-end.)

### Product features
The AI Recruiting Agent interacts with user through a Chrome extension to:
* Assess how the user's resume lines up against a job (description). 
* Provide a item-by-item assessment of how their experience and skills line up against a job's "must haves" and tactics to improve that alignment
* Interview them for potential additional relevant experience and skills that may not be on their resume, but might be relevant to the job 
* Recommends a redlined resume that frames the user's career narrative, experience and skills to best align with the job description, as well as phrasing tweaks to increase their ATS (Applicant Tracking System) performance
* [Future] "Agentically" auto-complete the job application forms on their behalf!
* [Future] Identifies relevant 1st and 2nd degree contacts for networking into the job

Behind the scenes, the AI Recruiting Agent uses a custom AI-pipeline incorporating 
the developer's years of career coaching and recruiting experience together with OpenAI's latest LLM models.

### Repo details
Note: The code is a work-in-progress. It is not intended for use by anyone other than myself and my beta testers.

1. /backend: The FastAPI backend (plus various utils, e.g., authentication) that serves as the main orchestrator of the AI pipeline 
2. /BrowserExtension: A Chrome extension that provides the user interface and interacts with the backend. This was initially built using v0.dev, but has since been heavily modified.
3. /prompts: A collection of prompt templates used by the AI models
4. [Future] /evals: A collection of evaluation scripts to assess the performance of the AI models
5. /demo: stubbed API responses used by the front-end during demo mode
6. /tests: A collection of unit tests for the backend


### Compiling the browser extension

Run the following command from the /BrowserExtension directory to build the browser extension and:
- Use the production backend: npm run build-extension. 
- Use a local backend: BACKEND_URL=http://localhost:8000 npm run build-extension




