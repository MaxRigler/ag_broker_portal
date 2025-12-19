import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    const apiKey = Deno.env.get('RENTCAST_API_KEY');

    if (!apiKey) {
      console.error('RENTCAST_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'RentCast API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Looking up property:', address);

    // Step 1: Get property details from /v1/properties endpoint
    const propertyUrl = `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(address)}`;
    console.log('Fetching property data from:', propertyUrl);
    
    const propertyResponse = await fetch(propertyUrl, {
      headers: { 'X-Api-Key': apiKey }
    });

    if (!propertyResponse.ok) {
      const errorText = await propertyResponse.text();
      console.error('Property API error:', propertyResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Property lookup failed: ${propertyResponse.status}` }),
        { status: propertyResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const propertyData = await propertyResponse.json();
    console.log('Property data received:', JSON.stringify(propertyData));

    // Step 2: Get AVM estimate from /v1/avm/value endpoint
    const avmUrl = `https://api.rentcast.io/v1/avm/value?address=${encodeURIComponent(address)}`;
    console.log('Fetching AVM data from:', avmUrl);
    
    const avmResponse = await fetch(avmUrl, {
      headers: { 'X-Api-Key': apiKey }
    });

    let estimatedValue = 0;
    if (avmResponse.ok) {
      const avmData = await avmResponse.json();
      console.log('AVM data received:', JSON.stringify(avmData));
      estimatedValue = avmData.price || avmData.priceRangeLow || 0;
    } else {
      console.warn('AVM lookup failed, using fallback:', avmResponse.status);
    }

    // Extract and format the response data
    const ownerNames = propertyData.owner?.names?.join(' & ') || 'Unknown Owner';
    const state = propertyData.state || '';
    const propertyType = propertyData.propertyType || 'Single Family';

    const result = {
      ownerNames,
      state,
      propertyType,
      estimatedValue,
      rawPropertyData: propertyData
    };

    console.log('Returning result:', JSON.stringify(result));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in rentcast-property-lookup:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
