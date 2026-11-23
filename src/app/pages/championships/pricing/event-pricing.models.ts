import { RegistrationCounts } from '../invitations/registration-counts.component';
export type PricingStrategy = 'BY_CATEGORY' | 'BY_GROUP' | 'BY_COMBINATION';
export interface CombinationTariff { id: string; registrationType: 'INDIVIDUAL' | 'EQUIPO'; isPresale: boolean; isActive: boolean; price: number; terms: { modalityId: number; quantity: number }[]; }
export interface PricingCalculationType { id: number; code: PricingStrategy; name: string; description: string | null; isActive: boolean; }
export interface EventPriceGroup { id: number; name: string; groupOrder: number; basePrice?: number | null; additionalPrice: number | null; isBase: boolean; isActive: boolean; }
export interface EventCategoryPricing { categoryId: number; priceGroupId: number | null; isFree: boolean; isActive: boolean; }
export interface EventModalityPricing { modalityId: number; isFree: boolean; }
export interface EventPriceRule {
  id: number; eventId: number; calculationTypeId: number; calculationType: PricingStrategy;
  name: string; description: string | null; basePrice: number; additionalPrice: number; priority: number; isActive: boolean;
  groups: EventPriceGroup[]; categories: EventCategoryPricing[]; modalities: EventModalityPricing[];
  combinations?: CombinationTariff[];
}
export interface PricingCategoryOption { categoryId: number; categoryName: string; modalityId: number; modalityName: string; isTeam?: boolean; isCoach?: boolean; }
export function isCoachCategory(category: PricingCategoryOption): boolean { return category.isCoach ?? (category.categoryName.toUpperCase().includes('COACH') || category.modalityName.toUpperCase() === 'COACH'); }
export function simulationRegistrationType(categories: PricingCategoryOption[]): 'INDIVIDUAL' | 'EQUIPO' | null {
  const selected = categories.filter(c => !isCoachCategory(c));
  const teams = selected.filter(c => c.isTeam ?? [4,5,6,7].includes(c.modalityId));
  if (teams.length && teams.length !== selected.length) return null;
  return teams.length ? 'EQUIPO' : 'INDIVIDUAL';
}
export interface EventPricingConfiguration { mode: 'LEGACY' | 'PRICING_ENGINE'; rule: EventPriceRule | null; calculationTypes: PricingCalculationType[]; categories: PricingCategoryOption[]; }
export interface PricingCalculationRequest { categoryIds: number[]; competitorId?: number; studentId?: number; registrationType?: 'INDIVIDUAL' | 'EQUIPO' | 'SEMINARIO'; }
export interface EnrollmentPriceCategory extends PricingCategoryOption { isFree: boolean; priceGroupId: number | null; priceGroupName: string | null; amount: number; reason: string; }
export interface EnrollmentPriceGroup { priceGroupId: number; name: string; isBase: boolean; amount: number; }
export interface EnrollmentPriceResult {
  status?: 'CALCULATED' | 'PENDING_RATE'; warning?: string; pricingPeriod?: string;
  parts?: { tariffId: string; period: string; amount: number; categoryIds: number[]; terms: { modalityId: number; quantity: number }[] }[];
  eventId: number; competitorId: number | null; priceRuleId: number | null; calculationType: PricingStrategy | 'LEGACY';
  basePrice: number; additionalPrice: number; billableUnits: number; baseAmount: number; additionalAmount: number;
  discountAmount: number; totalAmount: number; categories: EnrollmentPriceCategory[]; groups: EnrollmentPriceGroup[];
}
export interface CompetitorCharge { id: number; calculatedAt: string; calculation: EnrollmentPriceResult; }
export interface TariffHistory extends CompetitorCharge { version: number; reason: string; calculatedBy: number | null; isCurrent: boolean; }
export interface TariffBatch { approvedAmount?: number; pendingAmount?: number; balance?: number; availableAmount?: number; creditAmount?: number; version?: number; isHistorical?: boolean; id: number; period: string; total: number; status: string; createdAt: string; presaleEndAt: string | null; items: { competitorId: number; chargeId: number; amount: number; calculation: EnrollmentPriceResult }[]; }
export interface PricingSummary extends Partial<RegistrationCounts> { totalCompetitors: number; freeRegistrations: number; billableUnits: number; totalCalculated: number; pricingComplete: boolean; }
