# Jharkhand Societal Innovation Collaboration Portal
## Complete Technical Change Document — Prototype Build

**Base Codebase:** inCamp (GCET Hackathon Platform)  
**Target:** State-level citizen → university → industry innovation pipeline  
**Prototype Rule:** No email verification required

---

## Table of Contents

1. [Auth & User Roles](#1-auth--user-roles)
2. [Database Schema Changes](#2-database-schema-changes)
3. [New Pages to Build](#3-new-pages-to-build)
4. [Existing Pages to Modify](#4-existing-pages-to-modify)
5. [New Components to Build](#5-new-components-to-build)
6. [Existing Components to Modify](#6-existing-components-to-modify)
7. [Supabase Edge Functions (AI + Notifications)](#7-supabase-edge-functions)
8. [Routing Changes](#8-routing-changes)
9. [Branding & Content Changes](#9-branding--content-changes)
10. [Build Order & Priority](#10-build-order--priority)

---

## 1. Auth & User Roles

### 1.1 Remove Email Restriction
**File:** `src/pages/Auth.tsx`  
**Change:** Remove the `validateGcetEmail` function and its `.refine()` call from `signupSchema`.  
Accept **any valid email** for prototype.

```diff
- const validateGcetEmail = (email: string) => {
-   const gcetEmailRegex = /^[a-zA-Z0-9._%+-]+@gcet\.edu\.in$/;
-   return gcetEmailRegex.test(email);
- };

  const signupSchema = z.object({
    email: z.string()
      .email("Please enter a valid email address")
-     .refine(validateGcetEmail, {
-       message: "Only GCET college email IDs are allowed for registration.",
-     }),
    ...
  });
```

### 1.2 Remove Email Verification (Prototype)
**File:** `src/contexts/AuthContext.tsx`  
**Change:** In the `signUp` function, remove `emailRedirectTo`. Supabase will not send a verification email.  
Also in **Supabase Dashboard** → Authentication → Settings → disable "Enable email confirmations".

### 1.3 New User Roles
**File:** `src/integrations/supabase/types.ts` + DB  
Add new values to the `app_role` enum:

| Role | Who |
|---|---|
| `citizen` | Anyone who submits a problem (optional login) |
| `university_admin` | Admin of a university tenant |
| `faculty_mentor` | Faculty who mentors a project |
| `industry_partner` | Company/startup representative |
| `govt_officer` | State/district government official |
| `platform_admin` | Overall Jharkhand portal super-admin |

**SQL to run:**
```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'citizen';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'university_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'faculty_mentor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'industry_partner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'govt_officer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';
```

### 1.4 Role-Based Signup
**File:** `src/pages/Auth.tsx`  
Add a **"I am a..."** dropdown on the signup form:
- Student / Researcher
- Faculty / Mentor
- Industry / Startup
- Government Official

Set the selected role in `user_roles` table after signup. Citizens don't need to sign up at all — problem submission is public.

### 1.5 Role-Based Post-Login Routing
**File:** `src/pages/Auth.tsx` → `routeUserAfterLogin()`  
Extend the routing logic:

| Role | Redirect To |
|---|---|
| `platform_admin` | `/admin` |
| `university_admin` | `/:tenantSlug/university-dashboard` |
| `faculty_mentor` | `/:tenantSlug/projects` |
| `industry_partner` | `/:tenantSlug/industry-portal` |
| `govt_officer` | `/:tenantSlug/analytics` |
| `student` | `/:tenantSlug/` |

---

## 2. Database Schema Changes

### 2.1 Extend `profiles` Table
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS year TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS organization TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'student';
```

### 2.2 New: `citizen_submissions` Table
This is the **core new table** — replaces admin-created problem statements as the primary input source.

```sql
CREATE TABLE public.citizen_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Problem details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  detailed_description TEXT,
  domain TEXT NOT NULL,           -- education, health, agriculture, water, sanitation, etc.
  sub_domain TEXT,
  category TEXT DEFAULT 'General',

  -- Location
  location_state TEXT DEFAULT 'Jharkhand',
  location_district TEXT,
  location_block TEXT,
  location_village TEXT,
  location_gps TEXT,              -- "lat,lng" string

  -- Submitter info (no login required)
  submitter_type TEXT NOT NULL,   -- individual, ngo, panchayat, govt_dept, urban_local_body
  submitter_name TEXT NOT NULL,
  submitter_contact TEXT,         -- phone or email
  submitter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- if logged in

  -- Media & documents
  photo_urls TEXT[],
  video_urls TEXT[],
  document_urls TEXT[],

  -- AI processing
  ai_category TEXT,
  ai_confidence NUMERIC,
  ai_duplicate_of UUID REFERENCES public.citizen_submissions(id) ON DELETE SET NULL,
  ai_processed_at TIMESTAMP WITH TIME ZONE,

  -- Workflow status
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending → validated → assigned → in_progress → completed → archived

  -- Assignment
  assigned_university_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Metadata
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- platform tenant
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.citizen_submissions ENABLE ROW LEVEL SECURITY;

-- Public can submit
CREATE POLICY "Anyone can submit a problem"
  ON public.citizen_submissions FOR INSERT
  WITH CHECK (true);

-- Public can view validated+
CREATE POLICY "Anyone can view validated submissions"
  ON public.citizen_submissions FOR SELECT
  USING (status NOT IN ('pending') OR submitter_user_id = auth.uid());

-- Admins manage all
CREATE POLICY "Admins manage all submissions"
  ON public.citizen_submissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platform_admin'));
```

### 2.3 New: `university_projects` Table
When a university accepts a submission, a project is created.

```sql
CREATE TABLE public.university_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.citizen_submissions(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  faculty_mentor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  title TEXT,
  status TEXT NOT NULL DEFAULT 'accepted',
  -- accepted → proposal_submitted → approved → in_progress → completed

  proposal_url TEXT,
  proposal_submitted_at TIMESTAMP WITH TIME ZONE,
  proposal_approved_at TIMESTAMP WITH TIME ZONE,

  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,

  outcome_summary TEXT,
  ip_filed BOOLEAN DEFAULT false,
  startup_created BOOLEAN DEFAULT false,
  people_benefited INTEGER,
  villages_covered INTEGER,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.university_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "University members can view their projects"
  ON public.university_projects FOR SELECT
  USING (university_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins manage all projects"
  ON public.university_projects FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platform_admin'));
```

### 2.4 New: `project_milestones` Table
```sql
CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.university_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed, overdue
  evidence_url TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone in project can view milestones"
  ON public.project_milestones FOR SELECT USING (true);
CREATE POLICY "Admins manage milestones"
  ON public.project_milestones FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
```

### 2.5 New: `project_team_members` Table
```sql
CREATE TABLE public.project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.university_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student',   -- student, faculty, industry_mentor
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view team members" ON public.project_team_members FOR SELECT USING (true);
CREATE POLICY "Admins manage team members" ON public.project_team_members FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
```

### 2.6 New: `industry_partners` Table
```sql
CREATE TABLE public.industry_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  organization_type TEXT,   -- startup, MSME, CSR, research_lab, corporation
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  domains_of_interest TEXT[],
  website TEXT,
  is_verified BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.industry_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view partners" ON public.industry_partners FOR SELECT USING (true);
CREATE POLICY "Partners manage own profile" ON public.industry_partners FOR ALL
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
```

### 2.7 New: `industry_project_links` Table
```sql
CREATE TABLE public.industry_project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.university_projects(id) ON DELETE CASCADE,
  industry_partner_id UUID NOT NULL REFERENCES public.industry_partners(id) ON DELETE CASCADE,
  type TEXT NOT NULL,   -- mentor, funder, co_developer, pilot_host
  status TEXT NOT NULL DEFAULT 'interested',   -- interested, confirmed, active, completed
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.industry_project_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view partnerships" ON public.industry_project_links FOR SELECT USING (true);
CREATE POLICY "Admins manage partnerships" ON public.industry_project_links FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
```

### 2.8 New: `notifications` Table
```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,   -- submission_received, submission_validated, project_assigned, etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
```

### 2.9 New: `submission_comments` Table
```sql
CREATE TABLE public.submission_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.citizen_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,   -- internal = only admins/reviewers see it
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.submission_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can comment"
  ON public.submission_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can view public comments"
  ON public.submission_comments FOR SELECT USING (is_internal = false OR public.has_role(auth.uid(), 'admin'));
```

### 2.10 Extend `universities` (tenants) Table
```sql
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS university_type TEXT,    -- central, state, deemed, private
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS expertise_domains TEXT[],
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

### 2.11 New: `contest_settings` Extension
Add submission-control settings:
```sql
ALTER TABLE public.contest_settings
  ADD COLUMN IF NOT EXISTS submission_open BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_submissions_per_day INTEGER,
  ADD COLUMN IF NOT EXISTS allowed_domains TEXT[];
```

---

## 3. New Pages to Build

### 3.1 `SubmitProblem.tsx`
**Route:** `/:tenantSlug/submit` (also accessible publicly at `/submit`)  
**Access:** Public — no login required  
**Purpose:** Citizen problem submission form

**Fields:**
- Problem Title (required)
- Domain (dropdown): Education, Healthcare, Agriculture, Water Management, Sanitation, Environment, Rural Livelihoods, Accessibility, Urban Infrastructure, Public Services
- Sub-domain (text)
- Problem Description (textarea, min 100 words)
- Detailed Description (rich textarea)
- Submitter Type (dropdown): Individual, NGO/Community Org, Panchayat, Urban Local Body, Govt Dept
- Submitter Name (required)
- Contact (phone or email)
- Location — State (fixed: Jharkhand), District (dropdown), Block (text), Village (text)
- Photo Upload (up to 5 images)
- Video Upload (up to 2 videos, max 50MB each)
- Document Upload (PDF/DOC, up to 3 files)
- Optional: Login prompt ("Already have an account? Link your submission to your profile")

**On Submit:**
- Insert into `citizen_submissions`
- Trigger AI categorization edge function
- Show confirmation with tracking ID

---

### 3.2 `TrackSubmission.tsx`
**Route:** `/:tenantSlug/track/:submissionId`  
**Access:** Public  
**Purpose:** Citizens track their submission status without logging in

**Shows:**
- Current status with timeline (Submitted → Validated → Assigned → In Progress → Completed)
- Assigned university (once assigned)
- Public comments from reviewers
- Any requests for more information

---

### 3.3 `UniversityDashboard.tsx`
**Route:** `/:tenantSlug/university-dashboard`  
**Access:** `university_admin`, `faculty_mentor`  
**Purpose:** University-side view of all assigned problems and projects

**Sections:**
- Assigned submissions queue (new ones needing acceptance/rejection)
- Active projects (with milestone status)
- Completed projects
- Team management
- Stats: accepted/rejected/completed counts

---

### 3.4 `ProjectWorkspace.tsx`
**Route:** `/:tenantSlug/projects/:projectId`  
**Access:** Project team members, faculty mentor, university admin  
**Purpose:** Full project management workspace

**Features:**
- Project info + linked submission
- Team members (add/remove)
- Milestones (create, mark complete, upload evidence)
- Proposal document upload
- Industry partner linking
- Progress timeline
- Comments/discussion thread
- Export project report

---

### 3.5 `IndustryPortal.tsx`
**Route:** `/:tenantSlug/industry-portal`  
**Access:** `industry_partner`, `admin`  
**Purpose:** Industry/startup view to browse problems and offer support

**Features:**
- Browse validated, in-progress problems by domain
- Filter by district, domain, project status
- "Express Interest" button → links partner to project
- My Partnerships — see all active engagements
- Register as Industry Partner (profile form)

---

### 3.6 `GovtAnalytics.tsx`
**Route:** `/:tenantSlug/analytics`  
**Access:** `govt_officer`, `platform_admin`, `admin`  
**Purpose:** Government-facing analytics dashboard

**Widgets:**
- Total submissions (by day/week/month)
- District-wise submission heatmap (table/chart, not map for prototype)
- Domain-wise pie chart
- University participation count + table
- Industry engagement count
- Project completion rate
- Social impact summary (people benefited, villages covered, IPs filed)
- Top districts by problem density
- Export to CSV button

---

### 3.7 `ProblemDiscovery.tsx`
**Route:** `/:tenantSlug/problems` (replace existing Problems page)  
**Access:** Public  
**Purpose:** Public searchable list of all validated citizen submissions

**Features:**
- Search bar
- Domain filter
- District filter
- Status filter (validated / assigned / in-progress / completed)
- Problem cards with submitter type, location, domain badge
- Click → view full problem detail + public comments
- University assigned badge (if assigned)
- "This affects me too" upvote button (no login needed)

---

### 3.8 `PlatformAdminDashboard.tsx`
**Route:** `/platform-admin` (no tenant prefix)  
**Access:** `platform_admin`  
**Purpose:** Super-admin for the whole Jharkhand platform

**Features:**
- Manage tenants (universities) — add, edit, activate/deactivate
- View all submissions across all tenants
- AI routing queue — submissions awaiting assignment
- Manually assign submission to a university
- User management across all tenants
- Platform-wide analytics

---

## 4. Existing Pages to Modify

### 4.1 `Auth.tsx`
| Change | Detail |
|---|---|
| Remove GCET email restriction | Accept any email |
| Remove email verification redirect | No `emailRedirectTo` |
| Add role selector on signup | Dropdown: Student, Faculty, Industry, Govt Officer |
| Store selected role | Insert into `user_roles` after signup |
| Extend post-login routing | Route by new roles as described in Section 1.5 |

### 4.2 `Problems.tsx` (→ becomes `ProblemDiscovery.tsx`)
| Change | Detail |
|---|---|
| Source | Read from `citizen_submissions` instead of `problem_statements` |
| Filters | Add district filter, status filter |
| Card design | Show submitter type, district, domain badge |
| Admin actions | Replace "Edit/Delete" with "Validate / Assign to University / Reject" |
| Remove | Team registration CTA completely |
| Add | "Track Your Submission" link |

### 4.3 `AdminDashboard.tsx`
| Change | Detail |
|---|---|
| Rename | "Platform Admin" or "Review Dashboard" |
| Add section | Submission Review Queue (pending → validate/assign/reject) |
| Add section | AI Routing Suggestions |
| Add section | University assignment panel |
| Modify stats | Replace "team registrations" stats with submission pipeline stats |
| Add chart | District-wise bar chart |
| Add chart | Domain-wise breakdown |
| Keep | User management, theme management |
| Remove | Team form dialog |

### 4.4 `Registration.tsx`
| Change | Detail |
|---|---|
| Purpose change | Convert to "University Project Proposal" submission for faculty |
| Form | Team name, problem reference, proposal summary, timeline, faculty mentor |
| Remove | Student hackathon-specific fields (roll number, etc.) |
| Route | Move to `/:tenantSlug/submit-proposal/:submissionId` |

### 4.5 `About.tsx`
| Change | Detail |
|---|---|
| Default content | Update to describe Jharkhand Innovation Portal, not inCamp |
| Keep | All CMS editing capability (admin can update) |

### 4.6 `Profile.tsx`
| Change | Detail |
|---|---|
| Add fields | Organization, designation, district, phone |
| Add section | "My Submissions" — list of citizen submissions by logged-in user |
| Add section | "My Projects" — list of university projects user is part of |

### 4.7 `Departments.tsx`
| Change | Detail |
|---|---|
| Repurpose | Becomes "Domain Review" — shows citizen submissions by domain, awaiting dept review |
| Remove | Problem statement remarks (or adapt for submission comments) |

### 4.8 `index.html`
```html
<!-- Change title -->
<title>Jharkhand Innovation Portal</title>
<meta name="description" content="Connect societal challenges with academic institutions and industry partners across Jharkhand." />
```

---

## 5. New Components to Build

### 5.1 `SubmissionCard.tsx`
Reusable card for displaying a `citizen_submission`:
- Domain badge (colored by domain)
- District + submitter type tag
- Status badge
- Upvote count
- "View Details" button

### 5.2 `SubmissionStatusTimeline.tsx`
Visual step-by-step timeline:
Submitted → Validated → Assigned → In Progress → Completed

### 5.3 `AssignUniversityDialog.tsx`
Admin dialog to:
- See AI suggestion
- Select university from dropdown
- Confirm assignment → updates `citizen_submissions.assigned_university_id`

### 5.4 `MilestoneTracker.tsx`
Project milestone list with:
- Status badges
- Due dates
- Evidence upload button
- Mark complete action

### 5.5 `IndustryPartnerCard.tsx`
Card showing:
- Organization name + type
- Domains of interest
- Contact info
- Partnership type badge

### 5.6 `NotificationBell.tsx`
Navbar icon with:
- Unread count badge
- Dropdown list of recent notifications
- Mark all read button
- Click → navigate to linked resource

### 5.7 `DomainBadge.tsx`
Color-coded badge for problem domains:
- Education → Blue
- Healthcare → Red
- Agriculture → Green
- Water → Cyan
- Sanitation → Orange
- Environment → Emerald
- Rural Livelihoods → Yellow
- Accessibility → Purple
- Urban Infrastructure → Gray
- Public Services → Indigo

### 5.8 `DistrictFilter.tsx`
Dropdown with all 24 Jharkhand districts for filtering:
Ranchi, Dhanbad, Bokaro, Deoghar, Dumka, East Singhbhum, Garhwa, Giridih, Godda,
Gumla, Hazaribagh, Jamtara, Khunti, Koderma, Latehar, Lohardaga, Pakur, Palamu,
Ramgarh, Sahebganj, Seraikela-Kharsawan, Simdega, West Singhbhum, Chatra

---

## 6. Existing Components to Modify

### 6.1 `src/components/layout/Layout.tsx` and `Navbar`
- Add **Notification Bell** to navbar (for logged-in users)
- Add **"Submit a Problem"** CTA button in navbar (public-facing)
- Remove inCamp-specific branding text
- Update nav links: Home | Problems | Submit | Events | Resources | Contact

### 6.2 `src/components/layout/Footer.tsx`
- Update platform name to "Jharkhand Innovation Portal"
- Update copyright line

### 6.3 `src/components/admin/ProblemFormDialog.tsx`
- Repurpose to edit `citizen_submissions` (not admin-created `problem_statements`)
- Add fields: district, submitter type, location fields
- Add status change action

### 6.4 `src/components/home/HeroSection.tsx`
- Update headline + subtitle to reflect Jharkhand portal
- Update CTA button: "Submit a Problem" → `/submit`
- Keep editable via CMS

---

## 7. Supabase Edge Functions

### 7.1 `ai-categorize-submission`
**Trigger:** After insert on `citizen_submissions`  
**Action:**
1. Read `title + description`
2. Call Gemini API with prompt:
   ```
   Classify this problem into one of these domains:
   education, healthcare, agriculture, water_management, sanitation,
   environment, rural_livelihoods, accessibility, urban_infrastructure, public_services
   
   Return JSON: { "domain": "...", "confidence": 0.0-1.0, "sub_domain": "..." }
   ```
3. Update `citizen_submissions` with `ai_category`, `ai_confidence`, `ai_processed_at`
4. Check for duplicates using text similarity
5. If confidence > 0.85, auto-update `domain` field

### 7.2 `send-notification`
**Trigger:** Called manually or via DB trigger  
**Action:**
- Insert into `notifications` table
- Optionally send email via Resend/SendGrid (for prototype, skip email — only in-app)

### 7.3 `assign-university` (optional AI routing)
**Trigger:** When admin clicks "AI Suggest"  
**Action:**
1. Read submission domain + description
2. Query `tenants` table for universities with matching `expertise_domains`
3. Return ranked list of suggestions

---

## 8. Routing Changes

### 8.1 Add New Routes in `App.tsx`

```tsx
// New public routes
<Route path="submit" element={<SubmitProblem />} />
<Route path="track/:submissionId" element={<TrackSubmission />} />
<Route path="problems/:id" element={<SubmissionDetail />} />

// New authenticated routes
<Route path="university-dashboard" element={
  <ProtectedRoute requireRole="university_admin">
    <UniversityDashboard />
  </ProtectedRoute>
} />
<Route path="projects/:projectId" element={
  <ProtectedRoute>
    <ProjectWorkspace />
  </ProtectedRoute>
} />
<Route path="industry-portal" element={
  <ProtectedRoute requireRole="industry_partner">
    <IndustryPortal />
  </ProtectedRoute>
} />
<Route path="analytics" element={
  <ProtectedRoute requireRole="govt_officer">
    <GovtAnalytics />
  </ProtectedRoute>
} />
<Route path="submit-proposal/:submissionId" element={
  <ProtectedRoute>
    <Registration />  {/* repurposed */}
  </ProtectedRoute>
} />
```

### 8.2 Update `ProtectedRoute.tsx`
Currently only checks for `requireAdmin`. Extend to accept `requireRole` prop.

```tsx
interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireRole?: string;   // NEW
}
```

---

## 9. Branding & Content Changes

| Location | Current | New |
|---|---|---|
| `index.html` title | inCamp | Jharkhand Innovation Portal |
| `Footer.tsx` name | inCamp | Jharkhand Innovation Portal |
| `Footer.tsx` copyright | Geenovate Foundation | Govt of Jharkhand / HED |
| `About.tsx` default content | inCamp event description | Portal mission & vision |
| `HeroSection.tsx` headline | inCamp tagline | "Turning Jharkhand's Challenges into Innovation" |
| `HeroSection.tsx` CTA | Register Now | Submit a Problem |
| Favicon | inCamp | Jharkhand state emblem |
| Color palette | Keep (can update later) | Add Jharkhand saffron accent |

---

## 10. Build Order & Priority

### Phase 1 — Foundation (Do First)
| # | Task | Files |
|---|---|---|
| 1 | Disable email verification in Supabase Dashboard | Dashboard setting |
| 2 | Remove GCET email restriction from Auth | `Auth.tsx` |
| 3 | Add new roles to DB | SQL migration |
| 4 | Create `citizen_submissions` table | SQL migration |
| 5 | Create `university_projects` table | SQL migration |
| 6 | Create `notifications` table | SQL migration |
| 7 | Extend `profiles` + `tenants` tables | SQL migration |

### Phase 2 — Core Features
| # | Task | Files |
|---|---|---|
| 8 | Build `SubmitProblem.tsx` | New page |
| 9 | Build `TrackSubmission.tsx` | New page |
| 10 | Update `Problems.tsx` to show citizen submissions | Modify page |
| 11 | Build `AssignUniversityDialog.tsx` | New component |
| 12 | Update `AdminDashboard.tsx` with submission queue | Modify page |
| 13 | Build `DomainBadge.tsx` + `DistrictFilter.tsx` | New components |
| 14 | Add role selector to signup | `Auth.tsx` |

### Phase 3 — University & Industry Modules
| # | Task | Files |
|---|---|---|
| 15 | Build `UniversityDashboard.tsx` | New page |
| 16 | Build `ProjectWorkspace.tsx` | New page |
| 17 | Build `MilestoneTracker.tsx` | New component |
| 18 | Build `IndustryPortal.tsx` | New page |
| 19 | Create `project_milestones` + `industry_partners` tables | SQL migration |

### Phase 4 — Analytics & AI
| # | Task | Files |
|---|---|---|
| 20 | Build `GovtAnalytics.tsx` | New page |
| 21 | Build `PlatformAdminDashboard.tsx` | New page |
| 22 | Write `ai-categorize-submission` edge function | Supabase Edge Function |
| 23 | Build `NotificationBell.tsx` | New component |

### Phase 5 — Polish
| # | Task | Files |
|---|---|---|
| 24 | Update branding (Footer, HeroSection, index.html) | Various |
| 25 | Update `About.tsx` content | Page |
| 26 | Update `Profile.tsx` with new fields | Page |
| 27 | Repurpose `Registration.tsx` as proposal form | Page |

---

## Appendix: Jharkhand Districts (24)
Ranchi, Dhanbad, Bokaro, East Singhbhum, West Singhbhum, Hazaribagh, Giridih,
Dumka, Deoghar, Godda, Sahebganj, Pakur, Jamtara, Lohardaga, Gumla, Simdega,
Palamu, Garhwa, Latehar, Chatra, Koderma, Ramgarh, Khunti, Seraikela-Kharsawan

## Appendix: Problem Domains
Education, Healthcare, Agriculture, Water Management, Sanitation, Environment,
Rural Livelihoods, Accessibility, Urban Infrastructure, Public Service Delivery
