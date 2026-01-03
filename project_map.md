# Equity Advance Broker Portal - Project Map

> **External Brain & Long-Term Memory Anchor**

---

## 1. Project Vision

**North Star:** Equity Advance Broker Portal is an automated underwriting and deal management platform that enables mortgage brokers (ISOs) to pre-qualify homeowners for Home Equity Agreements (HEAs) and track deals through the sales pipeline.

---

## 2. Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18.3 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS | Styling |
| tailwindcss-animate | Animations |
| shadcn/ui | Component library (Radix primitives) |
| TanStack React Query | Data fetching & caching |
| React Router DOM v6 | Client-side routing |
| React Hook Form + Zod | Form handling & validation |
| Recharts | Data visualization |

### Backend (Supabase)
| Technology | Purpose |
|------------|---------|
| Supabase Auth | Email/password authentication |
| Supabase Database | PostgreSQL data storage |
| Supabase Edge Functions | Deno runtime serverless functions |

### Third-Party Integrations
| Service | Purpose |
|---------|---------|
| Everflow API | Affiliate tracking, broker onboarding |
| Atom Data API | Property data, AVM valuations |
| Google Maps API | Address autocomplete |

---

## 3. File Topology (Single Source of Truth)

```
src/
├── hooks/
│   ├── useAuth.ts              # Auth state: user, session, isAdmin, userRole, userStatus
│   └── usePipelineDeals.ts     # Pipeline data fetching and stage grouping
├── lib/
│   ├── heaCalculator.ts        # HEA underwriting logic (19.9% cap, eligibility)
│   └── api/atom.ts             # Atom Data API client wrapper
├── components/
│   ├── IsoAuthModal.tsx        # Login/Signup modal with Everflow trigger
│   ├── WizardStep1.tsx         # Property validation (fetches RentCast data)
│   ├── WizardStep2.tsx         # Pre-qualification result, deal creation
│   ├── WizardStep3.tsx         # Settlement estimator display
│   ├── AdminRoute.tsx          # Route guard for admin users
│   ├── ManagerRoute.tsx        # Route guard for manager users
│   └── pipeline/
│       ├── PipelineColumn.tsx  # Pipeline stage column component
│       └── DealCard.tsx        # Individual deal card display
├── pages/
│   ├── Index.tsx               # Homepage with address input
│   ├── Pipeline.tsx            # Deal pipeline Kanban view
│   ├── AdminDashboard.tsx      # User approval management
│   ├── TeamManagement.tsx      # Manager's officer management
│   ├── IsoPending.tsx          # Pending approval waiting page
│   └── OfficerSignup.tsx       # Officer invitation signup
├── contexts/
│   └── WizardContext.tsx       # Underwriting wizard state management
├── integrations/supabase/
│   ├── client.ts               # Supabase client (auto-generated, DO NOT EDIT)
│   └── types.ts                # Database types (auto-generated, DO NOT EDIT)
supabase/
├── functions/
│   ├── onboard-everflow-manager/   # Everflow affiliate creation
│   └── atom-property-lookup/   # Property data API proxy
└── migrations/                     # Database schema migrations (DO NOT EDIT)
```

---

## 4. Data Schema

### profiles Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key, references auth.users |
| email | text | User email |
| full_name | text | Display name |
| role | user_role enum | 'manager' or 'officer' |
| status | user_status enum | 'pending', 'active', 'denied' |
| everflow_id | text | Everflow affiliate ID |
| parent_id | uuid | Officer's parent manager ID |
| invite_token | uuid | Manager's officer invite token |
| cell_phone | text | User phone number |
| company_name | text | Company/brokerage name |
| company_url | text | Company website URL |
| billing_completed | boolean | Billing setup status |
| paperwork_completed | boolean | Paperwork status |
| created_at | timestamptz | Record creation timestamp |
| updated_at | timestamptz | Record update timestamp |
| everflow_user_id | text | Everflow user ID |
| everflow_account_status | text | Everflow account status |
| everflow_network_id | text | Everflow network ID |
| everflow_tracking_domain | text | Everflow tracking domain |
| everflow_api_key | text | Everflow API key |
| everflow_encoded_value | text | Everflow encoded value for links |

