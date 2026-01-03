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
    const avmProp = avmData?.property?.[0];

    // Owner names
    // Check main property data first, then fall back to AVM data which often has it
    let ownerNames = 'Unknown Owner';

    // Helper to extract owner from an owner object
    const extractOwner = (ownerObj: any) => {
      const owners = [];
      if (ownerObj?.owner1) {
        if (ownerObj.owner1.fullname) owners.push(ownerObj.owner1.fullname);
        else if (ownerObj.owner1.lastname) owners.push(`${ownerObj.owner1.firstnameandmi || ownerObj.owner1.firstname || ''} ${ownerObj.owner1.lastname}`.trim());
      }
      if (ownerObj?.owner2) {
        if (ownerObj.owner2.fullname) owners.push(ownerObj.owner2.fullname);
        else if (ownerObj.owner2.lastname) owners.push(`${ownerObj.owner2.firstnameandmi || ownerObj.owner2.firstname || ''} ${ownerObj.owner2.lastname}`.trim());
      }
      return owners;
    };

    let ownersList: string[] = [];

    if (mainProp?.assessment?.owner) {
      ownersList = extractOwner(mainProp.assessment.owner);
    }

    // If not found in main property data, check AVM data structure
    if (ownersList.length === 0 && avmProp?.assessment?.owner) {
      ownersList = extractOwner(avmProp.assessment.owner);
    }

    // Sometimes it is directly under owner in some responses
    if (ownersList.length === 0 && avmProp?.owner) {
      ownersList = extractOwner(avmProp.owner);
    }

    if (ownersList.length > 0) {
      ownerNames = ownersList.join(' & ');
    }

    // State
    const state = mainProp?.address?.countrySubd || avmProp?.address?.countrySubd || ''; // "CO"

    // Property Type
    // Priority: summary.propertyType (e.g. "SINGLE FAMILY RESIDENCE") -> summary.propclass (e.g. "Single Family ... / Townhouse")
    const propertyType = mainProp?.summary?.propertyType || mainProp?.summary?.propclass || 'Single Family';

    // Estimated Mortgage Balance
    let estimatedMortgageBalance = 0;

    // Check assessment.mortgage for concurrent amounts (approximate) from main prop
    if (mainProp?.assessment?.mortgage) {
      const m = mainProp.assessment.mortgage;
      const amt1 = m.FirstConcAmount || 0;
      const amt2 = m.SecondConcAmount || 0;
      estimatedMortgageBalance = amt1 + amt2;
    }

    // Check AVM data for sale/mortgage info if main prop was empty
    if (estimatedMortgageBalance === 0 && avmProp?.sale?.mortgage) {
      const m = avmProp.sale.mortgage;
      const amt1 = m.FirstConcurrent?.amount || 0;
      const amt2 = m.SecondConcurrent?.amount || 0;
      estimatedMortgageBalance = amt1 + amt2;
    }

    const result = {
      ownerNames,
      state,
      propertyType,
      estimatedValue,
      estimatedMortgageBalance,
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
