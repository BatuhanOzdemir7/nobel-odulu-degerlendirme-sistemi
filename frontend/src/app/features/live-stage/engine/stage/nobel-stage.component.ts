import { DOCUMENT } from '@angular/common';
import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, isDevMode, OnDestroy, signal,
  viewChild,
} from '@angular/core';
import { ActivityStreamService } from '../../../../core/events/activity-stream.service';
import { createDemoEvent } from '../../../../core/events/demo-fixtures';
import { CharacterRigComponent, type Vec2 } from '../character-rig';
import type { StageCharacterCommand } from '../../stage/stage.contract';
import { NobelStageDirector, type StageHost } from './stage.director';
import { stageDemoFixtures } from './stage.demo';
import { SEAT_Y } from './stage.layout';

@Component({
  selector: 'app-nobel-stage',
  standalone: true,
  imports: [CharacterRigComponent],
  templateUrl: './nobel-stage.component.html',
  styleUrl: './nobel-stage.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NobelStageComponent implements StageHost, OnDestroy {
  private readonly stageEl = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly view = inject(DOCUMENT).defaultView;
  private readonly motionQuery = this.view?.matchMedia?.('(prefers-reduced-motion: reduce)');
  private readonly reduced = signal(this.motionQuery?.matches ?? false);
  readonly demoFixtures = isDevMode() && new URLSearchParams(this.view?.location.search).get('demo') === '1'
    ? stageDemoFixtures() : [];
  private readonly demoStream = this.demoFixtures.length ? inject(ActivityStreamService) : null;
  readonly director = new NobelStageDirector(this);
  private readonly refreshGaze = () => this.director.refreshGaze();
  private readonly resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(this.refreshGaze) : null;
  private readonly onMotionChange = (event: MediaQueryListEvent) => this.reduced.set(event.matches);

  get reducedMotion(): boolean { return this.reduced(); }

  protected readonly expertCount = computed(() => this.director.actors().filter((actor) => actor.role === 'UZMAN').length);
  protected readonly seatY = SEAT_Y;

  readonly pipSlots = computed(() => {
    const { cast, required } = this.director.pips();
    return Array.from({ length: Math.max(required, 3) }, (_, i) => i < cast);
  });
  readonly flights = computed(() => { const f = this.director.flight(); return f ? [f] : []; });
  readonly flashes = computed(() => { const n = this.director.flash(); return n > 0 ? [n] : []; });
  readonly confettiPieces = computed(() => {
    const rev = this.director.confetti();
    return rev === 0 || this.reducedMotion
      ? []
      : Array.from({ length: 28 }, (_, i) => ({ id: `${rev}-${i}`, left: (i * 37) % 100, delay: (i % 7) * 70, hue: (i * 47) % 360 }));
  });

  constructor() {
    afterNextRender(() => {
      const stage = this.stageEl()?.nativeElement;
      if (stage) this.resizeObserver?.observe(stage);
      this.view?.addEventListener('scroll', this.refreshGaze, { capture: true, passive: true });
      this.view?.addEventListener('resize', this.refreshGaze, { passive: true });
      this.motionQuery?.addEventListener('change', this.onMotionChange);
    });
  }

  play(command: StageCharacterCommand): void { this.director.play(command); }

  protected playDemo(fixture: ReturnType<typeof stageDemoFixtures>[number]): void {
    this.demoStream?.inject(createDemoEvent(fixture));
  }

  centerOf(ref: string): Vec2 | null {
    const root = this.stageEl()?.nativeElement;
    if (!root) return null;
    if (ref === 'edge:right') {
      const r = root.getBoundingClientRect();
      return { x: r.right, y: r.top + r.height * 0.5 };
    }
    const [kind, id] = ref.split(':');
    const el = kind === 'actor'
      ? root.querySelector<HTMLElement>(`[data-actor-id="${id}"] .actor__body`)
      : root.querySelector<HTMLElement>(`[data-ref="${ref}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * (kind === 'actor' ? 0.2 : 0.5) }; // aktörde göz hizası
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.view?.removeEventListener('scroll', this.refreshGaze, true);
    this.view?.removeEventListener('resize', this.refreshGaze);
    this.motionQuery?.removeEventListener('change', this.onMotionChange);
    this.director.destroy();
  }
}
