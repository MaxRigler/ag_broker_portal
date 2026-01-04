import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Force Deploy Version 15.0 - Debug Mode for Raw Clicks

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

        console.log(`[V15.0] Syncing status for Deal ID: ${deal_id}`);

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

        // 2. Get Everflow API Key
        const everflowApiKey = Deno.env.get("Everflow");
        if (!everflowApiKey) {
            return new Response(
                JSON.stringify({ error: "Everflow API key not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 3. Build date range for Raw Clicks query - use UTC dates
        const today = new Date();
        const fromDate = new Date(today);
        fromDate.setDate(today.getDate() - 14);

        // Format: YYYY-MM-DD HH:MM:SS (use UTC for consistency)
        const formatDateTime = (d: Date) => {
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
        };

        const fromStr = formatDateTime(fromDate);
        const toStr = formatDateTime(today);

        console.log(`[V15.0] Date Range (UTC): ${fromStr} to ${toStr}`);

        // 4. First, query ALL clicks without filter to see what exists
        const allClicksPayload = {
            from: fromStr,
            to: toStr,
            timezone_id: 90 // UTC
        };

        console.log(`[V15.0] First checking ALL recent clicks (no filter)...`);
        const allClicksRes = await fetch("https://api.eflow.team/v1/networks/reporting/clicks/stream", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Eflow-API-Key": everflowApiKey
            },
            body: JSON.stringify(allClicksPayload)
        });

        let allClicksData: any = null;
        let foundSub5Values: string[] = [];

        if (allClicksRes.ok) {
            allClicksData = await allClicksRes.json();
            const totalClicks = allClicksData.clicks?.length || 0;
            console.log(`[V15.0] Total clicks in last 14 days: ${totalClicks}`);

            // Extract unique sub5 values
            if (allClicksData.clicks && allClicksData.clicks.length > 0) {
                foundSub5Values = [...new Set(allClicksData.clicks.map((c: any) => c.sub5).filter((s: string) => s))];
                console.log(`[V15.0] Unique sub5 values found: ${JSON.stringify(foundSub5Values.slice(0, 10))}`);

                // Check if our deal_id is in any of these clicks
                const matchingClick = allClicksData.clicks.find((c: any) => c.sub5 === deal_id);
                if (matchingClick) {
                    console.log(`[V15.0] FOUND matching click for deal_id: ${deal_id}`);
                    console.log(`[V15.0] Click timestamp: ${matchingClick.unix_timestamp}, sub5: ${matchingClick.sub5}`);
                } else {
                    console.log(`[V15.0] No matching click found for deal_id: ${deal_id} in ${totalClicks} clicks`);
                }
            }
        } else {
            const errorText = await allClicksRes.text();
            console.error(`[V15.0] Error fetching all clicks: ${allClicksRes.status} - ${errorText}`);
        }

        // 5. Now try with the s5 filter
        const filteredPayload = {
            from: fromStr,
            to: toStr,
            timezone_id: 90,
            query: {
                filters: [
                    { filter_id_value: deal_id, resource_type: "s5" }
                ]
            }
        };

        console.log(`[V15.0] Now querying with s5 filter: ${deal_id}`);
        console.log(`[V15.0] Filter payload: ${JSON.stringify(filteredPayload)}`);

        const filteredRes = await fetch("https://api.eflow.team/v1/networks/reporting/clicks/stream", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Eflow-API-Key": everflowApiKey
            },
            body: JSON.stringify(filteredPayload)
        });

        let hasClicks = false;
        let debugData: any = {
            total_clicks: allClicksData?.clicks?.length || 0,
            unique_sub5_values: foundSub5Values.slice(0, 10),
            deal_id_searched: deal_id
        };

        if (filteredRes.ok) {
            const data = await filteredRes.json();
            debugData.filtered_clicks_count = data.clicks?.length || 0;
            console.log(`[V15.0] Filtered clicks: ${data.clicks?.length || 0}`);

            if (data.clicks && data.clicks.length > 0) {
                hasClicks = true;
            }
        } else {
            const errorText = await filteredRes.text();
            console.error(`[V15.0] Filter API Error: ${filteredRes.status} - ${errorText}`);
            debugData.filter_error = errorText;
        }

        // 6. Manual match check - if we found clicks in all clicks, check if any match
        if (!hasClicks && allClicksData?.clicks) {
            const manualMatch = allClicksData.clicks.find((c: any) => c.sub5 === deal_id);
            if (manualMatch) {
                console.log(`[V15.0] Manual match FOUND - filter may not be working correctly`);
                hasClicks = true;
                debugData.manual_match_found = true;
            }
        }

        console.log(`[V15.0] Has Clicks (final): ${hasClicks}`);

        // 7. Determine new status
        let newStatus = deal.everflow_event_status;
        let latestEventName = "None";

        if (hasClicks) {
            newStatus = "Offer Link Clicked";
            latestEventName = "Click Detected";
        }

        console.log(`[V15.0] Final Status: ${newStatus}`);

        // 8. Update if changed
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
            console.log("[V15.0] Database updated successfully.");
        } else {
            console.log("[V15.0] Status unchanged.");
        }

        return new Response(
            JSON.stringify({
                success: true,
                deal_id: deal_id,
                previous_status: deal.everflow_event_status,
                new_status: newStatus,
                latest_event: latestEventName,
                debug: debugData
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
