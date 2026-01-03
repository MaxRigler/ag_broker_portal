import { supabase } from "@/integrations/supabase/client";

export interface AtomPropertyData {
    ownerNames: string;
    state: string;
    propertyType: string;
    estimatedValue: number;
}

export async function lookupProperty(address: string): Promise<AtomPropertyData> {
    const { data, error } = await supabase.functions.invoke('atom-property-lookup', {
        body: { address }
    });

    if (error) {
        console.error('Atom API error:', error);
        throw new Error(error.message || 'Failed to lookup property');
    }

    if (data.error) {
        console.error('Atom API returned error:', data.error);
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
 * Maps Atom property types to our dropdown options
 */
function mapPropertyType(atomType: string): string {
    // Atom "propclass" or similar usually returns these
    const typeMap: Record<string, string> = {
        'Single Family Residence': 'Single Family',
        'Single Family': 'Single Family',
        'Condominium': 'Condo',
        'Condo': 'Condo',
        'Townhouse': 'Townhouse',
        'Town House': 'Townhouse',
        'Multi-Family': 'Multi-Family',
        'Multifamily': 'Multi-Family',
        'Duplex': 'Multi-Family',
        'Triplex': 'Multi-Family',
        'Fourplex': 'Multi-Family',
        'Apartment': 'Apartment',
        'Mobile Home': 'Manufactured',
        'Manufactured': 'Manufactured',
        'Land': 'Land',
        'Vacant Land': 'Land',
    };

    return typeMap[atomType] || atomType || 'Single Family';
}

/**
 * Detects ownership type from owner names by looking for business entity patterns
 * (Reused from previous logic as owner names strings are similar)
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
