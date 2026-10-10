# DrainGuard — Hackathon Submission

**Amazon Environmental Hacks 2026 · Track 02: Heat and Water**  
**Project**: DrainGuard — Preventive Drain-Maintenance and Flood Risk Triage Platform  
**Team**: Krishan Prasad (Team Leader), Saharsh Saxena, Dishan Sarkar  

---

## A. GitHub link to project — required

**Repository URL**: [https://github.com/Dishan18/EnvironOS](https://github.com/Dishan18/EnvironOS)

*Verification Note*: The repository is public, contains the complete source code (React SPA frontend, Python 3.11 AWS Lambda backend, AWS SAM infrastructure templates, automated test suites, and documentation), and preserves full, transparent Git commit history across all development phases.

---

## B. Deployed link to project — optional

**Primary Deployed Application**: [https://phase-4-auth.d2mwn41m5zowww.amplifyapp.com](https://phase-4-auth.d2mwn41m5zowww.amplifyapp.com/)

*Alternative Deployed Application*: [https://main.d2mwn41m5zowww.amplifyapp.com](https://main.d2mwn41m5zowww.amplifyapp.com/)  
*Live Backend API*: `https://m3sxthznac.execute-api.ap-south-1.amazonaws.com/prod`

*Deployment Note*: Both applications are deployed on AWS Amplify Hosting connected to the live AWS Asia Pacific (Mumbai) `ap-south-1` serverless backend. The primary URL hosts the latest authenticated release with Amazon Cognito User Pools and role-based access control.

---

## C. YouTube video demo link — required

`[ADD YOUTUBE UNLISTED VIDEO URL AFTER UPLOADING]`

*Submission Requirement*: The demonstration video must be recorded, uploaded to YouTube as unlisted (or public), verified accessible without login restrictions, and the placeholder above replaced with the final link prior to submission. A complete 3-minute narration script and recording checklist are provided at the end of this document.

---

## D. What does your project do? — required

Urban monsoon downpours frequently overwhelm storm drainage networks, turning clogged inlets into localized flash floods that damage homes, stall traffic, and leave standing water that breeds waterborne diseases. Municipal maintenance crews cannot be everywhere at once, and citizen complaints often lack location accuracy or severity context.

DrainGuard bridges this gap with a closed-loop preventive maintenance and risk-triage platform. Residents submit street-level drain blockages with descriptions, GPS coordinates picked interactively on a map, and photographic evidence. 

Rather than treating every report as equal, our serverless backend calculates an explainable 0-100 risk score combining blockage severity (45%), live forecasted rainfall from Open-Meteo (35%), and site exposure vulnerability (20%). High-risk blockages on arterial roads facing incoming rain automatically rise to the top of the triage queue with actionable response SLAs.

Cleanup operators use an authenticated dispatch workspace to inspect photo evidence, schedule crews, and advance incidents from Open to In Progress and Resolved. This enables data-driven preventive intervention before seasonal rains turn minor blockages into municipal emergencies.

---

## E. How did you use AWS? — required

DrainGuard is built on a serverless, event-driven AWS architecture deployed in the Asia Pacific (Mumbai) region (`ap-south-1`).

We used two core AWS open-source tools:
1. **AWS SAM CLI**: Used locally to build, test, package, and deploy serverless infrastructure.
2. **AWS SAM Templates (CloudFormation Serverless Transform)**: Used to define our entire architecture as declarative, reproducible infrastructure as code.

Our cloud architecture utilizes eight AWS cloud services:
1. **AWS Amplify Hosting**: Serves and globally distributes the responsive React single-page application over HTTPS.
2. **Amazon Cognito User Pools**: Manages user authentication with public SPA clients and distinct `admin` and `user` role groups.
3. **Amazon API Gateway (HTTP API v2)**: Routes REST endpoints with low latency, securing protected routes with an integrated Cognito JWT authorizer.
4. **AWS Lambda (Python 3.11)**: Executes backend microservices for report ingestion, weather enrichment, deterministic risk calculation, and status validation.
5. **Amazon DynamoDB**: Persists incident records using on-demand capacity (`PAY_PER_REQUEST`) with global secondary indexes for status and priority triage.
6. **Amazon S3**: Stores photo evidence in a private bucket using time-limited presigned POST policies for direct browser uploads and presigned GET URLs for authenticated viewing.
7. **AWS CloudFormation**: Automates infrastructure provisioning and resource management through SAM.
8. **Amazon CloudWatch**: Captures centralized runtime logs and debugging metrics.

---

## F. Blog links

**Status**: No blog link provided yet.

*Published AWS Builder Center Blog URLs (Optional)*:
- `[ADD PUBLISHED AWS BUILDER CENTER BLOG URL 1 (OPTIONAL)]`
- `[ADD PUBLISHED AWS BUILDER CENTER BLOG URL 2 (OPTIONAL)]`
- `[ADD PUBLISHED AWS BUILDER CENTER BLOG URL 3 (OPTIONAL)]`
- `[ADD PUBLISHED AWS BUILDER CENTER BLOG URL 4 (OPTIONAL)]`

*Note*: Blog entries are optional in the hackathon submission form. Any URL added here must link to a real, publicly accessible article on AWS Builder Center or a recognized developer publication.

---

## G. Team leader's contributions — required

**Krishan Prasad — Team Leader**

- Led project direction, problem framing for Track 02 (Heat and Water), and solution conceptualization.
- Formulated the explainable 0–100 risk-scoring heuristic combining blockage severity (45%), live forecasted rainfall (35%), and site vulnerability (20%).
- Designed the operational priority tiers (Critical, High, Moderate, Low) and mapped them to actionable response SLA guidelines.
- Coordinated architecture requirements between citizen reporting and administrative dispatch workflows.
- Directed project milestones across development phases and led hackathon documentation and submission preparation.

`[CONFIRM WITH TEAM LEADER: Please review and adjust the specific division of responsibilities to reflect your exact contributions.]`

---

## H. Second team member's contributions

**Saharsh Saxena — Team Member**

- Designed the frontend user experience and operations workspace layout.
- Integrated the interactive Leaflet mapping engine, custom SVG status markers, and map-based coordinate picker with draft form state preservation.
- Implemented responsive desktop and mobile layouts for the triage queue and inspection panels.
- Configured Lucide React iconography adhering to a strict zero-emoji, iOS-inspired light aesthetic.
- Developed frontend component and RBAC unit test suites using Vitest and React Testing Library (22 tests passing).

`[CONFIRM WITH TEAM LEADER: Please review and confirm Saharsh Saxena's documented contributions.]`

---

## I. Third team member's contributions

**Dishan Sarkar — Team Member**

- Architected and implemented the serverless backend and cloud infrastructure using AWS SAM CLI and CloudFormation.
- Developed Python 3.11 AWS Lambda handlers for report creation, list queries, status management, and presigned uploads.
- Modeled DynamoDB schema with on-demand capacity and Global Secondary Indexes (`StatusCreatedAtIndex`, `PriorityIndex`).
- Implemented Amazon Cognito User Pools authentication, API Gateway JWT authorizer integration, and backend role-based access control (RBAC).
- Engineered the private Amazon S3 direct-upload pipeline using presigned POST policies and time-limited viewing URLs.
- Built live Open-Meteo weather integration with graceful fallback handling.
- Configured AWS Amplify Hosting build and automated deployment pipelines, and authored the backend pytest test suite (74 tests passing).

*(Repository Evidence Note: All Git commits across project phases were authored under the shared project identity `DrainGuard <drainguard@example.com>`.)*

---

## J. Fourth team member's contributions

**Not applicable — our team has three members.**

---

## K. Feedback: What did you dislike about the AWS services? — required

During development, three areas presented integration friction where AWS documentation or tooling could improve:

First, Amazon S3 presigned POST uploads in `ap-south-1` caused browser CORS preflight failures when using global S3 endpoints, as S3 issued HTTP 307 temporary redirects that browsers blocked. Explicit regional endpoint configuration was required, which should be the default in SDK presigned generation examples.

Second, Amazon API Gateway HTTP API v2 serializes Cognito group claims unpredictably depending on token format—occasionally emitting JSON arrays, comma-delimited strings, or bracketed string literals like `[admin]`. This forced us to write defensive string-normalization logic in our Lambda authorization helpers rather than relying on uniform claims parsing.

Third, debugging authorization flow failures required toggling between API Gateway execution logs and separate CloudWatch Lambda log streams. A unified trace view connecting API Gateway authorizer rejections directly to downstream Lambda contexts would significantly accelerate serverless troubleshooting.

---

## L. Feedback: What did you like about the AWS services? — required

AWS services enabled our team to deliver a production-grade, secure, and resilient application within the hackathon timeframe:

First, AWS SAM CLI and CloudFormation provided rapid, declarative infrastructure deployment. Defining API Gateway, Lambda handlers, DynamoDB tables, and Cognito pools in a single `template.yaml` eliminated drift and made environment replication effortless.

Second, AWS Lambda with Python 3.11 paired with API Gateway HTTP API v2 delivered an agile serverless backend with zero server management overhead and sub-second cold starts in `ap-south-1`.

Third, DynamoDB on-demand billing eliminated capacity planning while global secondary indexes provided sub-10ms lookups for our status and priority queues.

Fourth, Amazon S3 presigned POST policies allowed direct browser-to-bucket photo uploads, offloading heavy media I/O from Lambda functions while keeping the S3 bucket completely private.

Finally, native Cognito JWT authorizer integration on API Gateway enforced authentication at the network boundary, ensuring unauthenticated requests never reached compute resources.

---

## Verified Automated Testing Baseline

Before submission, both automated test suites and the production frontend build were freshly executed and verified in the environment:

| Test Suite | Framework / Tool | Verified Result | Scope |
|---|---|:---:|---|
| **Backend Suite** | Pytest 8.3 + Moto + Coverage | **74 / 74 Passing** (100%) | Handlers, validation, 0-100 risk engine, Open-Meteo fallback, DynamoDB CRUD, S3 presign, and Cognito RBAC |
| **Frontend Suite** | Vitest 5.0 + Testing Library + jsdom | **22 / 22 Passing** (100%) | API client, Cognito auth state, LoginModal quick-fill, ReportList filters, and ReportDetail RBAC |
| **Production Build** | Vite 8 + TypeScript 5 + Tailwind 4 | **Success** (Zero errors) | Type-checking and bundle compilation for AWS Amplify Hosting |

---

# Three-Minute Demo Video Script

**Target Duration**: 2 minutes 45 seconds to 2 minutes 55 seconds (Maximum: 3:00)  
**Total Spoken Words**: 369 words  
**Speaking Pace**: 125–130 words per minute  

---

### [0:00 – 0:25] Segment 1: Problem and Product Overview (61 words)

**[Screen Action]**: Display the public DrainGuard application on AWS Amplify (`https://phase-4-auth.d2mwn41m5zowww.amplifyapp.com`). Show the minimalist iOS-inspired light interface, the interactive Leaflet map centered on urban hotspots, and the live triage queue.

**Spoken Narration**:  
> "Welcome to DrainGuard, built for Amazon Environmental Hacks 2026, Track Two: Heat and Water. During heavy monsoon rains, clogged storm drains cause severe urban waterlogging, paralyzing traffic, damaging property, and threatening public health. Municipal maintenance crews cannot inspect every culvert simultaneously, and citizen complaints often lack geographic precision. DrainGuard addresses this challenge with a closed-loop preventive drain maintenance and risk-triage platform."

---

### [0:25 – 1:15] Segment 2: Community Citizen Reporting (101 words)

**[Screen Action]**: Click 'Sign In' on the login card, use the 'Demo User' quick-fill button (`user@drainguard.demo`), and log in. Note the 'USER' badge in the header. Click '+ Report Drain Blockage'. Type a description, select 'High' severity and 'Arterial Road' site. Attach a photo, click 'Select on Map', and click a location on the map to place crosshairs. Click 'Submit Report'. Show the new report appearing instantly in the queue and on the map. Click the report to display its detail pane showing the calculated 54/100 risk score and the read-only banner indicating status changes are restricted.

**Spoken Narration**:  
> "Let us sign in with the demo community user account. Residents can view active drainage hotspots across their city on an interactive Leaflet map. To report an obstructed drain, I click 'Report Drain Blockage', enter a concise description, select high severity, and designate an arterial road site. I attach photo evidence and click directly on the map to pinpoint exact coordinates. When I submit, our backend enriches the report with forecasted rainfall from Open-Meteo and computes an explainable risk score—here, fifty-four out of one hundred, categorized as high priority. Notice that community users have read-only status permissions to prevent unauthorized tampering."

---

### [1:15 – 2:00] Segment 3: Municipal Administrator Workflow & RBAC (85 words)

**[Screen Action]**: Click 'Sign Out'. Click 'Demo Admin' quick-fill (`admin@drainguard.demo`) and log in. Point out the 'ADMIN' badge in the header. Select the newly submitted incident. Note that the admin action button 'Advance to In Progress ->' is active. Click it; the status badge transitions to 'In Progress'. Next, click 'Advance to Resolved ->'; the badge transitions to 'Resolved' with a green checkmark. Refresh the browser page to demonstrate that the status change and audit timestamps persist in DynamoDB.

**Spoken Narration**:  
> "Next, let us sign out and log in as the municipal triage administrator. Dispatchers see the newly submitted incident prioritized in their operations queue. Inspecting the report reveals the photographic evidence retrieved securely from private Amazon S3, along with the explainable factor breakdown. Because this account holds admin privileges, I can advance the workflow to 'In Progress', dispatching maintenance crews. Once cleared on-site, I advance it to 'Resolved'. Refreshing the page confirms that the state transition and audit timestamps persisted reliably in our live database."

---

### [2:00 – 2:40] Segment 4: Serverless AWS Cloud Architecture (79 words)

**[Screen Action]**: Pan across the clean operational dashboard metrics or display the architecture diagram from `guide.md`. Highlight the key AWS building blocks: Amplify, Cognito, API Gateway, Lambda, DynamoDB, S3, and SAM.

**Spoken Narration**:  
> "Under the hood, DrainGuard runs on a serverless AWS architecture deployed in Mumbai. Our React single-page application is hosted on AWS Amplify. Authentication and role-based access control are managed by Amazon Cognito User Pools. Requests route through Amazon API Gateway HTTP API with JWT authorization to Python three-point-eleven AWS Lambda handlers. Incident records persist in Amazon DynamoDB, while photo evidence streams directly to private Amazon S3 via presigned POST policies. Everything is codified reproducibly with the AWS SAM CLI."

---

### [2:40 – 3:00] Segment 5: Learning, Limitations, and Practical Impact (43 words)

**[Screen Action]**: Return to the full map view showing open and resolved drainage markers. Conclude with contact info or project repository link.

**Spoken Narration**:  
> "Building DrainGuard demonstrated how serverless cloud primitives solve civic challenges. While our risk engine is an operational triage heuristic rather than a scientifically validated flood model, it provides transparent, explainable maintenance prioritization before seasonal rains escalate minor blockages into municipal emergencies. Thank you."

---

## Demo Video Recording Checklist

Before recording your three-minute demo:

- [ ] **Display Resolution**: Set screen resolution to 1080p (1920 × 1080) for clear text readability.
- [ ] **Browser Settings**: Set browser zoom to 100% or 110%. Hide bookmarks bar and close all unrelated browser tabs and background applications.
- [ ] **Audio Setup**: Use an external microphone or headset in a quiet room; test input volume to prevent clipping.
- [ ] **Target URL**: Record directly against the live production deployment:  
  `https://phase-4-auth.d2mwn41m5zowww.amplifyapp.com`
- [ ] **Credential Check**: Verify demo accounts log in smoothly using the one-click quick-fill buttons:
  - Admin: `admin@drainguard.demo` / `admin12345`
  - User: `user@drainguard.demo` / `user12345`
- [ ] **Timekeeping**: Keep a stopwatch visible on your second monitor or phone. Rehearse once to ensure your pace completes comfortably between 2:45 and 2:55.
- [ ] **Video Upload**:
  - Export video as MP4 (1080p, 30 or 60 fps).
  - Upload to YouTube with visibility set to **Unlisted** (or **Public**).
  - Ensure video processing is complete (HD processing finished) so text is crisp.
- [ ] **Final Submission Step**: Replace `[ADD YOUTUBE UNLISTED VIDEO URL AFTER UPLOADING]` in Section C of `submission.md` with your final YouTube link.
