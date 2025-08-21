import json, os, textwrap, uuid, pathlib

# Build the output JSON structure
output = {
  "Fit": {
    "score": 6,
    "rationale": (
      "Above-average fit for CEO of an autonomy/AI startup: proven C-suite operator, org build/scaling, GTM/P&L ownership, AI-driven product execution. "
      "Key gaps: no direct robotics/autonomy domain leadership; limited evidence of primary fundraising/IPO; no explicit record hiring SLAM/perception/embedded specialists. "
      "Best positioning: operator CEO paired with a strong CTO—lead company building, GTM, culture/operating cadence, and investor readiness while recruiting deep-domain engineering leaders. "
      "Focus on seed–Series B companies where disciplined scaling and enterprise/GTM muscle are decisive. fileciteturn1file0 | [Download JSON](sandbox:/mnt/data/Tailored_CEO_Assessment.json)"
    )
  },
  "Gap_Map": [
    {
      "JD Requirement/Keyword": "Autonomous navigation/robotics domain leadership (High)",
      "Present in Resume?": "N",
      "Where/Evidence": "No autonomy/robotics products listed across roles.",
      "Gap handling": "Omit claims; emphasize AI org leadership and fast domain ramp."
    },
    {
      "JD Requirement/Keyword": "Hire Navigation/SLAM/Perception/Embedded specialists (High)",
      "Present in Resume?": "Partial",
      "Where/Evidence": "Built/rebuilt product orgs; led 140p team; ML/DS org at FNGN.",
      "Gap handling": "Rephrase to team-building scope; ask for specialized hiring examples."
    },
    {
      "JD Requirement/Keyword": "Founder/early-stage zero-to-one leadership (High)",
      "Present in Resume?": "Partial",
      "Where/Evidence": "33Across (Series B), Jaxtr/Upwork early-stage; not framed as founder/CEO.",
      "Gap handling": "Rephrase bullets to foreground zero-to-one and scrappy scaling."
    },
    {
      "JD Requirement/Keyword": "Fundraising/capital raising & investor relations (High)",
      "Present in Resume?": "Partial",
      "Where/Evidence": "C-suite exposure and PE operator role; no specific raise amounts.",
      "Gap handling": "Add investor-readiness narratives; ask for owned raise details."
    },
    {
      "JD Requirement/Keyword": "Guide technical/product direction with engineering leaders (High)",
      "Present in Resume?": "Y",
      "Where/Evidence": "Partnered with CTOs/CPOs; Agile/AI workflows; roadmap transformations.",
      "Gap handling": "Rephrase with JD terms: roadmap, architecture tradeoffs, cadence."
    },
    {
      "JD Requirement/Keyword": "Build culture of innovation, accountability, speed (Med)",
      "Present in Resume?": "Y",
      "Where/Evidence": "Engagement +25% (Move), +40% (FNGN); 30%+ velocity uplift.",
      "Gap handling": "Keep; mirror “operating cadence” and “accountability” wording."
    },
    {
      "JD Requirement/Keyword": "External representation: partners/investors (Med)",
      "Present in Resume?": "Partial",
      "Where/Evidence": "GTM leadership and exec roles; no explicit external-facing examples.",
      "Gap handling": "Add 1–2 credible partner/investor touchpoints, if available."
    },
    {
      "JD Requirement/Keyword": "IPO prep/capital markets (Med)",
      "Present in Resume?": "N",
      "Where/Evidence": "No IPO experience cited; some transformation/PMI work.",
      "Gap handling": "Omit IPO claims; emphasize scale/PMI discipline."
    },
    {
      "JD Requirement/Keyword": "AI/ML background (Med)",
      "Present in Resume?": "Y",
      "Where/Evidence": "AI/ML personalization (Move); ML/Data Science org (FNGN); AI workflows.",
      "Gap handling": "Keep; mirror “AI-driven” and “data-driven” terminology."
    },
    {
      "JD Requirement/Keyword": "Education (MBA/Eng/CS) (Low)",
      "Present in Resume?": "Y",
      "Where/Evidence": "MIT MBA; BSc Statistics; BComm Economics.",
      "Gap handling": "Keep as is."
    },
    {
      "JD Requirement/Keyword": "Location: San Jose/South Bay (Low)",
      "Present in Resume?": "Y",
      "Where/Evidence": "Cupertino, CA.",
      "Gap handling": "Keep as is."
    }
  ],
  "Questions": [
    "Have you directly led any primary fundraising? If yes, list stage, amount, investor(s), and your role.",
    "Have you hired specialized engineers (data/ML, embedded, perception/SLAM)? If yes, how many and for what missions?",
    "Which investor/board narratives and KPIs did you personally own (e.g., burn/runway, milestones, roadmap risk)?",
    "List 1–2 instances where you served as the external face with partners/customers and the business outcome.",
    "Bonus: What else should I know about you and this job?"
  ],
  "Tailored_Resume": (
    "Chung Meng Cheong\n"
    "Cupertino, CA    |    408-218-0306    |    ccm@alum.mit.edu    |    linkedin.com/in/chungmengcheong\n\n"
    "## PROFESSIONAL EXPERIENCE \n"
    "SILVER LAKE        Apr 2020 - Oct 2024, Menlo Park, CA\n"
    "Private equity firm investing in technology and technology-enabled companies. Drove operating effectiveness across portfolio companies.\n\n"
    "Operating Executive \n"
    "Strategy, Transformation, Organization Development, Executive Coaching & Recruiting.\n"
    "* Recruited, onboarded, and coached 10+ C-level executives to strengthen leadership benches and execution.\n"
    "* Partnered with CPOs/CTOs to set strategy, revise operating practices/cadence, institute AI workflows—lifting productivity/velocity 30%+ and revenue/growth 10%+.\n"
    "* Identified 20%+ EBITDA improvements; realized >60% within 12 months via org redesign and AI-enabled efficiencies.\n"
    "* Co-developed post-merger integration plans with management teams, realizing targeted gains 4 quarters early and 30%+ above plan.\n\n"
    "MOVE INC / REALTOR.COM        Apr 2017 - Mar 2020, Santa Clara, CA\n"
    "Digital real estate search for consumers and SaaS platform for real estate agents. Direct report to CEO. Led 140-person team across product, UX, editorial, sales, and operations. \n\n"
    "Chief Product Officer and General Manager\n"
    "Strategy pivot, consumer experience, organization development, general management\n"
    "* Set vision and won company-wide alignment for a consumer-centric transformation, enabling a strategic pivot and largest acquisition.\n"
    "* Delivered AI/ML-personalized experiences to 75M monthly uniques (+10% CAGR), achieving 78/100 satisfaction.\n"
    "* Launched monetization/lead products fueling ~15% revenue CAGR.\n"
    "* Oversaw P&L, Sales, and Operations across $30M+ SaaS BU; consistently beat EBITDA targets.\n"
    "* Rebuilt product organization and operating model, increasing engagement 25% and driving a four-year low in voluntary turnover.\n\n"
    "FINANCIAL ENGINES (FNGN)         Apr 2014 - Mar 2017, Sunnyvale, CA\n"
    "Automated asset management and retirement advisory. Direct report to CEO and Section 16 officer. Led 90-person team across product, UX, analytics, and marketing. \n\n"
    "EVP, Product Management and Consumer Marketing \n"
    "Strategy pivot, culture transformation, execution velocity, consumer experience, innovation, data science\n"
    "* Owned asset-management platform; revenue grew 24% CAGR to $400M in 2016.\n"
    "* Led shift from B2B to B2B2C—usage +120% and cancellations −20%.\n"
    "* Implemented freemium and omnichannel (digital/print/call center), increasing conversion 33%.\n"
    "* Accelerated execution 3X by establishing Agile development and reimagining GTM.\n"
    "* Built ML/Data Science organization; increased engagement 40%.\n\n"
    "33ACROSS        Apr 2012 - Mar 2014, Sunnyvale, CA\n"
    "Publisher network and big data adtech startup. Joined at Series B. Direct report to CEO. Led 3 product managers. \n\n"
    "Chief Product Officer \n"
    "Business model pivot, product innovation, consumer ad experience, publisher network\n"
    "* Led tiger team to conceive and achieve product–market fit for new product lines underpinning company relaunch.\n"
    "* Improved publisher products, reducing churn 75% and expanding base 60% to 1M+ sites; won industry innovation award.\n"
    "* Created new ad impressions outperforming competitors 4–10X, reaching >50% run-rate revenue within 18 months.\n\n"
    "YP INC (formerly AT&T Interactive)        Jan 2009 - Mar 2012,  San Francisco, CA\n"
    "Publisher network and ad products for local businesses. Executive team member. Led 60-person team for product, business management, and UX. Spun out in 2012. \n\n"
    "Vice President, Product - Advertising Products and Publisher Network\n"
    "Product extensions, growth/harvest investment tradeoffs, ad network yield, sales enablement\n"
    "* Led ad-products portfolio; revenue grew 20% CAGR to $975M in 2011, with 3 of 4 lines exceeding targets.\n"
    "* Overhauled ad products and expanded into SMB CRM; new products contributed 50%+ of 2009–2011 revenue growth.\n"
    "* Developed mobile ad network leveraging AT&T targeting; achieved 2X better eCPMs than competitors.\n"
    "* Increased sales-force productivity 45% via qualified-lead lift, mobile-first positioning, and enhanced presales tools.\n\n"
    "Earlier career roles:\n"
    "JAXTR, VP Product (Series A)        May 2007 - Dec 2009, Menlo Park, CA\n"
    "EBAY INC, Group Product Manager        May 2004 - Apr 2007, San Jose, CA\n"
    "UPWORK, Director Category Management (Series A)        Aug 2004 - May 2007 Sunnyvale, CA\n"
    "BOSTON CONSULTING GROUP, Associate        Feb 1996 - Jun 1998 Kuala Lumpur, Malaysia\n\n"
    "## EDUCATION\n"
    "M.I.T. SLOAN SCHOOL OF MANAGEMENT        Aug 1998 - Jun 2000 Cambridge, MA\n"
    "Master of Business Administration\n\n"
    "UNIVERSITY OF AUCKLAND        Feb 1992 - Dec 1995 New Zealand\n"
    "Bachelor of Science (Statistics), Bachelor of Commerce (Economics)\n"
  )
}

# Write to a file for user download
with open("../LLM_response_prior_copy.json", "w", encoding="utf-8") as file:
    json.dump(output, file, ensure_ascii=False, indent=2)

    # json.dump(output, f, ensure_ascii=False, indent=2)
