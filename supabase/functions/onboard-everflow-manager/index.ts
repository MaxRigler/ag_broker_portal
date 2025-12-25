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
    const { profile_id } = await req.json();
    
    if (!profile_id) {
      console.error("Missing profile_id in request body");
      return new Response(
        JSON.stringify({ error: "Missing profile_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing onboarding for profile: ${profile_id}`);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, company_name, full_name, email, role, everflow_id")
      .eq("id", profile_id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch profile", details: profileError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile) {
      console.error("Profile not found:", profile_id);
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify conditions: role must be 'manager' and everflow_id must be NULL
    if (profile.role !== "manager" || profile.everflow_id !== null) {
      console.log(`Skipping: role=${profile.role}, everflow_id=${profile.everflow_id}`);
      return new Response(
        JSON.stringify({ message: "Conditions not met, skipping onboarding" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Everflow API key from secrets
    const everflowApiKey = Deno.env.get("Everflow");
    if (!everflowApiKey) {
      console.error("Everflow API key not configured");
      return new Response(
        JSON.stringify({ error: "Everflow API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare the Everflow API request payload
    const everflowPayload = {
      name: profile.company_name || profile.full_name || "Unknown Company",
      account_status: "active",
      users: [
        {
          name: profile.full_name || "Unknown User",
          email: profile.email,
          account_status: "active",
        },
      ],
    };

    console.log("Calling Everflow API with payload:", JSON.stringify(everflowPayload));

    // Call Everflow Network API
    const everflowResponse = await fetch("https://api.eflow.team/v1/networks/affiliates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Eflow-API-Key": everflowApiKey,
      },
      body: JSON.stringify(everflowPayload),
    });

    const everflowData = await everflowResponse.json();

    if (!everflowResponse.ok) {
      console.error("Everflow API error:", everflowData);
      return new Response(
        JSON.stringify({ error: "Everflow API call failed", details: everflowData }),
        { status: everflowResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Everflow API response:", JSON.stringify(everflowData));

    // Extract values from Everflow response
    const networkAffiliateId = everflowData.network_affiliate_id;
    const networkId = everflowData.network_id;
    const trackingDomain = everflowData.tracking_domain;
    const apiKey = everflowData.api_key;
    const accountStatus = everflowData.account_status;
    
    // Extract user ID from the first user in the response
    const userId = everflowData.users?.[0]?.network_affiliate_user_id || null;

    // Update the profile with Everflow data
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        everflow_id: networkAffiliateId?.toString(),
        everflow_user_id: userId,
        everflow_network_id: networkId,
        everflow_tracking_domain: trackingDomain,
        everflow_api_key: apiKey,
        everflow_account_status: accountStatus || "active",
      })
      .eq("id", profile_id);

    if (updateError) {
      console.error("Error updating profile with Everflow data:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update profile", details: updateError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully onboarded manager ${profile_id} to Everflow`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Manager successfully onboarded to Everflow",
        everflow_id: networkAffiliateId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Unexpected error in onboard-everflow-manager:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
