export interface BillingChargeRead {
 id:number;academyId:number;studentId:number;studentName:string;billingConceptId:number;conceptCode:string;conceptName:string;
 billingPlanId:number|null;classEnrollmentId:number|null;classSessionId:number|null;eventId:number|null;gradeHistoryId:number|null;
 description:string;referencePeriod:string|null;amount:number;discountAmount:number;surchargeAmount:number;totalAmount:number;paidAmount:number;balance:number;
 dueDate:string|null;graceDays:number;status:string;effectiveStatus:string;isOverdue:boolean;generatedAutomatically:boolean;createdAt:string;updatedAt:string|null;
}
export interface ChargeSummary {pendingCount:number;overdueCount:number;pendingAmount:number;overdueAmount:number;chargesThisMonth:number;}
export interface ChargePage {items:BillingChargeRead[];total:number;page:number;pageSize:number;summary:ChargeSummary;}
export interface ChargeFilters {eligibleForPayment?:boolean;isOverdue?:boolean;academyId?:number;search?:string;studentId?:number;conceptId?:number;status?:string;referencePeriod?:string;dateFrom?:string;dateTo?:string;dueDateFrom?:string;dueDateTo?:string;page?:number;pageSize?:number;}
export interface GenerationResult {created:number;generated:number;existing:number;skipped:number;errors:string[];}
export interface ChargeWrite {studentId:number;billingConceptId:number;description:string;amount:number;discountAmount:number;surchargeAmount:number;dueDate:string|null;referencePeriod:string|null;classEnrollmentId?:number|null;billingPlanId?:number|null;eventId?:number|null;gradeHistoryId?:number|null;graceDays?:number;}
export interface ChargeUpdate {description:string;amount:number;discountAmount:number;surchargeAmount:number;dueDate:string|null;}
export interface OverduePage {items:{studentId:number;studentName:string;overdueCharges:number;overdueAmount:number;daysOverdue:number;}[];total:number;page:number;pageSize:number;}
export interface ChargeReferences {payers?:{id:number;name:string}[];events:{id:number;name:string}[];enrollments:{id:number;name:string;billingPlanId:number|null;status:string}[];examinations:{id:number;effectiveDate:string;result:string}[];}
export const chargeStatuses:Record<string,string>={PENDING:'Pendiente',PARTIAL:'Parcial',PAID:'Pagado',VOID:'Anulado'};
export const conceptLabels:Record<string,string>={MONTHLY_FEE:'Mensualidad',ENROLLMENT_FEE:'Matrícula',CLASS_FEE:'Clase',EVENT_FEE:'Evento',EXAM_FEE:'Examen',OTHER:'Otros'};

export const chargeEffectiveStatuses:Record<string,string>={...chargeStatuses,OVERDUE:"Vencido"};
