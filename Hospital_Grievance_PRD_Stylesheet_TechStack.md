# Hospital Grievance & Service Monitoring System

## Product Requirements Document (PRD), Stylesheet & Technology Stack

**Event:** SOLVATHON 2026\
**Problem Statement:** PS1 -- Accessible Voice-Based Public Grievance &
Hospital Service Monitoring System\
**Document type:** Product and technical specification\
**Version:** 1.0\
**Status:** Proposed prototype specification

------------------------------------------------------------------------

# 1. Product Requirements Document (PRD)

## 1.1 Product overview

The Hospital Grievance & Service Monitoring System is an accessible,
multilingual platform that enables patients and visitors to report
non-emergency service-related issues in government hospitals. A person
should be able to submit a grievance through a phone call or assisted
registration, including when they do not own a smartphone or have
limited digital literacy.

The platform records each grievance, generates a unique complaint ID,
categorises it, routes it to the appropriate hospital authority, and
provides a mechanism to monitor progress, follow up on pending
complaints, and record authorised resolution updates.

The system is intended for **non-emergency hospital service grievances
only**. Medical emergencies must be directed immediately to hospital
staff or emergency services.

## 1.2 Problem statement

Patients and visitors in government hospitals may experience issues such
as:

-   Doctors or medical staff being unavailable.
-   Prescribed medicines being unavailable.
-   Poor cleanliness and hygiene.
-   Lack of drinking water or sanitation.
-   Insufficient beds and basic facilities.
-   Poor infrastructure maintenance.

People, particularly rural citizens and elderly visitors, may not know
where or how to report these concerns. Existing digital complaint
channels may also be inaccessible to people without smartphones or the
confidence to use online systems.

## 1.3 Product vision

Make reporting a hospital service grievance as simple as speaking about
the problem, while ensuring that every valid complaint is recorded,
reaches an identifiable authority, and can be tracked until an
authorised closure.

## 1.4 Goals

1.  Enable grievance registration through voice calls and assisted
    registration.
2.  Support Kannada and provide a design that can accommodate additional
    local languages.
3.  Avoid making smartphone ownership a prerequisite for reporting.
4.  Generate a unique reference ID for every successfully registered
    grievance.
5.  Categorise and route complaints to the appropriate hospital
    authority.
6.  Let authorised officials update status and record action taken.
7.  Highlight pending and overdue complaints for follow-up.
8.  Give administrators a clear view of complaint volume, categories,
    status and recurring issues.
9.  Minimise collection and exposure of complainant information.

## 1.5 Out of scope

-   Diagnosing medical conditions or giving medical advice.
-   Replacing emergency response systems.
-   Registering clinical complaints that require a separate
    medical/legal process unless explicitly configured by the hospital.
-   Collecting detailed patient medical records.
-   Automatically declaring a complaint resolved without an authorised
    update.
-   Publicly exposing complainant identities or private complaint
    details.
-   Integrating with every government hospital system in the initial
    prototype.

## 1.6 Target users and roles

  -----------------------------------------------------------------------
  User / role             Needs                   Main capabilities
  ----------------------- ----------------------- -----------------------
  Patient / visitor       Report an issue without Voice-based complaint
                          needing a smartphone    or assisted
                                                  registration; receive
                                                  complaint ID and status
                                                  information

  Registration operator / Help visitors submit    Register a grievance on
  help-desk staff         complaints              behalf of a
                                                  complainant; select
                                                  language and category;
                                                  provide acknowledgement

  Hospital department     Receive and act on      View assigned
  officer                 assigned complaints     complaints; update
                                                  status; add
                                                  action-taken notes

  Hospital administrator  Monitor service issues  View all complaints;
                          and staff response      assign or reassign;
                                                  monitor pending cases;
                                                  review trends

  System administrator    Configure and maintain  Manage users, roles,
                          the platform            categories, routing
                                                  rules and supported
                                                  languages
  -----------------------------------------------------------------------

## 1.7 Core modules

### A. Voice-based grievance registration

-   Accept incoming calls through an IVR/telephony integration.
-   Offer a language choice, including Kannada.
-   Guide the caller through a short complaint submission flow.
-   Capture the caller's spoken grievance and convert it into text where
    supported.
-   Confirm the captured complaint details before submission where the
    call flow permits.
-   Generate a unique complaint ID after successful registration.
-   Provide the ID through a voice acknowledgement and, where a number
    is available and consent is given, an SMS acknowledgement.
-   Provide an assisted-registration fallback if automated speech
    recognition fails.

### B. Assisted registration

-   Allow authorised help-desk staff to register a complaint for a
    visitor.
-   Provide a simple form with language, complaint category,
    hospital/department, description and optional contact details.
-   Allow staff to read back or confirm the complaint with the visitor.
-   Generate the same type of unique complaint ID as the voice channel.
-   Record that the complaint was submitted through assisted
    registration.

