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
    const apiKey = Deno.env.get('ATOM_API_KEY');

    if (!apiKey) {
      console.error('ATOM_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Atom API key not configured' }),
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

    // Split address into address1 and address2
    // Basic heuristic: Split on first comma
    const parts = address.split(',');
    if (parts.length < 2) {
       return new Response(
        JSON.stringify({ error: 'Address format invalid. Expected "Street, City, State Zip"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const address1 = parts[0].trim();
    const address2 = parts.slice(1).join(',').trim();
    
    // URL Encode
    const encodedAddress1 = encodeURIComponent(address1);
    const encodedAddress2 = encodeURIComponent(address2);

    // Step 1: Get property details
    const propertyUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail?address1=${encodedAddress1}&address2=${encodedAddress2}`;
    console.log('Fetching property data from Atom...');
    
    const propertyResponse = await fetch(propertyUrl, {
      headers: { 
        'apikey': apiKey, 
        'Accept': 'application/json' 
      }
    });

    if (!propertyResponse.ok) {
      const errorText = await propertyResponse.text();
      console.error('Property API error:', propertyResponse.status, errorText);
       // Allow 404/no results to handle gracefully?
       // If 404, we might just return empty data or error.
      return new Response(
        JSON.stringify({ error: `Property lookup failed: ${propertyResponse.status}` }),
        { status: propertyResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const propertyData = await propertyResponse.json();
    // console.log('Property data received:', JSON.stringify(propertyData));

    // Step 2: Get AVM estimate
    const avmUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/attomavm/detail?address1=${encodedAddress1}&address2=${encodedAddress2}`;
    console.log('Fetching AVM data from Atom...');
    
    const avmResponse = await fetch(avmUrl, {
        headers: { 
          'apikey': apiKey, 
          'Accept': 'application/json' 
        }
    });

    let estimatedValue = 0;
    let avmData = null;

    if (avmResponse.ok) {
        avmData = await avmResponse.json();
        // Atom AVM structure: response.property[0].avm.amount.value
        // Check structure carefully
        const avmProp = avmData.property?.[0];
        if (avmProp && avmProp.avm) {
             estimatedValue = avmProp.avm.amount?.value || 0;
        }
    } else {
      console.warn('AVM lookup failed, using fallback:', avmResponse.status);
    }

    // Extract Data
    // Atom structure: response.property[0]...
    const mainProp = propertyData.property?.[0];
    
    // Owner names
    // Atom: assessment.owner.owner1.fullname
    let ownerNames = 'Unknown Owner';
    if (mainProp && mainProp.assessment && mainProp.assessment.owner) {
        const owner = mainProp.assessment.owner;
        const owners = [];
        if (owner.owner1 && owner.owner1.fullname) owners.push(owner.owner1.fullname);
        if (owner.owner2 && owner.owner2.fullname) owners.push(owner.owner2.fullname);
        if (owners.length > 0) ownerNames = owners.join(' & ');
    }

    // State
    const state = mainProp?.address?.countrySubd || ''; // "CO"

    // Property Type
    // Atom: summary.propclass or summary.propertyType
    // "Single Family Residence", "Condominium"
    const propertyType = mainProp?.summary?.propclass || 'Single Family';

    const result = {
      ownerNames,
      state,
      propertyType,
      estimatedValue,
      rawPropertyData: propertyData,
      rawAvmData: avmData
    };

    console.log('Returning result:', JSON.stringify(result));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in atom-property-lookup:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
