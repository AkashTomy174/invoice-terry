import { Customer, ShopSettings, RoundOffMode } from './types';

export interface BillingCalculationInput {
  weight: number;
  unit: 'g' | 'kg';
  ratePerKg?: number;
  customer?: Customer | null;
  shopSettings?: ShopSettings;
  roundOffMode?: RoundOffMode;
  manualAmount?: number | string;
  customRoundOff?: number;
}

export interface BillingCalculationResult {
  weightGrams: number;
  weightKg: number;
  ratePerKg: number;
  subtotal: number;
  isRewardUnlocked: boolean;
  canApplyReward: boolean;
  rewardReason?: string;
  discountAmount: number;
  baseAmount: number;
  roundOffAmount: number;
  roundOffMode: RoundOffMode;
  manualAmount?: number;
  finalAmount: number;
  loyaltyMessage: string;
  nextLoyaltyCount: number;
  nextRewardUnlocked: boolean;
}

/**
 * Perform exact decimal calculation rounded to 2 decimal places
 */
export function calculateBilling(input: BillingCalculationInput): BillingCalculationResult {
  const ratePerKg = input.ratePerKg ?? input.shopSettings?.rate_per_kg ?? 899;
  const minGrams = input.shopSettings?.min_weight_grams ?? 1000;
  const requiredVisits = input.shopSettings?.required_visits ?? 5;

  // 50% discount on 1000g (1 KG)
  // Regular 1000g price = 1.0 * ratePerKg
  // Half price discount on 1000g = ratePerKg * 0.5
  const halfPrice1kgDiscount = Math.round((ratePerKg * 0.5) * 100) / 100;
  const rewardAmount = input.shopSettings?.loyalty_discount && input.shopSettings.loyalty_discount !== 299
    ? input.shopSettings.loyalty_discount
    : halfPrice1kgDiscount;

  // Normalize weight to grams and kilograms
  const weightGrams = input.unit === 'kg' 
    ? Math.round(input.weight * 1000) 
    : Math.round(input.weight);

  const weightKg = Number((weightGrams / 1000).toFixed(3));

  // Subtotal = grams * rate / 1000
  const rawSubtotal = (weightGrams * ratePerKg) / 1000;
  const subtotal = Math.round(rawSubtotal * 100) / 100;

  let isRewardUnlocked = false;
  let canApplyReward = false;
  let rewardReason: string | undefined;
  let discountAmount = 0;
  let nextLoyaltyCount = 1;
  let nextRewardUnlocked = false;
  let loyaltyMessage = '';

  const customer = input.customer;

  if (!customer) {
    // New customer first purchase
    nextLoyaltyCount = 1;
    loyaltyMessage = generateLoyaltyMessage(1, requiredVisits, false, false, rewardAmount);
  } else {
    // Check if customer already has reward unlocked (from 5 previous purchases)
    isRewardUnlocked = customer.loyalty_reward_unlocked || customer.loyalty_count >= requiredVisits;

    if (isRewardUnlocked) {
      if (weightGrams >= minGrams) {
        canApplyReward = true;
        // Discount is strictly 50% off on 1000g (1 KG). Remaining weight is at regular rate!
        discountAmount = rewardAmount;
        // Upon 6th visit redemption, progress resets to 0 and loyalty cycle repeats!
        nextLoyaltyCount = 0;
        nextRewardUnlocked = false;
        loyaltyMessage = `🎁 50% OFF on 1 KG Loyalty Reward Applied (-₹${rewardAmount.toFixed(2)})! Thank you for shopping with us!`;
      } else {
        canApplyReward = false;
        rewardReason = `Minimum 1 KG (1000g) purchase required to redeem 50% off reward.`;
        // Customer keeps the unlocked reward for their next 1kg+ purchase
        nextLoyaltyCount = customer.loyalty_count;
        nextRewardUnlocked = true;
        loyaltyMessage = `Minimum 1 KG (1000g) purchase required to use your 50% OFF on 1 KG reward. Your reward remains unlocked!`;
      }
    } else {
      // Normal purchase progress towards 5 purchases
      const newCount = customer.loyalty_count + 1;
      if (newCount >= requiredVisits) {
        nextLoyaltyCount = requiredVisits;
        nextRewardUnlocked = true;
        loyaltyMessage = `🔥 Congratulations! You have completed 5 purchases and unlocked your 50% OFF on 1 KG Loyalty Reward! Use it on your next purchase of 1 KG or more.`;
      } else {
        nextLoyaltyCount = newCount;
        nextRewardUnlocked = false;
        loyaltyMessage = generateLoyaltyMessage(newCount, requiredVisits, false, false, rewardAmount);
      }
    }
  }

  const baseAmount = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  const roundOffMode: RoundOffMode =
    input.roundOffMode ?? input.shopSettings?.round_off_mode ?? 'FLOOR_10';

  let roundOffAmount = 0;
  let finalAmount = baseAmount;
  let manualNumeric: number | undefined;

  if (roundOffMode === 'MANUAL') {
    const rawManual = typeof input.manualAmount === 'number'
      ? input.manualAmount
      : parseFloat(String(input.manualAmount ?? ''));
    if (!isNaN(rawManual) && rawManual >= 0) {
      manualNumeric = Math.round(rawManual * 100) / 100;
      finalAmount = manualNumeric;
      roundOffAmount = Math.round((finalAmount - baseAmount) * 100) / 100;
    } else {
      finalAmount = baseAmount;
      roundOffAmount = 0;
    }
  } else if (roundOffMode === 'FLOOR_10') {
    // Round down to tens (Discount): E.g. 779 -> 770 (-9.00), 899 -> 890 (-9.00)
    const rounded = Math.floor(baseAmount / 10) * 10;
    roundOffAmount = Math.round((rounded - baseAmount) * 100) / 100;
    finalAmount = Math.max(0, Math.round((baseAmount + roundOffAmount) * 100) / 100);
  } else if (roundOffMode === 'NONE') {
    // Exact: no rounding
    roundOffAmount = 0;
    finalAmount = baseAmount;
  } else if (roundOffMode === 'NEAREST_10') {
    // E.g. 779 -> 780 (+1.00), 815 -> 820 (+5.00), 459 -> 460 (+1.00)
    const rounded = Math.round(baseAmount / 10) * 10;
    roundOffAmount = Math.round((rounded - baseAmount) * 100) / 100;
    finalAmount = Math.max(0, Math.round((baseAmount + roundOffAmount) * 100) / 100);
  } else if (roundOffMode === 'NEAREST_5') {
    const rounded = Math.round(baseAmount / 5) * 5;
    roundOffAmount = Math.round((rounded - baseAmount) * 100) / 100;
    finalAmount = Math.max(0, Math.round((baseAmount + roundOffAmount) * 100) / 100);
  } else if (roundOffMode === 'NEAREST_1') {
    const rounded = Math.round(baseAmount);
    roundOffAmount = Math.round((rounded - baseAmount) * 100) / 100;
    finalAmount = Math.max(0, Math.round((baseAmount + roundOffAmount) * 100) / 100);
  } else if (roundOffMode === 'CUSTOM' && typeof input.customRoundOff === 'number') {
    roundOffAmount = Math.round(input.customRoundOff * 100) / 100;
    finalAmount = Math.max(0, Math.round((baseAmount + roundOffAmount) * 100) / 100);
  }

  return {
    weightGrams,
    weightKg,
    ratePerKg,
    subtotal,
    isRewardUnlocked,
    canApplyReward,
    rewardReason,
    discountAmount,
    baseAmount,
    roundOffAmount,
    roundOffMode,
    finalAmount,
    loyaltyMessage,
    nextLoyaltyCount,
    nextRewardUnlocked,
  };
}

/**
 * Generate standard loyalty milestone messages
 */
export function generateLoyaltyMessage(
  count: number,
  required: number,
  unlocked: boolean,
  redeemed: boolean,
  rewardDiscount: number = 449.50
): string {
  if (redeemed) {
    return `🎁 50% OFF on 1 KG Loyalty Reward Applied (-₹${rewardDiscount.toFixed(2)})! Thank you for shopping with us!`;
  }
  if (unlocked || count >= required) {
    return '🔥 Congratulations! You have completed 5 purchases and unlocked your 50% OFF on 1 KG Loyalty Reward! Use it on your next purchase of 1 KG or more.';
  }

  const remaining = required - count;
  return `🎉 Purchase ${count} completed! ${remaining} more purchase${remaining > 1 ? 's' : ''} to unlock 50% OFF on 1 KG Loyalty Reward.`;
}
