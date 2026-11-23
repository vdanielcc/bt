import { Component } from '@angular/core';
import { BillingChargeListComponent } from './billing-charge-list.component';
@Component({standalone:true,selector:'bte-billing-dashboard',imports:[BillingChargeListComponent],template:`<bte-billing-charge-list [summaryOnly]="true" />`})
export class BillingDashboardComponent {}