### C. Language support

-   Kannada is a required prototype language.
-   Keep language selection visible and easy to understand.
-   Store the original-language transcript or operator-entered text
    where available.
-   Support an optional translated summary for officers, while retaining
    the original text for reference.
-   Do not silently treat machine translation as an authoritative
    statement; allow an officer to inspect the original complaint.
-   Design the language layer so additional local languages can be added
    later.

### D. Complaint categorisation and routing

Suggested initial categories:

1.  Staff availability
2.  Medicine availability
3.  Cleanliness and hygiene
4.  Drinking water and sanitation
5.  Beds and basic facilities
6.  Infrastructure maintenance
7.  Other service-related issue

-   Suggest a category using rules or AI-assisted text classification.
-   Allow an authorised operator or officer to correct the category.
-   Route complaints using configurable category-to-department mapping.
-   Record assignment history, including who assigned or reassigned the
    complaint.
-   Send unclassified or unmatched complaints to an administrator review
    queue.

### E. Complaint tracking and lifecycle

Each complaint should have:

-   Unique complaint ID.
-   Submission channel.
-   Submission timestamp.
-   Language.
-   Category and description.
-   Hospital and department.
-   Current assigned authority.
-   Current status.
-   Status history.
-   Action-taken notes.
-   Resolution or closure timestamp, when applicable.

Proposed statuses:

`Submitted → Acknowledged → Assigned → In Progress → Resolved → Closed`

Additional status:

-   `Needs Review` -- category or routing needs administrative
    attention.
-   `Reopened` -- complainant or authorised staff indicates that the
    issue persists after a resolution update.

A complaint must not be marked `Closed` merely because an officer opened
it. Closure should require an authorised resolution update.

### F. Notifications and acknowledgement

-   Confirm successful registration and provide the complaint ID.
-   Notify the assigned authority of a new complaint.
-   Notify relevant users when the status changes, where a contact
    channel is available and permitted.
-   Provide pending-complaint reminders to responsible officials.
-   Avoid sending sensitive complaint details in notifications; use the
    complaint ID and a secure dashboard link where appropriate.
-   Keep notification delivery status for operational troubleshooting.

### G. Hospital administration dashboard

The dashboard should provide:

-   Total complaints received.
-   New / unassigned complaints.
-   Complaints in progress.
-   Resolved and closed complaints.
-   Pending and overdue complaints.
-   Category-wise distribution.
-   Department-wise distribution.
-   Complaint trends over time.
-   Recent complaint activity.
-   A searchable and filterable complaint table.
-   A clear view of assignment, status and action history.

### H. Follow-up and escalation

-   Highlight complaints that remain pending beyond a configurable
    threshold.
-   Show the age of each pending complaint.
-   Notify or flag the responsible authority when follow-up is due.
-   Escalate unresolved complaints to a higher authority according to
    configurable rules.
-   Keep a record of each reminder and escalation.
-   Do not invent statutory deadlines; thresholds must be configured by
    the hospital or project demonstrator.

### I. User, role and configuration management

-   Secure login for staff and administrators.
-   Role-based access control.
-   Manage hospital departments and officer assignments.
-   Configure complaint categories and routing rules.
-   Configure language options and follow-up thresholds.
-   Maintain an audit log for important administrative actions.

## 1.8 Primary workflows

### Workflow 1: Voice-based complaint

1.  A patient or visitor calls the designated grievance number.
2.  The IVR welcomes the caller and asks them to select a language.
3.  The system explains that the channel is for non-emergency hospital
    service grievances.
4.  The caller describes the issue.
5.  Speech is transcribed where supported; the caller is asked to
    confirm or repeat if necessary.
6.  The system captures only the minimum required details.
7.  A complaint record is created and assigned a unique complaint ID.
8.  The system categorises and routes the complaint, or sends it to a
    review queue.
9.  The caller receives an acknowledgement through voice and, if
    available and consented to, SMS.
10. The responsible officer reviews the complaint and updates its
    status.
11. Pending cases appear in the follow-up queue.
12. An authorised officer records the action taken and resolution.
13. The complaint is closed according to the configured workflow.

### Workflow 2: Assisted registration

1.  A visitor approaches the hospital help desk.
2.  An operator selects the visitor's preferred language.
3.  The operator records the issue using the assisted-registration form.
4.  The operator confirms the details with the visitor.
5.  The system creates the complaint and generates a unique ID.
6.  The operator communicates the ID to the visitor.
7.  The complaint enters the same categorisation, assignment and
    tracking workflow as a voice complaint.

### Workflow 3: Officer handling

1.  An officer signs in.
2.  The officer sees complaints assigned to their department.
3.  The officer opens a complaint and reviews its details.
4.  The officer acknowledges it and updates the status.
5.  The officer records action taken and any relevant internal note.
6.  If the issue is resolved, the officer submits a resolution update.
7.  The complaint is closed only through the authorised closure process.
8.  All updates are stored in the complaint history.

