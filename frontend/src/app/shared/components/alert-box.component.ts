import { Component, Input } from '@angular/core';

@Component({
  selector: 'nobel-alert-box',
  standalone: true,
  template: '<p class="notice" [class.notice-error]="isError" role="status">{{ message }}</p>',
  styles: [':host { display: block; }']
})
export class AlertBoxComponent {
  @Input() message = '';
  @Input() isError = false;
}
