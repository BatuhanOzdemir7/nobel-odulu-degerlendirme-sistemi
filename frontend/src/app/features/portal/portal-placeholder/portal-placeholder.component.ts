import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'nobel-portal-placeholder',
  standalone: true,
  templateUrl: './portal-placeholder.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalPlaceholderComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
