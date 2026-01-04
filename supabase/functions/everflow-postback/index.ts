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
        const url = new URL(req.url);
        const params = url.searchParams;

        // Support both GET (query params) and POST (body)
        let dealId = params.get("sub5");
        let eventStatus = params.get("event_status") || params.get("status");
        let secret = params.get("secret");

        if (req.method === "POST" && (!dealId || !eventStatus)) {
            try {
                const body = await req.json();
                if (!dealId) dealId = body.sub5;
                if (!eventStatus) eventStatus = body.event_status || body.status;
                if (!secret) secret = body.secret;
            } catch {
                // Body parsing failed, stick to query params
            }
        }

        // Check Secret (Optional for now, but good practice)
        const configuredSecret = Deno.env.get("EVERFLOW_WEBHOOK_SECRET");
        if (configuredSecret && secret !== configuredSecret) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!dealId || !eventStatus) {
            return new Response(
                JSON.stringify({ error: "Missing required parameters: sub5 (Deal ID) and event_status" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Received Everflow update for Deal ${dealId}: status=${eventStatus}`);

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verify Deal Exists
        const { data: deal, error: fetchError } = await supabase
            .from("deals")
            .select("id, everflow_event_status")
            .eq("id", dealId)
            .maybeSingle();

        if (fetchError) {
            console.error("Error fetching deal:", fetchError);
            return new Response(
                JSON.stringify({ error: "Database error fetching deal" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!deal) {
            console.error(`Deal not found: ${dealId}`);
            return new Response(
                JSON.stringify({ error: "Deal not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Update Deal Status
        const { error: updateError } = await supabase
            .from("deals")
            .update({ everflow_event_status: eventStatus })
            .eq("id", dealId);

        if (updateError) {
            console.error("Error updating deal status:", updateError);
            return new Response(
                JSON.stringify({ error: "Database error updating deal" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Successfully updated Deal ${dealId} to ${eventStatus}`);

        return new Response(
            JSON.stringify({ message: "Deal status updated successfully", deal_id: dealId, status: eventStatus }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: unknown) {
        console.error("Unexpected error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(
            JSON.stringify({ error: "Internal server error", details: errorMessage }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
