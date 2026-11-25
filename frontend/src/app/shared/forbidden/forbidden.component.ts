import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'nobel-forbidden',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './forbidden.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenComponent {
  protected readonly auth = inject(AuthService);
}
