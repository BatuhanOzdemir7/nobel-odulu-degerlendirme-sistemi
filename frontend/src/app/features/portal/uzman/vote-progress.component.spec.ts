import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { VoteProgressComponent } from './vote-progress.component';

describe('VoteProgressComponent', () => {
  it('shows the received votes and quorum', () => {
    const fixture = TestBed.createComponent(VoteProgressComponent);
    fixture.componentRef.setInput('cast', 2);
    fixture.componentRef.setInput('required', 3);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.textContent).toContain('2 / 3 oy');
    expect(page.querySelector('progress')?.value).toBe(2);
    expect(page.querySelector('progress')?.max).toBe(3);
  });
});