### Workflow 4: Administrator follow-up

1.  The administrator opens the dashboard.
2.  The dashboard highlights unassigned, pending and overdue complaints.
3.  The administrator filters by hospital, department, category, status
    or date.
4.  The administrator assigns or escalates a complaint where required.
5.  The system records the action and updates the follow-up queue.

## 1.9 Functional requirements

  ------------------------------------------------------------------------
  ID                      Requirement              Priority
  ----------------------- ------------------------ -----------------------
  FR-01                   The system shall accept  Must
                          grievances through a     
                          voice-call channel.      

  FR-02                   The system shall support Must
                          assisted complaint       
                          registration.            

  FR-03                   The system shall provide Must
                          Kannada language support 
                          in the prototype.        

  FR-04                   The system shall         Must
                          generate a unique        
                          complaint ID for each    
                          successfully registered  
                          complaint.               

  FR-05                   The system shall store   Must
                          complaint category,      
                          description, channel,    
                          timestamp and status.    

  FR-06                   The system shall route   Must
                          complaints using         
                          configurable             
                          category-to-department   
                          rules.                   

  FR-07                   The system shall allow   Must
                          authorised officers to   
                          update complaint status  
                          and action taken.        

  FR-08                   The system shall display Must
                          complaint status and     
                          history to authorised    
                          users.                   

  FR-09                   The system shall         Must
                          highlight pending and    
                          overdue complaints.      

  FR-10                   The system shall provide Must
                          an administrative        
                          dashboard with summary   
                          metrics and filters.     

  FR-11                   The system should send   Should
                          acknowledgement and      
                          status notifications     
                          when a contact channel   
                          is available and         
                          consented to.            

  FR-12                   The system should        Should
                          maintain assignment,     
                          status-change and        
                          escalation history.      

  FR-13                   The system may provide   Could
                          AI-assisted              
                          categorisation and       
                          translation suggestions  
                          with human review.       

  FR-14                   The system may support   Could
                          additional local         
                          languages beyond         
                          Kannada.                 
  ------------------------------------------------------------------------

## 1.10 Non-functional requirements

-   **Accessibility:** Large readable text, clear labels, simple
    navigation, high contrast and minimal steps.
-   **Usability:** The complaint form should avoid unnecessary fields
    and use plain language.
-   **Language:** Kannada must be supported in the prototype interface
    and voice journey.
-   **Reliability:** Failed call transcription or notification delivery
    must not silently create a false success state.
-   **Security:** Staff functions must require authentication and
    role-based authorisation.
-   **Privacy:** Collect only information necessary to register and
    follow up on a service grievance.
-   **Auditability:** Preserve timestamps and a history of assignment
    and status changes.
-   **Performance:** Dashboard lists should support pagination and
    filtering rather than loading every complaint at once.
-   **Maintainability:** Categories, departments, routing and escalation
    thresholds should be configurable.
-   **Scalability:** Separate telephony, application and database
    concerns so that more hospitals can be added later.

## 1.11 Data model (proposed)

### Complaint

  ------------------------------------------------------------------------
  Field                    Type / example          Purpose
  ------------------------ ----------------------- -----------------------
  complaint_id             UUID / human-readable   Unique public reference
                           reference               

  hospital_id              ID                      Hospital where the
                                                   issue occurred

  department_id            ID, nullable            Responsible department

  category_id              ID                      Complaint category

  description_original     Text                    Original-language
                                                   complaint

  description_translated   Text, nullable          Optional translated
                                                   version

  language_code            `kn`, `en`, etc.        Complaint language

  submission_channel       `voice`, `assisted`     How it was submitted

  status                   Enum                    Current lifecycle
                                                   status

  complainant_name         Text, optional          Only if needed

  contact_number           Text, optional          For follow-up when
                                                   consented

  consent_to_contact       Boolean                 Records contact
                                                   preference

  assigned_officer_id      ID, nullable            Responsible officer

  created_at               Timestamp               Submission time

  updated_at               Timestamp               Last update

  resolved_at              Timestamp, nullable     Resolution time

  closed_at                Timestamp, nullable     Closure time
  ------------------------------------------------------------------------

### Complaint history

-   `history_id`
-   `complaint_id`
-   `old_status`
-   `new_status`
-   `action_note`
-   `updated_by`
-   `created_at`

### Supporting entities

-   `User`: staff identity, role, department and account status.
-   `Hospital`: hospital profile and location metadata.
-   `Department`: hospital department and routing configuration.
-   `Category`: complaint category and default routing target.
-   `Notification`: channel, delivery state, timestamp and related
    complaint.
-   `Escalation`: trigger, target authority, reason and timestamp.
-   `AuditLog`: security- and administration-relevant actions.

## 1.12 Success metrics for the prototype

-   A user can complete an assisted complaint registration from start to
    generated complaint ID.
