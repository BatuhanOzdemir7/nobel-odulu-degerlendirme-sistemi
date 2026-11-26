import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ErLiveMapComponent } from './er-live-map.component';

describe('ErLiveMapComponent', () => {
  it('marks active nodes and combines explicit and inferred edges', () => {
    const fixture = TestBed.createComponent(ErLiveMapComponent);
    const root: HTMLElement = fixture.nativeElement;
    fixture.componentRef.setInput('highlight', {
      nodes: ['KURULUS', 'aday_gosterir'], edges: ['UZMAN-uyesidir'], severity: 'success',
    });
    fixture.detectChanges();
    expect(root.querySelectorAll('.node-active')).toHaveLength(2);
    expect(root.querySelector('[data-er-edge="KURULUS-aday_gosterir"]')?.classList.contains('edge-active')).toBe(true);
    expect(root.querySelector('[data-er-edge="UZMAN-uyesidir"]')?.classList.contains('edge-active')).toBe(true);
    expect(root.querySelector('svg')?.getAttribute('aria-label')).toContain('KURULUŞ');
  });

  it('uses error classes with derived edges and ignores unknown identifiers', () => {
    const fixture = TestBed.createComponent(ErLiveMapComponent);
    const root: HTMLElement = fixture.nativeElement;
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      fixture.componentRef.setInput('highlight', {
        nodes: ['UZMAN', 'uyesidir', 'unknown'], edges: [], severity: 'error',
      });
      fixture.detectChanges();
      expect(root.querySelectorAll('.node-error')).toHaveLength(2);
      expect(root.querySelectorAll('.edge-error')).toHaveLength(1);
      expect(root.querySelector('[data-er-edge="UZMAN-uyesidir"]')?.classList.contains('edge-error')).toBe(true);
      expect(warning).toHaveBeenCalledWith('Bilinmeyen ER kimliği:', 'unknown');
    } finally {
      warning.mockRestore();
    }
  });
});
