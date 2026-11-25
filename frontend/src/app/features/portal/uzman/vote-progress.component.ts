import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'nobel-vote-progress',
  template: `
    <div class="progress">
      <progress [attr.max]="required()" [value]="cast()" aria-label="Komite oy doluluğu"></progress>
      <span>{{ cast() }} / {{ required() }} oy</span>
    </div>
  `,
  styles: [`.progress { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
    progress { accent-color: #176b5c; width: min(180px, 70%); }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoteProgressComponent {
  readonly cast = input.required<number>();
  readonly required = input.required<number>();
}
