import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Force Deploy Version 13.0

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Everflow Reporting API Payload Interface
 */
interface EverflowReportingPayload {
    from: string;
    to: string;
    timezone_id: number;
    currency_id: string;
    show_conversions: boolean;
    show_events: boolean;
    columns: Array<{ column: string }>;
    query?: {
        filters?: Array<{ resource_type: string; filter_id_value: string }>;
    };
    filters?: Array<{ resource_type: string; filter_id_value: string }>; // Keeping for backward compatibility if needed, but query is preferred
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { deal_id } = await req.json();

        if (!deal_id) {
            return new Response(
                JSON.stringify({ error: "Missing required parameter: deal_id" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Syncing status for Deal ID: ${deal_id}`);

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Verify Deal Exists and Get Current Status
        const { data: deal, error: fetchError } = await supabase
            .from("deals")
            .select("id, everflow_event_status")
            .eq("id", deal_id)
            .maybeSingle();

        if (fetchError || !deal) {
            console.error("Error fetching deal:", fetchError);
            return new Response(
                JSON.stringify({ error: "Deal not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 2. Prepare Everflow API Request
        const everflowApiKey = Deno.env.get("Everflow");
        if (!everflowApiKey) {
            return new Response(
                JSON.stringify({ error: "Everflow API key not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Date Range: Look back 2 days and AHEAD 2 days to account for all Timezone differences
        // The click happened at 17:47 MST which might be "Tomorrow" in UTC
        // Date Range: Look back 5 days and AHEAD 2 days
        const today = new Date();
        const fromDate = new Date(today);
        fromDate.setDate(today.getDate() - 5);
        const toDate = new Date(today);
        toDate.setDate(today.getDate() + 2);

        // Format YYYY-MM-DD
        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        const fromStr = formatDate(fromDate);
        const toStr = formatDate(toDate);

        console.log(`[Version 13.0] Entity/Fallback - Querying from ${fromStr} to ${toStr}`);

        // Query 1: Conversions / Events (Mocked)
        const conversionsPromise = Promise.resolve({ ok: true, json: async () => ({ conversions: [] }) });

        // Query 2: Clicks / Stats
        // Strategy: Entity Reporting (Simplified) - Version 13.0
        // V12 (Entity) crashed. We suspect 'network_id' or 'total_click' was the issue.
        // We will try 'gross_click' and remove 'network_id'.
        const entityPayload = {
            from: fromStr,
            to: toStr,
            timezone_id: 106,
            currency_id: "USD",
            query: {},
            columns: [
                { column: "sub5" },
                { column: "gross_click" }
            ]
        };

        const entityPromise = fetch("https://api.eflow.team/v1/networks/reporting/entity", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Eflow-API-Key": everflowApiKey
            },
            body: JSON.stringify(entityPayload)
        });

        const [conversionsRes, entityRes] = await Promise.all([conversionsPromise, entityPromise]);

        // Process Conversions
        let latestConversion: any = null;
        if (conversionsRes.ok) {
            // Mocked
        }

        // Process Entity Stats
        let hasClicks = false;
        let debugData: any = null;

        if (entityRes.ok) {
            const data = await entityRes.json();
            debugData = data;
            console.log(`[Version 13.0] Entity Stats Response: ${JSON.stringify(data).substring(0, 500)}`);

            let rows: any[] = [];
            if (data.table) rows = data.table;
            else if (data.reporting) rows = data.reporting;
            else if (Array.isArray(data)) rows = data;

            // Filter for our Deal ID
            const dealRow = rows.find((r: any) => r.sub5 === deal_id);

            if (dealRow) {
                console.log("Found Entity Stats:", dealRow);
                // Check if gross_click > 0 (or total_click if returned)
                const clicks = Number(dealRow.gross_click || dealRow.total_click || 0);
                if (clicks > 0) {
                    hasClicks = true;
                }
            } else {
                console.log("No matching sub5 found in Entity Stats.");
            }
        } else {
            const errorText = await entityRes.text();
            console.warn(`Entity API Error: ${errorText}. Falling back to List...`);
            debugData = { error: errorText };

            // Fallback: Reporting/Clicks with HUGE page size
            // If Entity crashes, maybe the raw list works but needs more depth.
            try {
                const listPayload = {
                    from: fromStr,
                    to: toStr,
                    timezone_id: 106,
                    page_size: 1000,
                    columns: [{ column: "sub5" }, { column: "transaction_id" }]
                };
                const listRes = await fetch("https://api.eflow.team/v1/networks/reporting/clicks", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Eflow-API-Key": everflowApiKey
                    },
                    body: JSON.stringify(listPayload)
                });
                if (listRes.ok) {
                    const listData = await listRes.json();
                    console.log(`[Version 13.0] Fallback List Response: ${JSON.stringify(listData).substring(0, 500)}`);
                    let listRows: any[] = [];
                    if (listData.table) listRows = listData.table;
                    else if (listData.clicks) listRows = listData.clicks;

                    if (listRows.find((r: any) => r.sub5 === deal_id)) {
                        console.log("Found Click in Fallback List!");
                        hasClicks = true;
                    }
                }
            } catch (e) {
                console.error("Fallback failed", e);
            }
        }

        console.log("Latest Conversion:", latestConversion);
        console.log("Has Clicks:", hasClicks);

        let newStatus = deal.everflow_event_status;
        let latestEventName = "None";

        // Logic: Conversion takes precedence over Click
        if (latestConversion) {
            newStatus = latestConversion.event_status || "unknown";
            latestEventName = latestConversion.event || "unknown";
        } else if (hasClicks) {
            newStatus = "Offer Link Clicked";
            latestEventName = "Click (Aggregate)";
        }

        console.log(`Determined Status: ${newStatus}, Event: ${latestEventName}`);

        if (newStatus !== deal.everflow_event_status) {
            const { error: updateError } = await supabase
                .from("deals")
                .update({ everflow_event_status: newStatus })
                .eq("id", deal_id);

            if (updateError) {
                console.error("Error updating deal status:", updateError);
                return new Response(
                    JSON.stringify({ error: "Database update failed" }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            console.log("Database updated successfully.");
        } else {
            console.log("Status unchanged.");
        }

        return new Response(
            JSON.stringify({
                success: true,
                deal_id: deal_id,
                previous_status: deal.everflow_event_status,
                new_status: newStatus,
                latest_event: latestEventName,
                debug_everflow_response: debugData // LEAKING DATA TO CLIENT
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
