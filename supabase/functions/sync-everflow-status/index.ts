import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        // Parse request body - handle potential empty body for batch mode
        let body = {};
        try {
            const text = await req.text();
            if (text) body = JSON.parse(text);
        } catch (e) {
            console.log("Empty or invalid body, proceeding with defaults");
        }

        const { deal_id } = body as { deal_id?: string };
        const isBatchMode = !deal_id;

        console.log(`[V16.0 Batch-Sync] Starting sync. Mode: ${isBatchMode ? "BATCH (All Deals)" : `SINGLE (Deal: ${deal_id})`}`);

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Initialize Everflow API Key
        const everflowApiKey = Deno.env.get("Everflow");
        if (!everflowApiKey) {
            throw new Error("Everflow API key not configured");
        }

        // 1. Fetch relevant deals from Supabase
        // If batch mode: Fetch all deals that are NOT already clicked (optimization)
        // If single mode: Fetch specific deal
        let query = supabase
            .from("deals")
            .select("id, everflow_event_status");

        if (deal_id) {
            query = query.eq("id", deal_id);
        } else {
            // Optimization: Only check deals that haven't converted yet 
            // OR checks all deals. Checking all is safer to catch missed updates.
            // Let's filter to improve DB performance, assuming 'Offer Link Clicked' is final for this step.
            // Actually, let's fetch ALL for now to be safe, or at least active ones. 
            // For now, simply removing the filter ensures we don't miss anything.
        }

        const { data: deals, error: fetchError } = await query;

        if (fetchError || !deals || deals.length === 0) {
            console.log("No deals found to sync.");
            return new Response(JSON.stringify({ message: "No deals to sync" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log(`[V16.0] Checking status for ${deals.length} deals.`);

        // 2. Fetch Global Click History from Everflow (Last 14 days)
        // We do this ONCE.

        const today = new Date();
        const fromDate = new Date(today);
        fromDate.setDate(today.getDate() - 14);

        const formatDateTime = (d: Date) => {
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
        };

        const fromStr = formatDateTime(fromDate);
        const toStr = formatDateTime(today);

        // Fetch ALL clicks (stream)
        const clicksPayload = {
            from: fromStr,
            to: toStr,
            timezone_id: 90 // UTC
        };

        console.log(`[V16.0] Fetching Everflow clicks from ${fromStr} to ${toStr}...`);

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
        const allClicks = clicksData.clicks || [];
        console.log(`[V16.0] Retrieved ${allClicks.length} total clicks.`);

        // 3. Create Lookup Map (sub5 -> Click)
        // We use a Set for fast existence checks. 
        // We assume 'sub5' holds the deal_id.
        const clickedDealIds = new Set<string>();

        for (const click of allClicks) {
            if (click.sub5) {
                clickedDealIds.add(click.sub5);
            }
        }

        console.log(`[V16.0] Found ${clickedDealIds.size} unique deal IDs with clicks.`);

        // 4. Match and Prepare Updates
        const updates = [];
        let updatesCount = 0;

        for (const deal of deals) {
            // Logic: If deal has click in Everflow BUT status is not 'Offer Link Clicked'
            // Then we update it.
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

        console.log(`[V16.0] Identified ${updatesCount} deals needing updates.`);

        // 5. Perform Updates (one at a time, but in parallel)
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
                console.log(`[V16.1] Updated deal ${update.id} to "Offer Link Clicked"`);
            });

            await Promise.all(updatePromises);
            console.log(`[V16.1] Successfully updated ${updates.length} deals.`);
        } else {
            console.log("[V16.1] No updates required.");
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
