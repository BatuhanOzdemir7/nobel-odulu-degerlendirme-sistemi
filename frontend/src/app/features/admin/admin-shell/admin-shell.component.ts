import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LiveDockComponent } from '../../live-stage/live-dock.component';

@Component({
  selector: 'nobel-admin-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LiveDockComponent],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