### deals Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Deal originator (references profiles.id) |
| property_address | text | Full property address |
| home_value | numeric | Estimated home value |
| mortgage_balance | numeric | Current mortgage balance |
| max_investment | numeric | Max HEA funding amount |
| owner_names | text[] | Property owner names array |
| everflow_event_status | text | Pipeline stage |
| created_at | timestamptz | Record creation timestamp |
| offer_link | text | Everflow tracking URL |

### user_roles Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References auth.users |
| role | app_role enum | 'admin' |
| created_at | timestamptz | Record creation timestamp |

### Enums
| Enum | Values |
|------|--------|
| app_role | admin |
| user_role | manager, officer |
| user_status | pending, active, denied |

### RLS Policies Summary
| Table | Policy |
|-------|--------|
| profiles | Users can view/update own; Admins can view/update/delete all; Insert via auth trigger only |
| deals | Users can CRUD own; Managers can view officer deals; Admins can view/update all |
| user_roles | Users can view own roles; Admins can view all |

### 4.2 Database Wiring (Supabase Infrastructure)

#### Essential Triggers

| Trigger | Table | Fires | Purpose |
|---------|-------|-------|---------|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | Calls `handle_new_user()` to create profile record. Without this trigger, profiles are never created and users cannot access the portal. |
| `trigger_onboard_everflow_manager` | `public.profiles` | AFTER INSERT/UPDATE | Fires `net.http_post()` to the `onboard-everflow-manager` Edge Function when `role = 'manager'` AND `everflow_id IS NULL`. |

#### SQL Functions

| Function | Type | Purpose |
|----------|------|---------|
| `handle_new_user()` | SECURITY DEFINER | Maps `auth.users.raw_user_meta_data` to `public.profiles`. Extracts `full_name`, `cell_phone`, `company_name`. Handles invite token logic: if `invite_token` present, creates officer under parent manager; otherwise creates manager. |
| `has_role(uuid, app_role)` | SECURITY DEFINER | Returns boolean if user has specified role. Used in RLS policies to avoid infinite recursion when checking admin privileges. |
| `trigger_onboard_everflow_manager()` | SECURITY DEFINER | Constructs HTTP POST request with `profile_id` and fires to `onboard-everflow-manager` Edge Function using `net.http_post()`. |
| `update_updated_at_column()` | TRIGGER FUNCTION | Updates `updated_at` timestamp on row modification. |

#### Security and Permissions (RLS)

**Service Role Access:**
Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` to create a Supabase client that bypasses RLS. This is essential for:
- Reading profile data during Everflow onboarding (before user is fully authenticated)
- Writing Everflow credentials back to profiles table
- Accessing profiles regardless of ownership during automated workflows

**Manager/Officer Deal Isolation Policy:**
```sql
-- Policy: "Users can view own deals and managers can view officer deals"
-- Applied to: deals table (SELECT)
USING (
  (auth.uid() = user_id) 
  OR 
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = deals.user_id 
    AND profiles.parent_id = auth.uid()
  ))
)
```
This ensures:
- Officers can only see their own deals
- Managers can see all deals created by their officers (where `profiles.parent_id = manager.id`)
- Neither can see deals from other organizations

**Admin Bypass (God Mode):**
```sql
-- Policy: "Admins can view all deals"
USING (has_role(auth.uid(), 'admin'::app_role))
```
Admin users (like `max@equityadvance.com`) bypass all isolation and see every deal in the system.

---

## 5. Core Workflows

### Workflow A: Broker Signup and Everflow Onboarding

```mermaid
sequenceDiagram
    participant User
    participant IsoAuthModal
    participant Supabase Auth
    participant DB Trigger
    participant Edge Function
    participant Everflow API

    User->>IsoAuthModal: Fill signup form
    IsoAuthModal->>Supabase Auth: Create user
    Supabase Auth->>DB Trigger: handle_new_user
    DB Trigger->>DB Trigger: Create profile (role='manager')
    DB Trigger->>Edge Function: trigger_onboard_everflow_manager
    Edge Function->>Everflow API: Create network affiliate
    Everflow API-->>Edge Function: Return affiliate credentials
    Edge Function->>DB Trigger: Update profile with Everflow data
    User->>IsoPending: Redirect (awaits admin approval)
