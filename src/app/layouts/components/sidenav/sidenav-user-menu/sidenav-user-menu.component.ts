import { Component, OnInit } from '@angular/core';
import { VexPopoverRef } from '@vex/components/vex-popover/vex-popover-ref';
import { MatRippleModule } from '@angular/material/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/auth/auth.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { NgIf } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ImpersonateDialogComponent } from '../../../../core/auth/impersonate-dialog.component';

@Component({
  selector: 'vex-sidenav-user-menu',
  templateUrl: './sidenav-user-menu.component.html',
  styleUrls: ['./sidenav-user-menu.component.scss'],
  imports: [MatRippleModule, RouterLink, MatIconModule, TranslatePipe, NgIf],
  standalone: true
})
export class SidenavUserMenuComponent implements OnInit {
  constructor(
    private readonly popoverRef: VexPopoverRef,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {}

  get canSwitchAccount(): boolean {
    return this.authService.getCurrentUser()?.rol === 'admin';
  }

  switchAccount(): void {
    if (!this.canSwitchAccount) return;
    this.popoverRef.close();
    this.dialog.open(ImpersonateDialogComponent, { width: '560px', maxWidth: '95vw' });
  }

  close(): void {
    /** Wait for animation to complete and then close */
    setTimeout(() => this.popoverRef.close(), 250);
  }

  signOut(): void {
    this.popoverRef.close();
    this.authService.logout().subscribe({
      next: () => this.redirectToLogin(),
      error: () => this.redirectToLogin()
    });
  }

  private redirectToLogin(): void {
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
