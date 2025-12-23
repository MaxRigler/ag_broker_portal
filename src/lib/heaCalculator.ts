/**
 * HEA (Home Equity Agreement) Calculator
 * Implements the 19.9% Annualized Cost Cap logic
 */

export interface HEACalculationResult {
  payoff: number;
  apr: number;
  isCapped: boolean;
  totalCost: number;
  rawUnlockShare: number;
  maximumUnlockShare: number;
  endingHomeValue: number;
}

export interface PropertyValidation {
  isValid: boolean;
  errors: string[];
  homeValue?: number;
  state?: string;
}

// Eligible states for HEA
export const ELIGIBLE_STATES = [
  'AZ', 'CA', 'FL', 'HI', 'ID', 'IN', 'KY', 'MI', 'MO', 'MT',
  'NV', 'NH', 'NJ', 'NM', 'NC', 'OH', 'OR', 'PA', 'SC', 'TN',
  'UT', 'VA', 'DC', 'WI', 'WY'
];

// Property types that are NOT eligible (matches RentCast values)
export const INELIGIBLE_PROPERTY_TYPES = ['Manufactured', 'Apartment', 'Land'];

// Ownership types that are NOT eligible
export const INELIGIBLE_OWNERSHIP_TYPES = ['LLC', 'Corporation', 'Partnership'];

/**
 * Calculates the HEA Payoff using the 19.9% Annualized Cost Cap logic
 */
export function calculateHEACost(
  investment: number,
  startingValue: number,
  termYears: number,
  hpaRate: number,
  multiplier: number = 2.0
): HEACalculationResult {
  const costLimit = 0.199; // 19.9% Cap
  const endingHomeValue = startingValue * Math.pow(1 + hpaRate, termYears);
  
  // 1. Calculate the Raw Unlock Share (Exchange Rate logic)
  const investmentPercentage = investment / startingValue;
  const unlockPercentage = investmentPercentage * multiplier;
  const rawUnlockShare = endingHomeValue * unlockPercentage;
  
  // 2. Calculate the Capped Amount (Maximum Unlock Share)
  const maximumUnlockShare = investment * Math.pow(1 + costLimit, termYears);
  
  // 3. Final Payoff is the lesser of the two
  const finalPayoff = Math.min(rawUnlockShare, maximumUnlockShare);
  const isCapped = rawUnlockShare > maximumUnlockShare;
  
  // 4. Calculate Effective APR
  const effectiveApr = Math.pow(finalPayoff / investment, 1 / termYears) - 1;
  
  return {
    payoff: finalPayoff,
    apr: effectiveApr * 100,
    isCapped: isCapped,
    totalCost: finalPayoff - investment,
    rawUnlockShare,
    maximumUnlockShare,
    endingHomeValue
  };
}

/**
 * Calculates the Annualized Cost and Settlement details for an HEA
 * based on the Unlock Product Guide logic.
 */
export const calculateHEASettlement = (
  startingHomeValue: number,
  initialFunding: number, // The gross "Investment Payment"
  annualAppreciation: number, // e.g., 0.03 for 3%
  settlementYear: number,
  exchangeRate: number = 2.0, // Standard multiplier
  annualizedCostLimit: number = 0.199 // The 19.9% cap
) => {
  // 1. Calculate the Investment Percentage and Unlock Percentage
  const investmentPercentage = initialFunding / startingHomeValue;
  const unlockPercentage = investmentPercentage * exchangeRate;

  // 2. Project the Ending Home Value (Projected Value at Settlement)
  const endingHomeValue = startingHomeValue * Math.pow(1 + annualAppreciation, settlementYear);

  // 3. Calculate the Raw Unlock Share (Before the Cap)
  const rawUnlockShare = endingHomeValue * unlockPercentage;

  // 4. Calculate the "Safety Net" Cap (Maximum Unlock Share)
  // Formula: Investment Payment * (1 + Annualized Cost Limit) ^ Term Years
  const maximumUnlockShare = initialFunding * Math.pow(1 + annualizedCostLimit, settlementYear);

  // 5. Determine the Actual Unlock Share (The lower of the two)
  const actualUnlockShare = Math.min(rawUnlockShare, maximumUnlockShare);

  // 6. Calculate the Final Annualized Cost for display
  // Formula: (Unlock Share / Investment Payment) ^ (1 / Years) - 1
  const annualizedCost = Math.pow(actualUnlockShare / initialFunding, 1 / settlementYear) - 1;

  // 7. Calculate Total Cost of Capital
  const totalCostOfCapital = actualUnlockShare - initialFunding;

  return {
    endingHomeValue,
    unlockPercentage: unlockPercentage * 100, // as percentage
    actualUnlockShare,
    totalCostOfCapital,
    annualizedCost: annualizedCost * 100, // as percentage (e.g., 10.5)
    isCapActive: rawUnlockShare > maximumUnlockShare,
  };
};

// Maximum Unlock Percentage (the future share Unlock can take)
export const MAX_UNLOCK_PERCENTAGE = 0.499; // 49.9%

// Standard Exchange Rate (multiplier)
export const EXCHANGE_RATE = 2.0;

/**
 * Calculate maximum investment based on CLTV and Unlock Percentage constraints
 * 
 * The maximum is constrained by:
 * 1. Unlock Percentage Cap: Maximum Unlock % (49.9%) ÷ Exchange Rate (2.0) = 24.95% of home value
 * 2. CLTV Cap: (Home Value × 80%) - Mortgage Balance
 * 3. Absolute Dollar Max: $500,000
 */
export function calculateMaxInvestment(
  homeValue: number,
  mortgageBalance: number,
  maxCLTV: number = 0.8,
  maxUnlockPercentage: number = MAX_UNLOCK_PERCENTAGE,
  exchangeRate: number = EXCHANGE_RATE,
  absoluteMax: number = 500000
): number {
  // Max based on CLTV
  const cltvMax = (homeValue * maxCLTV) - mortgageBalance;
  
  // Max based on Unlock Percentage constraint
  // Investment % = Unlock % ÷ Exchange Rate = 49.9% ÷ 2.0 = 24.95%
  const maxInvestmentPercentage = maxUnlockPercentage / exchangeRate;
  const percentMax = homeValue * maxInvestmentPercentage;
  
  // Return the minimum of all caps
  return Math.max(0, Math.min(cltvMax, percentMax, absoluteMax));
}

/**
 * Validate property eligibility
 */
export function validateProperty(
  state: string,
  propertyType: string,
  ownershipType: string,
  homeValue: number
): PropertyValidation {
  const errors: string[] = [];
  
  // Check state eligibility
  if (!ELIGIBLE_STATES.includes(state.toUpperCase())) {
    errors.push(`Property must be in an eligible state. ${state} is not currently supported.`);
  }
  
  // Check property type
  if (INELIGIBLE_PROPERTY_TYPES.includes(propertyType)) {
    errors.push(`${propertyType} properties are not eligible for this program.`);
  }
  
  // Check ownership type
  if (INELIGIBLE_OWNERSHIP_TYPES.includes(ownershipType)) {
    errors.push(`Properties owned by ${ownershipType} are not eligible. Property must be personally owned.`);
  }
  
  // Check home value range
  if (homeValue < 175000) {
    errors.push('Home value must be at least $175,000.');
  }
  if (homeValue > 3000000) {
    errors.push('Home value cannot exceed $3,000,000.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    homeValue: errors.length === 0 ? homeValue : undefined,
    state: errors.length === 0 ? state : undefined
  };
}

/**
 * Format currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
