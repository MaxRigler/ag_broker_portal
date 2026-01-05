# Campaign Stats Refresh Fix

## Problem
The "Refresh Stats" button on the Campaigns page wasn't updating campaign statistics. Everflow confirmed clicks with correct `sub4` campaign IDs, but the broker portal showed 0 clicks.

---

## Root Causes

### 1. Wrong API Response Key
**Issue:** Everflow Clicks Stream API returns data in `table` key, but code was reading from `clicks` key.

```diff
- const allClicks = clicksData.clicks || [];
+ const allClicks = clicksData.table || clicksData.clicks || [];
```

### 2. Date Range Exceeded API Limit  
**Issue:** Everflow Clicks Stream API has a **14-day maximum** limit. Code was requesting 30 days, causing empty results.

```diff
- fromDate.setDate(today.getDate() - 30);
+ fromDate.setDate(today.getDate() - 7);
```

---

## File Modified
`supabase/functions/sync-everflow-status/index.ts`

---

## Verification

| Campaign | Before | After |
|----------|--------|-------|
| Facebook Test Campaign | 0 clicks | 1 click |
| Test Campaign (TikTok) | 0 clicks | 2 clicks |

![Working Campaign Stats](/Users/maxwellrigler/.gemini/antigravity/brain/42ffe4bb-0c81-46cc-bdf2-7c9eed7c720b/campaign_stats_working_1767564936644.webp)
