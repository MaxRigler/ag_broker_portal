import { supabase } from "@/integrations/supabase/client";

export interface RentCastPropertyData {
  ownerNames: string;
  state: string;
  propertyType: string;
  estimatedValue: number;
}

export async function lookupProperty(address: string): Promise<RentCastPropertyData> {
  const { data, error } = await supabase.functions.invoke('rentcast-property-lookup', {
    body: { address }
  });

  if (error) {
    console.error('RentCast API error:', error);
    throw new Error(error.message || 'Failed to lookup property');
  }

  if (data.error) {
    console.error('RentCast API returned error:', data.error);
    throw new Error(data.error);
  }

  return {
    ownerNames: data.ownerNames || 'Unknown Owner',
    state: data.state || '',
    propertyType: mapPropertyType(data.propertyType),
    estimatedValue: data.estimatedValue || 0
  };
}

/**
 * Maps RentCast property types to our dropdown options
 */
function mapPropertyType(rentCastType: string): string {
  const typeMap: Record<string, string> = {
    'Single Family': 'Single Family',
    'Condo': 'Condo',
    'Townhouse': 'Townhouse',
    'Multi-Family': 'Multi-Family',
    'Manufactured': 'Manufactured',
    'Apartment': 'Apartment',
    'Land': 'Land',
    // Handle variations
    'Single-Family': 'Single Family',
    'Multifamily': 'Multi-Family',
    'Mobile': 'Manufactured',
    'Mobile Home': 'Manufactured'
  };

  return typeMap[rentCastType] || rentCastType || 'Single Family';
}

/**
 * Detects ownership type from owner names by looking for business entity patterns
 */
export function detectOwnershipType(ownerNames: string): string {
  const upperNames = ownerNames.toUpperCase();

  // Check for LLC
  if (upperNames.includes('LLC') || upperNames.includes('L.L.C.') || upperNames.includes('LIMITED LIABILITY')) {
    return 'LLC';
  }

  // Check for Trust
  if (upperNames.includes('TRUST') || upperNames.includes('TRUSTEE') || upperNames.includes('TR ') || upperNames.includes(' TR')) {
    return 'Trust';
  }

  // Check for Corporation
  if (
    upperNames.includes('INC') || 
    upperNames.includes('CORP') || 
    upperNames.includes('INCORPORATED') || 
    upperNames.includes('CORPORATION') ||
    upperNames.includes(' CO.') ||
    upperNames.includes(' CO,')
  ) {
    return 'Corporation';
  }

  // Check for Partnership
  if (
    upperNames.includes('LP') || 
    upperNames.includes('L.P.') || 
    upperNames.includes('LIMITED PARTNERSHIP') ||
    upperNames.includes('LLP') ||
    upperNames.includes('L.L.P.') ||
    upperNames.includes('PARTNERSHIP')
  ) {
    return 'Partnership';
  }

  // Default to Personal for individuals
  return 'Personal';
}