-   A caller can complete the demonstrated voice flow in Kannada,
    subject to the selected telephony and speech-service capabilities.
-   Every successfully registered complaint appears in the dashboard.
-   A complaint can be categorised, assigned, updated and closed by an
    authorised officer.
-   Pending complaints are visibly highlighted.
-   The demonstrator can show the complete journey from registration to
    resolution.
-   The prototype does not require a complainant to own a smartphone.

These are prototype acceptance goals, not claims of deployment-scale
performance.

## 1.13 MVP scope and implementation order

### MVP -- required for demonstration

1.  Staff login and role-based dashboard access.
2.  Assisted registration form.
3.  Complaint ID generation.
4.  Complaint category and department assignment.
5.  Complaint list, detail view and status history.
6.  Officer status update and resolution note.
7.  Pending-complaint indicators.
8.  Kannada interface labels and a prepared Kannada voice demonstration.
9.  A working IVR/voice integration if the telephony provider and
    credentials are available; otherwise, demonstrate the voice workflow
    with a clearly labelled simulated call input.

### Enhancements after MVP

-   Production-grade Kannada speech recognition and text-to-speech.
-   SMS or voice callback notifications.
-   AI-assisted categorisation and translation with human review.
-   Configurable escalation rules.
-   Multi-hospital administration and comparative analytics.
-   Public complaint-status lookup through a basic phone interaction.

------------------------------------------------------------------------

# 2. Stylesheet & UI/UX Guidelines

## 2.1 Visual direction

