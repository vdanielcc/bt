import { BillingPayment } from './academy-management.models';
import { BillingChargeRead } from './billing-charge.models';
export interface BillingPaymentRead extends BillingPayment {status:string;studentName:string;payerName:string|null;allocatedAmount:number;remainingToAllocate:number;confirmedBy:number|null;confirmedAt:string|null;refundedBy:number|null;refundedAt:string|null;refundReason?:string|null;}
export interface BillingPaymentDetail {academyTimeZone?:string;affectedCharges?:BillingChargeRead[];accountStatement?:AccountStatement;payment:BillingPaymentRead;allocations:{id:number;chargeId:number;amount:number;description:string;status:string;dueDate:string|null;createdAt:string;createdBy:number|null}[];}
export interface PaymentPage {items:BillingPaymentRead[];total:number;page:number;pageSize:number;}
export interface PaymentFilters {search?:string;studentId?:number;paymentMethod?:string;status?:string;dateFrom?:string;dateTo?:string;page?:number;pageSize?:number;}
export interface PaymentUpdate {amount:number;paymentMethod:string;paidAt:string;transactionReference:string|null;notes:string|null;}
export interface PaymentWrite extends PaymentUpdate {academyId:number;studentId:number;payerPersonId:number|null;}
export interface AccountStatement {studentId:number;totalCharged:number;totalPaid:number;totalPending:number;totalOverdue:number;balance:number;charges:BillingChargeRead[];payments:BillingPaymentRead[];}
export const paymentStatuses:Record<string,string>={PENDING:'Pendiente',CONFIRMED:'Confirmado',REJECTED:'Rechazado',VOID:'Anulado',REFUNDED:'Reembolsado'};
export const paymentMethods:Record<string,string>={CASH:'Efectivo',TRANSFER:'Transferencia',CARD:'Tarjeta',WEBPAY:'Webpay',OTHER:'Otro'};
export function paymentCents(amount:number):number{return Math.round(Number(amount)*100);}
