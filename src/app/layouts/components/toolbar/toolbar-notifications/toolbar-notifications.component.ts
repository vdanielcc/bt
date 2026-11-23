import {NgIf} from '@angular/common';
import {MatBadgeModule} from '@angular/material/badge';
import {NotificationManagementService} from '../../../../pages/academy-management/services/notification-management.service';
import {AuthService} from '../../../../core/auth/auth.service';
import {DestroyRef,inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {timer,of,switchMap,catchError} from 'rxjs';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { VexPopoverService } from '@vex/components/vex-popover/vex-popover.service';
import { ToolbarNotificationsDropdownComponent } from './toolbar-notifications-dropdown/toolbar-notifications-dropdown.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'vex-toolbar-notifications',
  templateUrl: './toolbar-notifications.component.html',
  styleUrls: ['./toolbar-notifications.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [NgIf,MatBadgeModule,MatButtonModule, MatIconModule]
})
export class ToolbarNotificationsComponent implements OnInit {
  @ViewChild('originRef', { static: true, read: ElementRef })
  originRef?: ElementRef;

  canView=false;unread=0;private destroy=inject(DestroyRef);
  dropdownOpen: boolean = false;

  constructor(
    private popover: VexPopoverService,
    private service:NotificationManagementService,
    private auth:AuthService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {this.auth.currentUser$.pipe(switchMap(session=>session?this.service.capabilities().pipe(switchMap(c=>{this.canView=c.permissions.includes('notification.view');return this.canView?timer(0,60000).pipe(switchMap(()=>this.service.mine().pipe(catchError(()=>of(null))))):of(null);}),catchError(()=>of(null))):of(null)),takeUntilDestroyed(this.destroy)).subscribe(r=>{this.canView=!!r;this.unread=r?.unreadCount||0;this.cd.markForCheck();});}

  showPopover() {
    this.dropdownOpen = true;
    this.cd.markForCheck();

    if (!this.originRef) {
      throw new Error('originRef undefined!');
    }

    const popoverRef = this.popover.open({
      content: ToolbarNotificationsDropdownComponent,
      origin: this.originRef,
      offsetY: 12,
      position: [
        {
          originX: 'center',
          originY: 'top',
          overlayX: 'center',
          overlayY: 'bottom'
        },
        {
          originX: 'end',
          originY: 'bottom',
          overlayX: 'end',
          overlayY: 'top'
        }
      ]
    });

    popoverRef.afterClosed$.subscribe(() => {
      this.dropdownOpen = false;
      this.cd.markForCheck();
    });
  }
}