**Reference:** [Hospital management software landing page --
Dribbble](https://dribbble.com/shots/26038656-Hospital-management-software-landing-Landing-Page-Design)

Use the reference as visual inspiration for a calm, modern healthcare
product:

-   Clean and professional interface.
-   Trustworthy, restrained colour palette.
-   Clear information hierarchy.
-   Quick-glance operational metrics.
-   Strong, obvious primary actions.
-   Responsive layouts for desktop, tablet and mobile.
-   A balance between technology and human-centred care.

The product is a grievance-management system, not a clinical
hospital-management suite. Prioritise complaint queues, status,
assignment and follow-up over appointments, billing or electronic
medical records.

## 2.2 Colour palette

The following palette is taken from the colour values shown with the
Dribbble reference, with semantic roles proposed for this product.

  --------------------------------------------------------------------------
  Token                      Hex                     Suggested use
  -------------------------- ----------------------- -----------------------
  `--color-surface`          `#E8E9EA`               Soft neutral
                                                     page/background surface

  `--color-primary`          `#081F26`               Primary brand colour,
                                                     navigation, headings
                                                     and strong buttons

  `--color-muted`            `#92989B`               Secondary text and
                                                     muted icons

  `--color-text-secondary`   `#5F6464`               Supporting text, labels
                                                     and metadata

  `--color-border`           `#ADBCCB`               Borders, dividers and
                                                     subtle outlines
  --------------------------------------------------------------------------

### Additional semantic UI colours

These are proposed interface colours, not colours taken from the
reference.

  -----------------------------------------------------------------------
  Token                   Suggested value         Use
  ----------------------- ----------------------- -----------------------
  `--color-page`          `#F7F9FA`               Main application
                                                  background

  `--color-card`          `#FFFFFF`               Cards, forms and tables

  `--color-success`       `#247A57`               Resolved / closed
                                                  states

  `--color-warning`       `#A96812`               Pending / follow-up
                                                  states

  `--color-danger`        `#B33A3A`               Overdue / critical
                                                  system alerts

  `--color-info`          `#356B8C`               Informational status

  `--color-focus`         `#2D7884`               Keyboard focus ring and
                                                  selected controls
  -----------------------------------------------------------------------

Use semantic colours consistently. Do not communicate complaint status
through colour alone; always include a text label or icon.

## 2.3 Typography

Suggested typography:

-   **Primary font:** Inter.
-   **Kannada font fallback:** Noto Sans Kannada.
-   **Generic fallback:** system sans-serif.

CSS font stack:

``` css
font-family: "Inter", "Noto Sans Kannada", system-ui, sans-serif;
```

Typography guidance:

  Element               Suggested size     Weight
  ------------------- ---------------- ----------
  Main page heading           28--32px   650--700
  Section heading             20--24px        600
  Card heading                16--18px        600
  Body text                   14--16px        400
  Form label                  13--14px   500--600
  Metadata                    12--13px        400
  KPI number                  28--34px   650--700

Use comfortable line height (approximately 1.45--1.6 for body text).
Ensure Kannada text is not clipped and has adequate line height.

## 2.4 Layout and spacing

-   Use a 12-column desktop grid where appropriate.
-   Use a consistent spacing scale: 4, 8, 12, 16, 24, 32 and 40px.
-   Keep dashboard content within a readable maximum width.
-   Use generous whitespace between major sections.
-   Use cards for grouped information, not for every individual line of
    data.
-   Keep tables compact but readable.
-   Use a persistent sidebar on desktop and a collapsible navigation
    pattern on smaller screens.
-   Keep primary actions in predictable locations.

## 2.5 Application shell

### Desktop layout

1.  **Sidebar**
    -   Product logo/name.
    -   Overview.
    -   Complaints.
    -   New complaint.
    -   Follow-up queue.
    -   Departments / officers (admin only).
    -   Reports / analytics.
    -   Settings (admin only).
    -   User profile and logout at the bottom.
2.  **Top bar**
    -   Current page title or breadcrumb.
    -   Hospital selector if the account has access to multiple
        hospitals.
    -   Search.
    -   Notification indicator.
    -   User profile menu.
3.  **Main content**
    -   Page heading and contextual description.
    -   Primary action, such as "Register complaint".
    -   KPI cards or filters when relevant.
    -   Main data table, queue or form.

### Mobile layout

-   Use a compact top bar and collapsible navigation.
-   Stack KPI cards vertically or in a horizontally scrollable row.
-   Convert wide tables into readable complaint cards or allow
    controlled horizontal scrolling.
-   Keep important actions reachable and avoid tiny touch targets.
-   Make assisted registration usable on a tablet at a hospital help
    desk.

## 2.6 Key screens

### A. Login

-   Minimal, uncluttered login panel.
-   Product identity and short purpose statement.
-   Username/email and password fields.
-   Clear sign-in action.
-   Error states that explain the issue without exposing sensitive
    account information.

### B. Admin dashboard

Suggested structure:

-   Greeting and selected hospital.
-   KPI row: Total, New, In Progress, Pending/Overdue, Resolved.
-   Complaint trend chart.
-   Category distribution.
-   Department-wise workload.
-   Recent complaints table.
-   Pending follow-up panel.

### C. Complaint management

Table columns:

-   Complaint ID
-   Submitted date
-   Category
-   Department
-   Channel
-   Assigned officer
-   Status
-   Last updated
-   Action

Controls:

-   Search by complaint ID or permitted text fields.
-   Filter by date, category, department, channel and status.
-   Sort by date, status or priority.
-   Pagination.
-   Clear empty, loading and error states.

### D. Complaint detail

Display:

-   Complaint ID and current status.
-   Submission channel and timestamp.
-   Original complaint text and language.
-   Optional translated summary, clearly labelled.
-   Category and department.
-   Assignment information.
-   Timeline of status changes.
-   Action-taken notes.
-   Status update and assignment controls for authorised roles.

### E. Assisted complaint registration

Design this screen for speed and accessibility:

-   Large, clearly labelled inputs.
-   Language selector near the top.
-   Category selector with plain-language labels.
-   Description field.
-   Optional contact number and consent control.
-   Hospital/department selection where required.
-   Review-and-confirm step.
-   Prominent "Submit complaint" action.
-   Success screen with large complaint ID and print/copy option.

### F. Officer dashboard

-   Assigned complaints.
-   New and unacknowledged complaints.
-   In-progress complaints.
-   Pending follow-ups.
-   Complaint detail and action update.
-   Clear indication of due or overdue follow-up.

### G. Follow-up queue

-   Separate pending and overdue sections.
-   Complaint age and last update.
-   Assigned officer and department.
-   Escalation state.
-   Action to remind, reassign or escalate, according to permissions.

## 2.7 Component styling

### Buttons

-   Primary: dark teal (`#081F26`) with white text.
-   Secondary: white or transparent with a visible border.
-   Destructive: semantic danger colour.
-   Minimum interactive height: 44px.
-   Use clear verbs: "Register complaint", "Assign officer", "Update
    status".

### Cards

-   White surface.
-   Subtle border.
-   10--14px corner radius.
-   Soft, restrained shadow only when needed.
-   Consistent internal padding (16--24px).

### Forms

-   Persistent labels above fields.
-   Clear required/optional indicators.
-   Helpful validation messages near the relevant field.
-   Never rely only on placeholder text as a label.
-   Provide a visible keyboard focus state.
-   Use native input semantics and accessible error descriptions.

### Status badges

Suggested labels:

-   Submitted -- neutral
-   Acknowledged -- informational
-   Assigned -- informational
-   In Progress -- blue/informational
-   Needs Review -- warning
-   Pending / Overdue -- warning or danger as appropriate
-   Resolved -- success
-   Closed -- neutral/success
-   Reopened -- warning

Always show the status text, not just a coloured dot.

### Tables and charts

-   Use clear column headings and readable row spacing.
-   Keep actions consistent in the final column.
-   Provide empty states with a useful next action.
-   Charts must include titles, labels and accessible summaries.
-   Do not use colour as the only way to distinguish chart series.

## 2.8 Accessibility requirements

-   Meet WCAG 2.2 AA as a design target.
-   Ensure text/background contrast is sufficient.
-   Support keyboard navigation and visible focus.
-   Use semantic headings, labels and buttons.
-   Provide accessible names for icon-only controls.
-   Use large touch targets, preferably at least 44 × 44 CSS pixels.
-   Support zoom and reflow on narrow screens.
-   Test Kannada font rendering and line wrapping.
-   Use simple language and avoid technical terms in citizen-facing
    flows.
-   Voice prompts should be short, spoken clearly and repeatable.
-   Provide a fallback to assisted registration when voice recognition
    is unsuccessful.

## 2.9 Starter CSS design tokens

``` css
:root {
  --color-primary: #081F26;
  --color-surface: #E8E9EA;
  --color-muted: #92989B;
  --color-text-secondary: #5F6464;
  --color-border: #ADBCCB;

  --color-page: #F7F9FA;
  --color-card: #FFFFFF;
  --color-success: #247A57;
  --color-warning: #A96812;
  --color-danger: #B33A3A;
  --color-info: #356B8C;
  --color-focus: #2D7884;

  --font-sans: "Inter", "Noto Sans Kannada", system-ui, sans-serif;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  --shadow-card: 0 2px 10px rgba(8, 31, 38, 0.05);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  color: var(--color-primary);
  background: var(--color-page);
  line-height: 1.5;
}

.card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  box-shadow: var(--shadow-card);
}

.button-primary {
  min-height: 44px;
  padding: 10px 18px;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #FFFFFF;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.button-primary:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .desktop-sidebar {
    display: none;
  }
}
```

------------------------------------------------------------------------

# 3. Technology Stack

## 3.1 Recommended stack

The following is a proposed stack for a student prototype. It is a
practical recommendation, not a requirement stated by the problem
statement.

  --------------------------------------------------------------------------
  Layer                   Recommended technology     Purpose
  ----------------------- -------------------------- -----------------------
  Frontend                React + Vite + TypeScript  Responsive web
                                                     application and
                                                     dashboards

  UI styling              Tailwind CSS + reusable    Consistent styling and
                          components                 responsive layouts

  Charts                  Recharts                   Complaint trends and
                                                     category analytics

  Backend                 Python FastAPI             REST APIs, validation
                                                     and application logic

  Database                PostgreSQL                 Structured complaint,
                                                     user, department and
                                                     audit data

  ORM / database access   SQLAlchemy                 Database models and
                                                     queries

  Authentication          JWT + password hashing     Secure staff login and
                                                     role-based access

  Voice / IVR             Exotel or Twilio, subject  Incoming calls and IVR
                          to availability and        workflow
                          regional support           

  Speech-to-text          A Kannada-capable ASR      Convert caller speech
                          service, evaluated before  into text
                          selection                  

  Text-to-speech          Kannada-capable TTS        Spoken prompts and
                          service                    acknowledgements

  Language processing     Rule-based categorisation  Suggest category and
                          first; optional            translated summary
                          multilingual NLP/LLM       
                          assistance                 

  Notifications           SMS provider integrated    Complaint
                          with the                   acknowledgement and
                          telephony/communications   status updates
                          layer                      

  API documentation       FastAPI OpenAPI / Swagger  Test and document
                          UI                         backend endpoints

  Version control         Git + GitHub               Source control and
                                                     collaboration

  Deployment              Vercel (frontend) +        Prototype hosting
                          Render/Railway or          
                          equivalent (API) + managed 
                          PostgreSQL                 
  --------------------------------------------------------------------------

**Important selection note:** Before committing to a speech or telephony
provider, test Kannada recognition quality, Kannada voice quality,
Indian phone-number support, incoming-call setup, pricing, latency,
webhook support and data-handling terms. Provider capabilities and
availability can change. Keep these services behind an adapter so the
project can switch providers without rewriting complaint-management
logic.

## 3.2 Proposed system architecture

``` text
                  CITIZEN / PATIENT / VISITOR
                            |
             +--------------+--------------+
             |                             |
        Phone call                   Hospital help desk
             |                             |
        IVR / Telephony                 Web application
             |                             |
       Kannada voice flow             Assisted form
             |                             |
       Speech-to-text                       |
             |                             |
       Transcript / confirmation           |
             +--------------+--------------+
                            |
                     FASTAPI BACKEND
                            |
       +--------------------+--------------------+
       |                    |                    |
 Complaint service   Categorisation service   Notification service
       |                    |                    |
       |              Rules / optional NLP       |
       |                    |                    |
       +--------------------+--------------------+
                            |
                       PostgreSQL
                            |
       +--------------------+--------------------+
       |                    |                    |
 Admin dashboard      Officer dashboard     Follow-up engine
       |                    |                    |
       +--------------------+--------------------+
                            |
                  Status / action history
```

## 3.3 Backend service responsibilities

### Authentication service

-   Staff login and logout.
-   Password hashing and verification.
-   JWT creation and validation.
-   Role and permission checks.

### Complaint service

-   Create complaint.
-   Generate complaint ID.
-   Fetch complaint details.
-   Search, filter and paginate complaints.
-   Update category and assignment.
-   Validate status transitions.
-   Store status history.

### Voice integration service

-   Receive telephony webhooks.
-   Manage call/session identifiers.
-   Handle IVR selection and call steps.
-   Send audio to the configured speech service.
-   Store transcript and language metadata.
-   Handle failed transcription and retry/fallback.
-   Avoid treating an incomplete call as a successfully submitted
    complaint.

### Categorisation and routing service

-   Apply deterministic keyword/rule mapping for the MVP.
-   Suggest a department from the selected category.
-   Send uncertain cases to a manual review queue.
-   Optionally call an NLP/LLM service for suggestions.
-   Store the final human-confirmed category and assignment.

### Notification service

-   Send acknowledgement and status notifications.
-   Record provider response and delivery status.
-   Retry transient failures safely.
-   Avoid duplicate messages through idempotency controls.

### Follow-up service

-   Find complaints beyond configured pending thresholds.
-   Mark cases for follow-up.
-   Notify or flag responsible officers.
-   Record escalation history.

## 3.4 Suggested API endpoints

  -----------------------------------------------------------------------------------------
  Method                  Endpoint                                  Purpose
  ----------------------- ----------------------------------------- -----------------------
  POST                    `/api/auth/login`                         Staff login

  GET                     `/api/auth/me`                            Current user and role

  POST                    `/api/complaints`                         Create a complaint
                                                                    through assisted
                                                                    registration

  GET                     `/api/complaints`                         List, search and filter
                                                                    complaints

  GET                     `/api/complaints/{complaint_id}`          Complaint details and
                                                                    history

  PATCH                   `/api/complaints/{complaint_id}/status`   Update complaint status

  PATCH                   `/api/complaints/{complaint_id}/assign`   Assign or reassign
                                                                    complaint

  POST                    `/api/complaints/{complaint_id}/notes`    Add an action-taken
                                                                    note

  GET                     `/api/dashboard/summary`                  Dashboard metrics

  GET                     `/api/dashboard/trends`                   Complaint trend data

  GET                     `/api/follow-ups`                         Pending and overdue
                                                                    queue

  POST                    `/api/voice/webhook`                      Receive telephony
                                                                    provider events

  POST                    `/api/notifications/test`                 Admin-only notification
                                                                    test endpoint
  -----------------------------------------------------------------------------------------

Protect all staff endpoints with authentication and role-based
permissions. Telephony webhooks should be verified using the provider's
supported signature or authentication mechanism.

## 3.5 Suggested project structure

``` text
hospital-grievance-system/
|
|-- frontend/
|   |-- src/
|   |   |-- assets/
|   |   |-- components/
|   |   |-- layouts/
|   |   |-- pages/
|   |   |   |-- Login/
|   |   |   |-- Dashboard/
|   |   |   |-- Complaints/
|   |   |   |-- AssistedRegistration/
|   |   |   |-- FollowUps/
|   |   |   |-- Settings/
|   |   |-- services/
|   |   |-- hooks/
|   |   |-- i18n/
|   |   |-- styles/
|   |   |-- types/
|   |   |-- App.tsx
|   |   |-- main.tsx
|   |-- package.json
|
|-- backend/
|   |-- app/
|   |   |-- api/
|   |   |-- core/
|   |   |-- models/
|   |   |-- schemas/
|   |   |-- services/
|   |   |   |-- complaint_service.py
|   |   |   |-- voice_service.py
|   |   |   |-- categorisation_service.py
|   |   |   |-- notification_service.py
|   |   |   |-- followup_service.py
|   |   |-- integrations/
|   |   |-- database/
|   |   |-- main.py
|   |-- tests/
|   |-- requirements.txt
|
|-- docs/
|   |-- PRD.md
|   |-- API.md
|
|-- .env.example
|-- .gitignore
|-- README.md
```

## 3.6 Environment variables

Keep secrets out of source control. Example names:

``` env
APP_ENV=development
DATABASE_URL=
JWT_SECRET_KEY=
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

TELEPHONY_PROVIDER=
TELEPHONY_ACCOUNT_ID=
TELEPHONY_AUTH_TOKEN=
TELEPHONY_PHONE_NUMBER=

SPEECH_TO_TEXT_PROVIDER=
SPEECH_TO_TEXT_API_KEY=
TEXT_TO_SPEECH_PROVIDER=
TEXT_TO_SPEECH_API_KEY=

SMS_PROVIDER=
SMS_API_KEY=
SMS_SENDER_ID=

FRONTEND_URL=
```

Use `.env.example` with blank or placeholder values in the repository.
Never commit real API keys, passwords, tokens or personal complaint
data.

## 3.7 Security and privacy considerations

-   Use HTTPS in deployed environments.
-   Hash passwords using a modern password-hashing algorithm such as
    Argon2id or bcrypt.
-   Enforce role-based access on the backend, not only by hiding
    frontend buttons.
-   Validate and sanitise all user input.
-   Verify telephony webhook signatures where supported.
-   Restrict access to complaint details by role and hospital/department
    scope.
-   Collect contact information only when necessary and record consent.
-   Avoid collecting unnecessary medical details.
-   Define retention and deletion rules for call recordings and
    transcripts before enabling recording.
-   Encrypt sensitive data in transit and use managed database
    encryption at rest where available.
-   Keep audit records for assignment, status, access-sensitive and
    administrative changes.
-   Use synthetic data for demos and screenshots.
-   Direct emergency-related callers to hospital staff or emergency
    services; do not put emergency requests into the ordinary grievance
    queue.

## 3.8 Testing strategy

### Functional testing

-   Assisted complaint submission.
-   Unique complaint ID generation.
-   Category and department routing.
-   Role-based access.
-   Status transition validation.
-   Complaint history.
-   Pending and overdue detection.
-   Notification success and failure handling.

### Voice-flow testing

-   Kannada language selection.
-   Clear and noisy speech samples.
-   Different accents and speaking speeds.
-   Silence, interruption and call disconnection.
-   Incorrect or low-confidence transcription.
-   Caller correction and repeat prompts.
-   Provider webhook retries and duplicate events.

### Accessibility and UI testing

-   Keyboard-only navigation.
-   Screen-reader labels.
-   Contrast and focus visibility.
-   Responsive layouts.
-   Kannada text rendering.
-   Tablet-based assisted registration.

### Security testing

-   Unauthorised access to complaint records.
-   Cross-role access attempts.
-   Invalid or expired JWTs.
-   Input validation.
-   Webhook signature validation.
-   Secret leakage checks.

------------------------------------------------------------------------

# 4. Recommended Prototype Milestones

  -----------------------------------------------------------------------
  Phase                               Deliverable
  ----------------------------------- -----------------------------------
  Phase 1                             Finalise user roles, complaint
                                      lifecycle, categories and
                                      wireframes

  Phase 2                             Build frontend shell, login,
                                      assisted registration and complaint
                                      list

  Phase 3                             Build FastAPI services, PostgreSQL
                                      schema and complaint ID generation

  Phase 4                             Implement categorisation, routing,
                                      officer assignment and status
                                      history

  Phase 5                             Build dashboard metrics, pending
                                      queue and follow-up indicators

  Phase 6                             Add Kannada interface and
                                      integrate/test the selected IVR and
                                      speech services

  Phase 7                             Test end-to-end workflow,
                                      accessibility, security and failure
                                      cases

  Phase 8                             Deploy prototype and prepare
                                      registration-to-resolution
                                      demonstration
  -----------------------------------------------------------------------

For a short hackathon timeline, prioritise a reliable end-to-end
complaint lifecycle first. Treat live telephony and production-grade
Kannada speech recognition as integration work with provider
dependencies; do not let an unverified external service block the core
demonstrable workflow.

# 5. Demonstration Scenario

Use synthetic data and a fictional hospital.

1.  A visitor reports in Kannada that prescribed medicines are
    unavailable.
2.  The grievance is submitted through the voice flow or
    assisted-registration screen.
3.  The system generates a complaint ID.
4.  The complaint is categorised as **Medicine Availability**.
5.  It is routed to the configured department or review queue.
6.  The administrator sees it in the dashboard.
7.  The responsible officer opens the complaint and changes its status
    to **In Progress**.
8.  The officer records an action-taken update.
9.  The officer submits a resolution update.
10. The dashboard reflects the updated status and history.

The demonstration should show the same complaint record moving through
the full lifecycle, rather than presenting disconnected screens.

# 6. Assumptions and Decisions to Validate

-   The first prototype is configured for one demonstration hospital.
-   Kannada is the first required local language.
-   The initial categories follow the supplied problem statement.
-   Department mapping and escalation thresholds are configurable and
    must be validated with the hospital.
-   The telephony provider, speech recognition and text-to-speech
    services have not yet been selected or tested.
-   SMS is an optional acknowledgement channel, not a prerequisite for
    reporting.
-   A citizen must be able to report without owning a smartphone.
-   The system handles non-emergency service grievances only.
-   The prototype uses synthetic complaint data unless authorised
    real-world data is provided.

# 7. Reference

-   **Problem statement:** SOLVATHON 2026 -- PS1, *Accessible
    Voice-Based Public Grievance & Hospital Service Monitoring System*
    (user-provided PDF).
-   **Visual inspiration:** [Hospital management software landing page
    -- Anjum Jarif / Jumatechs,
    Dribbble](https://dribbble.com/shots/26038656-Hospital-management-software-landing-Landing-Page-Design).

------------------------------------------------------------------------

**End of document**
