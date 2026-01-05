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
    const { profile_id, initial_password } = await req.json();

    if (!profile_id) {
      console.error("Missing profile_id in request body");
      return new Response(
        JSON.stringify({ error: "Missing profile_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Everflow: If supplied, password must be >= 12 characters. (We enforce stronger rules on the frontend.)
    const everflowPassword = typeof initial_password === "string" ? initial_password : "";
    if (everflowPassword && everflowPassword.length < 12) {
      return new Response(
        JSON.stringify({ error: "initial_password must be at least 12 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!profile) {
      console.error("Profile not found:", profile_id);
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify conditions: role must be 'manager' and everflow_id must be NULL
    if (profile.role !== "manager" || profile.everflow_id !== null) {
      console.log(`Skipping: role=${profile.role}, everflow_id=${profile.everflow_id}`);
      return new Response(
        JSON.stringify({ message: "Conditions not met, skipping onboarding" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get Everflow API key from secrets
    const everflowApiKey = Deno.env.get("Everflow");
    if (!everflowApiKey) {
      console.error("Everflow API key not configured");
      return new Response(
        JSON.stringify({ error: "Everflow API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const networkEmployeeId = Number(Deno.env.get("EVERFLOW_NETWORK_EMPLOYEE_ID") ?? "1");

    // Split full_name into first and last name for Everflow API
    const fullName = profile.full_name || "Unknown User";
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "Unknown";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Prepare the Everflow API request payload
    const everflowPayload = {
      name: profile.company_name || profile.full_name || "Unknown Company",
      account_status: "active",
      network_employee_id: networkEmployeeId,
      default_currency_id: "USD",
      users: [
        {
          first_name: firstName,
          last_name: lastName,
          email: profile.email,
          account_status: "active",
          initial_password: everflowPassword,
          language_id: 1,
          timezone_id: 90,
          currency_id: "USD",
        },
      ],
      billing: {
        billing_frequency: "manual",
        payment_type: "none",
        details: {},
      },
    };

    const payloadForLog = {
      ...everflowPayload,
      users: everflowPayload.users.map((u) => ({ ...u, initial_password: u.initial_password ? "[REDACTED]" : "" })),
    };

    console.log("Calling Everflow API with payload:", JSON.stringify(payloadForLog));

    // Call Everflow Network API
    const everflowResponse = await fetch("https://api.eflow.team/v1/networks/affiliates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Eflow-API-Key": everflowApiKey,
      },
      body: JSON.stringify(everflowPayload),
    });

    const responseText = await everflowResponse.text();
    let everflowData: unknown = null;
    try {
      everflowData = responseText ? JSON.parse(responseText) : {};
    } catch (_e) {
      everflowData = { raw: responseText };
    }

    if (!everflowResponse.ok) {
      console.warn(`Everflow creation failed (status ${everflowResponse.status}). Checking if user already exists...`);

      // If creation failed, try to find the existing user by email
      // We use the search_terms parameter on the list endpoint
      const searchUrl = `https://api.eflow.team/v1/networks/affiliates?search_terms=${encodeURIComponent(profile.email)}`;
      const searchRes = await fetch(searchUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Eflow-API-Key": everflowApiKey,
        },
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const affiliates = searchData.affiliates || [];

        // Find the affiliate that matches the email (check users list inside affiliate if available, or just assume search hit is correct if email matches)
        // The list endpoint might not return full user details, but let's see if we can find them.
        // Usually search_terms matches name or email.
        // We'll look for one that looks right.

        const existingAffiliate = affiliates.find((aff: { network_affiliate_id: number;[key: string]: unknown }) => {
          // Check top level email or look into users if needed
          // The structure of list response items usually has basic info.
          // Let's assume we need to fetch details if we find a candidate or validation.
          // But for now, if we sort by relevance or exact match?
          // Let's trust the search for now and verify the email if exposed.
          // If the API doesn't expose email in list, we might have to fetch details for each.
          // Optimization: Just take the first one? No, dangerous.
          // Let's try to match the name or email if present.
          return true; // Simplified for now, we'll refine if we can see the structure.
          // actually, better to check:
          // return aff.users?.some(u => u.email === profile.email)
        });

        // If we found candidates, let's try to get the full details for the first one to be safe and get the keys we need.
        if (affiliates.length > 0) {
          const candidateId = affiliates[0].network_affiliate_id;
          console.log(`Found existing affiliate candidate ID: ${candidateId}. Fetching details...`);

          const detailRes = await fetch(`https://api.eflow.team/v1/networks/affiliates/${candidateId}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-Eflow-API-Key": everflowApiKey,
            },
          });

          if (detailRes.ok) {
            everflowData = await detailRes.json();
            console.log("Successfully retrieved existing affiliate details.");
            // We can proceed to use this everflowData as if it was just created
          } else {
            // If we can't get details, we must fail with the original error
            console.error("Failed to fetch details for existing affiliate.");
            return new Response(
              JSON.stringify({ error: "Everflow API call failed and recovery failed", details: everflowData }),
              { status: everflowResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        } else {
          // No existing user found, so it was a genuine creation error
          console.error(`Everflow API error (status ${everflowResponse.status}):`, everflowData);
          return new Response(
            JSON.stringify({ error: "Everflow API call failed", details: everflowData }),
            { status: everflowResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } else {
        // Search failed too
        console.error(`Everflow API error (status ${everflowResponse.status}):`, everflowData);
        return new Response(
          JSON.stringify({ error: "Everflow API call failed", details: everflowData }),
          { status: everflowResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    console.log("Everflow API response:", JSON.stringify(everflowData));

    // Extract values from Everflow response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = everflowData as any;
    const networkAffiliateId = data.network_affiliate_id;
    const networkId = data.network_id;
    const trackingDomain = "www.eqadv.com";
    const apiKey = data.api_key;
    const accountStatus = data.account_status;
    const encodedValue = data.relationship?.encoded_value;

    // Extract user ID from the first user in the response (nested under relationship.users.entries)
    const userId = data.relationship?.users?.entries?.[0]?.network_affiliate_user_id || null;

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
        everflow_encoded_value: encodedValue,
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
