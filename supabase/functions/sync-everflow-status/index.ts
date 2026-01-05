import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapping of Everflow event names to database column names
const EVENT_TO_COLUMN: Record<string, string> = {
    "Application Created": "application_created",
    "Application Qualified": "application_qualified",
    "Estimate Prepared": "estimate_prepared",
    "Application Completed": "application_completed",
    "Underwriting Submitted": "underwriting_submitted",
    "Review Requested": "review_requested",
    "Final Offer Presented": "final_offer_presented",
    "Funds Disbursed": "funds_disbursed",
    "Closed Lost": "closed_lost",
};

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Parse request body - handle potential empty body for batch mode
        let body: { deal_id?: string; mode?: string } = {};
        try {
            const text = await req.text();
            if (text) body = JSON.parse(text);
        } catch (_e) {
            console.log("Empty or invalid body, proceeding with defaults");
        }

        const { deal_id, mode } = body;
        const isCampaignMode = mode === "campaigns";
        const isBatchMode = !deal_id && !isCampaignMode;

        console.log(`[V17.0] Starting sync. Mode: ${isCampaignMode ? "CAMPAIGNS" : isBatchMode ? "BATCH (All Deals)" : `SINGLE (Deal: ${deal_id})`}`);

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Initialize Everflow API Key
        const everflowApiKey = Deno.env.get("Everflow");
        if (!everflowApiKey) {
            throw new Error("Everflow API key not configured");
        }

        // Date range for Everflow queries (API limit is 14 days max, using 7 for reliability)
        const today = new Date();
        const fromDate = new Date(today);
        fromDate.setDate(today.getDate() - 7); // 7 days within API limit of 14

        const formatDateTime = (d: Date) => {
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
        };

        const fromStr = formatDateTime(fromDate);
        const toStr = formatDateTime(today);

        // ===== CAMPAIGN MODE =====
        if (isCampaignMode) {
            console.log("[V17.0] Campaign sync mode - fetching campaigns and aggregate data");

            // Fetch all active campaigns with user_id for lead tracking
            const { data: campaigns, error: campaignsError } = await supabase
                .from("campaigns")
                .select("id, user_id")
                .eq("is_active", true);

            if (campaignsError || !campaigns || campaigns.length === 0) {
                console.log("No active campaigns found");
                return new Response(JSON.stringify({ message: "No campaigns to sync" }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            console.log(`[V17.0] Found ${campaigns.length} active campaigns`);

            // Create a map of campaign_id -> user_id for lead creation
            const campaignUserMap: Record<string, string> = {};
            campaigns.forEach((c: { id: string; user_id: string }) => {
                campaignUserMap[c.id] = c.user_id;
            });

            // Log campaign IDs we're looking for
            const campaignIds = campaigns.map((c: { id: string }) => c.id);
            console.log(`[V17.0] Campaign IDs to match: ${JSON.stringify(campaignIds.slice(0, 10))}`);

            // Fetch clicks from Everflow (looking for sub4 which contains campaign IDs)
            const clicksPayload = {
                from: fromStr,
                to: toStr,
                timezone_id: 90
            };

            console.log(`[V17.3] Clicks API request: ${JSON.stringify(clicksPayload)}`);

            const clicksRes = await fetch("https://api.eflow.team/v1/networks/reporting/clicks/stream", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Eflow-API-Key": everflowApiKey
                },
                body: JSON.stringify(clicksPayload)
            });

            if (!clicksRes.ok) {
                const errorText = await clicksRes.text();
                console.log(`[V17.0] Clicks API Error Response: ${errorText}`);
                throw new Error(`Everflow Clicks API Error: ${clicksRes.status}`);
            }

            const clicksData = await clicksRes.json();
            // Everflow returns clicks in 'table' key, not 'clicks'
            const allClicks = clicksData.table || clicksData.clicks || [];
            console.log(`[V17.1] Retrieved ${allClicks.length} total clicks`);

            // Log first few clicks with their sub4 values for debugging
            if (allClicks.length > 0) {
                const clicksWithSub4 = allClicks.filter((c: { sub4?: string }) => c.sub4);
                console.log(`[V17.0] Clicks with sub4: ${clicksWithSub4.length}`);
                clicksWithSub4.slice(0, 5).forEach((c: { sub4?: string }, i: number) => {
                    console.log(`[V17.0] Click ${i + 1} sub4: ${c.sub4}`);
                });
            } else {
                // Log the raw API response structure to debug why no clicks
                console.log(`[V17.0] Raw clicksData keys: ${JSON.stringify(Object.keys(clicksData))}`);
                console.log(`[V17.0] clicksData sample: ${JSON.stringify(clicksData).slice(0, 500)}`);
            }

            // Fetch conversions/events from Everflow
            const eventsPayload = {
                from: fromStr,
                to: toStr,
                timezone_id: 90,
                show_events: true
            };

            const eventsRes = await fetch("https://api.eflow.team/v1/networks/reporting/conversions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Eflow-API-Key": everflowApiKey
                },
                body: JSON.stringify(eventsPayload)
            });

            let allEvents: Array<{ sub4?: string; event?: { event_name?: string } }> = [];
            if (eventsRes.ok) {
                const eventsData = await eventsRes.json();
                allEvents = eventsData.conversions || [];
                console.log(`[V17.0] Retrieved ${allEvents.length} total events`);
            } else {
                console.log("[V17.0] Could not fetch events, continuing with click data only");
            }

            // Aggregate data per campaign
            const campaignStats: Record<string, {
                total_clicks: number;
                application_created: number;
                application_qualified: number;
                estimate_prepared: number;
                application_completed: number;
                underwriting_submitted: number;
                review_requested: number;
                final_offer_presented: number;
                funds_disbursed: number;
                closed_lost: number;
            }> = {};

            // Initialize stats for all campaigns
            for (const campaign of campaigns) {
                campaignStats[campaign.id] = {
                    total_clicks: 0,
                    application_created: 0,
                    application_qualified: 0,
                    estimate_prepared: 0,
                    application_completed: 0,
                    underwriting_submitted: 0,
                    review_requested: 0,
                    final_offer_presented: 0,
                    funds_disbursed: 0,
                    closed_lost: 0,
                };
            }

            // Count clicks per campaign AND create individual lead records
            let matchedClicks = 0;
            let leadsCreated = 0;
            const leadPromises: Promise<void>[] = [];

            for (const click of allClicks) {
                if (click.sub4 && campaignStats[click.sub4]) {
                    campaignStats[click.sub4].total_clicks++;
                    matchedClicks++;

                    // Create individual lead record if we have a transaction_id
                    if (click.transaction_id && campaignUserMap[click.sub4]) {
                        leadPromises.push(
                            supabase.from("campaign_leads").upsert({
                                campaign_id: click.sub4,
                                user_id: campaignUserMap[click.sub4],
                                everflow_transaction_id: click.transaction_id,
                                everflow_event_status: "Offer Link Clicked",
                                click_timestamp: click.time_stamp || click.time_date,
                                ip_address: click.ip,
                                country: click.country_name || click.country
                            }, { onConflict: 'everflow_transaction_id' })
                                .then(({ error }: { error: { message: string } | null }) => {
                                    if (error) {
                                        console.error(`[V18.0] Failed to upsert lead:`, error.message);
                                    } else {
                                        leadsCreated++;
                                    }
                                })
                        );
                    }
                }
            }

            // Wait for all lead upserts to complete
            await Promise.all(leadPromises);
            console.log(`[V18.0] Created/updated ${leadsCreated} individual campaign leads`);

            // Log match results
            console.log(`[V17.0] Total clicks matched to campaigns: ${matchedClicks}`);

            // Count events per campaign
            for (const event of allEvents) {
                const campaignId = event.sub4;
                const eventName = event.event?.event_name;

                if (campaignId && campaignStats[campaignId] && eventName) {
                    const columnName = EVENT_TO_COLUMN[eventName];
                    if (columnName && columnName in campaignStats[campaignId]) {
                        (campaignStats[campaignId] as Record<string, number>)[columnName]++;
                    }
                }
            }

            // Update campaigns in database
            let updatedCount = 0;
            for (const [campaignId, stats] of Object.entries(campaignStats)) {
                const { error: updateError } = await supabase
                    .from("campaigns")
                    .update({
                        total_clicks: stats.total_clicks,
                        application_created: stats.application_created,
                        application_qualified: stats.application_qualified,
                        estimate_prepared: stats.estimate_prepared,
                        application_completed: stats.application_completed,
                        underwriting_submitted: stats.underwriting_submitted,
                        review_requested: stats.review_requested,
                        final_offer_presented: stats.final_offer_presented,
                        funds_disbursed: stats.funds_disbursed,
                        closed_lost: stats.closed_lost,
                    })
                    .eq("id", campaignId);

                if (!updateError) {
                    updatedCount++;
                } else {
                    console.error(`Failed to update campaign ${campaignId}:`, updateError);
                }
            }

            console.log(`[V17.0] Updated ${updatedCount} campaigns with aggregate stats`);

            return new Response(
                JSON.stringify({
                    success: true,
                    message: `Campaign sync complete. Updated ${updatedCount} campaigns.`,
                    stats: {
                        campaigns_synced: updatedCount,
                        leads_created: leadsCreated,
                        total_clicks_fetched: allClicks.length,
                        total_events_fetched: allEvents.length,
                        matched_clicks: matchedClicks
                    },
                    debug: {
                        date_range: { from: fromStr, to: toStr },
                        campaign_ids: campaignIds.slice(0, 5),
                        sample_sub4_values: allClicks.slice(0, 3).map((c: { sub4?: string }) => c.sub4)
                    }
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ===== DEALS MODE (Original Logic) =====
        let query = supabase
            .from("deals")
            .select("id, everflow_event_status");

        if (deal_id) {
            query = query.eq("id", deal_id);
        }

        const { data: deals, error: fetchError } = await query;

        if (fetchError || !deals || deals.length === 0) {
            console.log("No deals found to sync.");
            return new Response(JSON.stringify({ message: "No deals to sync" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log(`[V17.3] Checking status for ${deals.length} deals.`);

        // Fetch clicks (30 days for deals)
        const clicksPayload = {
            from: fromStr,
            to: toStr,
            timezone_id: 90
        };

        console.log(`[V17.3] Fetching Everflow clicks from ${fromStr} to ${toStr}...`);

        const clicksRes = await fetch("https://api.eflow.team/v1/networks/reporting/clicks/stream", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Eflow-API-Key": everflowApiKey
            },
            body: JSON.stringify(clicksPayload)
        });

        if (!clicksRes.ok) {
            throw new Error(`Everflow API Error: ${clicksRes.status} ${await clicksRes.text()}`);
        }

        const clicksData = await clicksRes.json();
        // Everflow returns clicks in 'table' key, not 'clicks'
        const allClicks = clicksData.table || clicksData.clicks || [];
        console.log(`[V17.1] Retrieved ${allClicks.length} total clicks.`);

        // Create lookup Set (sub5 -> deal_id)
        const clickedDealIds = new Set<string>();
        for (const click of allClicks) {
            if (click.sub5) {
                clickedDealIds.add(click.sub5);
            }
        }

        console.log(`[V17.0] Found ${clickedDealIds.size} unique deal IDs with clicks.`);

        // Match and prepare updates
        const updates: Array<{ id: string; everflow_event_status: string }> = [];
        let updatesCount = 0;

        for (const deal of deals) {
            if (clickedDealIds.has(deal.id)) {
                if (deal.everflow_event_status !== "Offer Link Clicked") {
                    updates.push({
                        id: deal.id,
                        everflow_event_status: "Offer Link Clicked"
                    });
                    updatesCount++;
                }
            }
        }

        console.log(`[V17.0] Identified ${updatesCount} deals needing updates.`);

        // Perform updates
        if (updates.length > 0) {
            const updatePromises = updates.map(async (update) => {
                const { error } = await supabase
                    .from("deals")
                    .update({ everflow_event_status: update.everflow_event_status })
                    .eq("id", update.id);

                if (error) {
                    console.error(`Failed to update deal ${update.id}:`, error);
                    throw error;
                }
                console.log(`[V17.0] Updated deal ${update.id} to "Offer Link Clicked"`);
            });

            await Promise.all(updatePromises);
            console.log(`[V17.0] Successfully updated ${updates.length} deals.`);
        } else {
            console.log("[V17.0] No updates required.");
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: isBatchMode
                    ? `Batch sync complete. Scanned ${deals.length} deals, updated ${updatesCount}.`
                    : `Sync complete for deal ${deal_id}. Updated: ${updatesCount > 0}`,
                stats: {
                    total_deals_checked: deals.length,
                    total_clicks_fetched: allClicks.length,
                    updates_performed: updatesCount
                }
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: unknown) {
        console.error("Unexpected error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return new Response(
            JSON.stringify({ error: "Internal server error", details: msg }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
