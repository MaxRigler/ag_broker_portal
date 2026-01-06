# Everflow API Integration & Workflow Specification

**Prepared For:** Lexi Norman, Everflow  
**Date:** January 5, 2026  
**Context:** Response to inquiry regarding workflow tracking and API usage.

---

## 1. Executive Summary: Workflow Tracking
To answer the question, *"Can you elaborate on what is being tracked related to this workflow?"*:

Our integration is **bidirectional**:
1.  **Data Entering Everflow (Tracking Links):** We generate tracking links that pass our internal Database IDs into Everflow via `sub` parameters upon click.
    *   **Deals** are tracked using `sub5`.
    *   **Campaigns** are tracked using `sub4`.
    *   **Officers** (Sub-affiliates) are tracked using `sub3`.
2.  **Data Existing Everflow (API & Postbacks):** We use the API to **pull** click and conversion data back into our Broker Portal to:
    *   Update Deal statuses (e.g., detecting "Offer Link Clicked").
    *   Aggregate performance statistics for Marketing Campaigns.
    *   Onboard new Broker Managers as Affiliates automatically.

---

## 2. Tracking Link Configuration
We use specific `sub` parameters to associate Everflow clicks with our internal entities.

### A. Individual Deal & Bulk Import Links
Used when a broker sends a specific offer to a homeowner.
*   **URL Format:** `https://[tracking_domain]/[encoded_value]/2CTPL/?sub5=[DEAL_ID]&sub3=[OFFICER_ID]`
*   **Parameters:**
    *   **`sub5`**: Passes the unique **Deal ID** (UUID) from our system. This is our primary key for matching downstream events to a specific property deal.
    *   **`sub3`** (Optional): Passes the **Officer ID** if the user is a subordinate officer. Used for attribution.

### B. Marketing Campaign Links
Used for general marketing campaigns created by brokers.
*   **URL Format:** `https://[tracking_domain]/[encoded_value]/2CTPL/?sub4=[CAMPAIGN_ID]&sub3=[OFFICER_ID]`
*   **Parameters:**
    *   **`sub4`**: Passes the unique **Campaign ID** (UUID). We map all clicks and events with this `sub4` back to the specific campaign dashboard in our portal.
    *   **`sub3`** (Optional): Officer User ID for attribution.

---

## 3. Server-Side API Integrations
We utilize Supabase Edge Functions to interact with the Everflow Network API.

### A. Manager Onboarding (Push to Everflow)
**Function:** `onboard-everflow-manager`  
**Purpose:** automatically provisions a new Affiliate account in Everflow when a Manager signs up in our portal.

*   **Endpoint:** `POST https://api.eflow.team/v1/networks/affiliates`
*   **Payload:**
    *   `name`: Company Name or Full Name
    *   `account_status`: "active"
    *   `users`: [{ `email`, `first_name`, `last_name`, ... }]
*   **Fallback:** If creation fails (e.g., email exists), it attempts to find the user via `GET /v1/networks/affiliates?search_terms=[email]`.

### B. Status Synchronization (Pull from Everflow)
**Function:** `sync-everflow-status`  
**Purpose:** Periodic sync to update local records based on Everflow activity.

**Mode 1: Deal Updates**
*   **Endpoint:** `POST https://api.eflow.team/v1/networks/reporting/clicks/stream`
*   **Logic:**
    1.  Fetches raw click stream for the lookback period.
    2.  Filters for clicks containing a **`sub5`** value.
    3.  Matches `sub5` keys to our **Deal IDs**.
    4.  Updates the Deal status in our portal to **"Offer Link Clicked"**.

**Mode 2: Campaign Stats**
*   **Endpoint 1:** `POST https://api.eflow.team/v1/networks/reporting/clicks/stream`
    *   Aggregates total clicks by **`sub4`** (Campaign ID).
*   **Endpoint 2:** `POST https://api.eflow.team/v1/networks/reporting/conversions`
    *   Fetches conversion events (e.g., "Application Created", "Funds Disbursed").
    *   Aggregates event counts by **`sub4`** (Campaign ID).
*   **Outcome:** Updates the dashboard statistics for each campaign.

### C. Webhook/Postback Receiver
**Function:** `everflow-postback`  
**Purpose:** Real-time updates for specific deal events.

*   **Logic:** Receives incoming GET/POST requests from Everflow.
*   **Required Parameters:**
    *   `sub5`: The Deal ID.
    *   `event_status`: The new status label.
*   **Action:** Immediately updates the status of the deal associated with `sub5`.