```

### Workflow B: Property Underwriting Sequence

```mermaid
sequenceDiagram
    participant User
    participant Hero
    participant WizardStep1
    participant Edge Function
    participant RentCast API
    participant WizardStep2
    participant Database

    User->>Hero: Enter property address
    Hero->>WizardStep1: Open wizard
    WizardStep1->>Edge Function: lookupProperty()
    Edge Function->>Atom API: /property/detail
    Edge Function->>Atom API: /attomavm/detail
    Atom API-->>Edge Function: Property data + AVM
    Edge Function-->>WizardStep1: Return formatted data
    WizardStep1->>WizardStep1: validateProperty()
    User->>WizardStep1: Adjust sliders (value, mortgage)
    WizardStep1->>WizardStep1: calculateMaxInvestment()
    User->>WizardStep2: Confirm pre-qualification
    WizardStep2->>Database: Create deal record
    WizardStep2->>WizardStep2: Generate offer link
    User->>Pipeline: View new deal
```

### Workflow C: Admin User Approval

```mermaid
sequenceDiagram
    participant Admin
    participant AdminDashboard
    participant Database

    Admin->>AdminDashboard: Login (verified via user_roles)
    AdminDashboard->>Database: Fetch all profiles (RLS allows)
    Database-->>AdminDashboard: Return pending users
    Admin->>AdminDashboard: Approve/Deny user
    AdminDashboard->>Database: Update status to 'active'/'denied'
    Note over Database: User can now access wizard
```

---

## 6. Key Constants (heaCalculator.ts)

| Constant | Value | Description |
|----------|-------|-------------|
| ANNUALIZED_COST_LIMIT | 19.9% | Safety cap on HEA returns |
| EXCHANGE_RATE | 2.0 | Funding to equity share multiplier |
| MAX_UNLOCK_PERCENTAGE | 49.9% | Maximum equity share |
| MIN_HOME_VALUE | $175,000 | Minimum property value |
| MAX_HOME_VALUE | $3,000,000 | Maximum property value |
| ABSOLUTE_MAX_INVESTMENT | $500,000 | Maximum funding amount |

---

## 7. Environment Variables

### Required Secrets
| Variable | Purpose |
|----------|---------|
| SUPABASE_URL | Database project URL |
| SUPABASE_ANON_KEY | Anonymous key for client |
| SUPABASE_SERVICE_ROLE_KEY | Service role key for edge functions |
| Everflow | Everflow API key |
| ATOM_API_KEY | Atom Data API key |
| VITE_GOOGLE_MAPS_API_KEY | Google Maps address autocomplete |

---

## 8. Pipeline Stages

| Order | Stage Name | Description |
|-------|------------|-------------|
| 1 | Offer Generated | Initial offer created by broker |
| 2 | Offer Link Clicked | Homeowner clicked tracking link |
| 3 | Application Created | Homeowner started application |
| 4 | Application Qualified | Basic eligibility confirmed |
| 5 | Estimate Prepared | HEA terms calculated |
| 6 | Application Completed | All info submitted |
| 7 | Underwriting Submitted | Sent for review |
| 8 | Review Requested | Additional review needed |
| 9 | Final Offer Presented | Terms finalized |
| 10 | Funds Disbursed | Money transferred |
| 11 | Closed Lost | Deal did not proceed |

---

## 9. Admin Users

| Email | Role | Privileges |
|-------|------|------------|
| max@equityadvance.com | admin | God Mode - view all deals across all brokers |

---

*Last Updated: January 3, 2025*
