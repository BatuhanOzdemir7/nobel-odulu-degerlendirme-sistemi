/**
 * character-interaction.controller.ts — Bağımsız etkileşim katmanı (Angular'a bağımlı değildir).
 *
 * Görevi: DOM olaylarını dinleyip normalize edilmiş koordinat/durum olaylarına çevirmek ve
 * durum makinesine (character-state.machine.ts) göndermek; zaman bazlı geçişler için
 * zamanlayıcıları yönetmek. Hareket matematiği burada değil, kinematics dosyasındadır.
 *
 * Dinlenen olaylar:
 *  pointermove / pointerdown / pointerout (pencere)   → pointer-move / pointer-leave
 *  focusin / focusout (alan seçici ile)               → field-focus / field-blur
 *  input / keyup / click / select / compositionend,
 *  selectionchange, scroll (yakalama), resize         → field-update (caret), layout bildirimi
 *  IntersectionObserver, visibilitychange,
 *  prefers-reduced-motion                             → environment
 *
 * Kaynak karşılıkları: guardian-head.ts (görünürlük + reduced-motion kapısı, göz kırpma ve
 * konuşma zamanlayıcıları), guest-postit-editor.ts (selectionchange/resize/ResizeObserver ile
 * caret kuyruğu, 180 ms yazma bayrağı), work-page.ts (pencere geneli pointermove).
 */
import { CaretTracker, isCaretTrackable, type CaretField } from './caret-tracker.util';
import { clampDrag, nextBlinkDelay } from './character-kinematics.math';
import { INITIAL_CHARACTER_STATE, reduceCharacter } from './character-state.machine';
import type {
  CharacterActivity,
  CharacterEmote,
  CharacterEvent,
  CharacterState,
  EyeSide,
  FingerId,
  InteractionTiming,
  TrackingOptions,
  Vec2,
} from './character.types';

export interface InteractionOptions {
  /** Karakterin kök elemanı: uyandırma isabeti ve görünürlük gözlemi için. */
  readonly root: HTMLElement;
  readonly timing: InteractionTiming;
  readonly tracking: TrackingOptions;
}

export type StateListener = (
  next: CharacterState,
  prev: CharacterState,
  event: CharacterEvent,
) => void;

/** Uyuyan karakter, işaretçi kutusunun bu kadar (px) yakınındayken uyanır. */
const WAKE_MARGIN_PX = 24;

export class CharacterInteractionController {
  private state: CharacterState = INITIAL_CHARACTER_STATE;
  private readonly listeners = new Set<StateListener>();
  private readonly layoutListeners = new Set<() => void>();
  private readonly timers = new Map<string, number>();
  private readonly disposers: Array<() => void> = [];
  private readonly doc: Document;
  private readonly view: Window & typeof globalThis;
  private readonly tracker: CaretTracker;
  private observer: IntersectionObserver | null = null;
  private focused: Element | null = null;
  private field: CaretField | null = null;
  private privacy = false;
  private pendingPointer: Vec2 | null = null;
  private pointerFrame: number | null = null;
  private fieldFrame: number | null = null;
  private destroyed = false;

  constructor(private readonly opts: InteractionOptions) {
    const view = opts.root.ownerDocument.defaultView;
    if (!view) throw new Error('CharacterInteractionController: window bulunamadı.');
    this.view = view;
    this.doc = opts.root.ownerDocument;
    this.tracker = new CaretTracker(this.doc);
    this.attach();
    this.armIdle();
    // Başlangıç durumu değişmediyse dispatch erken döner; döngüleri burada açıkça başlat.
    this.syncBlink();
    this.syncPeek();
  }

  /* ───────────── Genel API ───────────── */

  get snapshot(): CharacterState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Kaydırma/yeniden boyutlandırmada çağrılır; göz hedefi ekranda yer değiştirmiş olabilir. */
  onLayout(listener: () => void): () => void {
    this.layoutListeners.add(listener);
    return () => this.layoutListeners.delete(listener);
  }

  dispatch(event: CharacterEvent): void {
    if (this.destroyed) return;
    const prev = this.state;
    const next = reduceCharacter(prev, event);
    if (next === prev) return;
    this.state = next;
    for (const listener of this.listeners) listener(next, prev, event);
    this.syncBlink();
    this.syncPeek();
  }

  setActivity(activity: CharacterActivity): void {
    this.dispatch({ type: 'set-activity', activity });
  }

  wake(): void {
    if (!this.state.sleeping) return;
    this.dispatch({ type: 'wake' });
    this.after('startle', this.timing.startleMs, () => this.dispatch({ type: 'startle-end' }));
    this.armIdle();
  }

  /** Zamanlı irkilme (uykudan uyanmaktan bağımsız). */
  startle(): void {
    this.dispatch({ type: 'startle' });
    this.after('startle', this.timing.startleMs, () => this.dispatch({ type: 'startle-end' }));
  }

  /** holdMs > 0 ise süre sonunda ifade kendiliğinden kalkar; 0 ise null verilene dek kalır. */
  emote(kind: CharacterEmote | null, holdMs = 0): void {
    this.clear('emote');
    this.dispatch({ type: 'emote', emote: kind });
    if (kind && holdMs > 0) this.after('emote', holdMs, () => this.dispatch({ type: 'emote', emote: null }));
  }

  /** Programatik bakış (viewport px). null → hedefsiz. */
  lookAt(point: Vec2 | null): void {
    this.dispatch(point ? { type: 'pointer-move', point } : { type: 'pointer-leave' });
  }

  /** Konuşma animasyonu: görünür değilse veya reduced-motion açıksa çalışmaz (guardian-head.ts). */
  speak(durationMs: number = this.timing.talkMs): void {
    const s = this.state;
    if (!s.visible || s.reducedMotion || s.sleeping) return;
    this.dispatch({ type: 'talk', on: true });
    this.after('talk', durationMs, () => this.dispatch({ type: 'talk', on: false }));
  }

  /** Burna dokunma; art arda `boopsToSneeze` kez olursa hapşırır. */
  boop(): void {
    this.touch(true);
    this.dispatch({ type: 'boop' });
    this.after('boop', this.timing.boopMs, () => this.dispatch({ type: 'boop-release' }));
    this.after('boop-streak', this.timing.boopStreakResetMs, () =>
      this.dispatch({ type: 'boop-streak-reset' }),
    );
    if (this.state.boopStreak >= this.timing.boopsToSneeze) {
      this.dispatch({ type: 'sneeze' });
      this.after('sneeze', this.timing.sneezeMs, () => this.dispatch({ type: 'sneeze-end' }));
    }
  }

  /** Tek gözü anlık kapatır (hero'daki göz yuvasına tıklama). */
  wink(eye: EyeSide): void {
    this.touch(true);
    this.dispatch({ type: 'wink', eye });
    this.after('wink', this.timing.winkMs, () => this.dispatch({ type: 'wink', eye: null }));
  }

  hoverFinger(finger: FingerId | null): void {
    this.touch();
    this.dispatch({ type: 'finger-hover', finger });
  }

  pressFinger(finger: FingerId): void {
    this.touch(true);
    this.dispatch({ type: 'finger-press', finger });
    this.after('press', this.timing.pressMs, () => this.dispatch({ type: 'finger-press', finger: null }));
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const id of this.timers.values()) this.view.clearTimeout(id);
    this.timers.clear();
    if (this.pointerFrame !== null) this.view.cancelAnimationFrame(this.pointerFrame);
    if (this.fieldFrame !== null) this.view.cancelAnimationFrame(this.fieldFrame);
    this.observer?.disconnect();
    this.disposers.splice(0).forEach((dispose) => dispose());
    this.tracker.destroy();
    this.listeners.clear();
    this.layoutListeners.clear();
  }

  /* ───────────── DOM dinleyicileri ───────────── */

  private get timing(): InteractionTiming {
    return this.opts.timing;
  }

  private listen(
    target: EventTarget | null | undefined,
    type: string,
    handler: (event: Event) => void,
    options?: AddEventListenerOptions,
  ): void {
    if (!target) return;
    target.addEventListener(type, handler, options);
    this.disposers.push(() => target.removeEventListener(type, handler, options));
  }

  private attach(): void {
    const { tracking } = this.opts;
    const { view, doc } = this;

    this.listen(view, 'pointerdown', (event) => {
      if (tracking.pointer) this.queuePointer(event as PointerEvent);
      this.touch(true);
    }, { passive: true, capture: true });
    this.listen(view, 'keydown', () => this.touch(true), { passive: true, capture: true });

    if (tracking.pointer) {
      this.listen(view, 'pointermove', (event) => this.queuePointer(event as PointerEvent), {
        passive: true,
      });
      // Fare pencereden çıktı: relatedTarget null olur.
      this.listen(doc, 'pointerout', (event) => {
        const pointer = event as PointerEvent;
        if (!pointer.relatedTarget && pointer.pointerType === 'mouse') {
          this.dispatch({ type: 'pointer-leave' });
        }
      }, { passive: true });
    }

    if (tracking.fields) {
      this.listen(doc, 'focusin', (event) => this.onFocusIn(event.target as Element | null));
      this.listen(doc, 'focusout', (event) => this.onFocusOut(event as FocusEvent));
      for (const type of ['input', 'keyup', 'click', 'select', 'compositionend']) {
        this.listen(doc, type, (event) => this.onFieldActivity(event), {
          capture: true,
          passive: true,
        });
      }
      this.listen(doc, 'selectionchange', () => this.queueField(), { passive: true });
    }

    const layoutChanged = (): void => {
      for (const listener of this.layoutListeners) listener();
      this.queueField();
    };
    this.listen(view, 'resize', layoutChanged, { passive: true });
    this.listen(view, 'scroll', layoutChanged, { passive: true, capture: true });
    this.listen(view.visualViewport, 'resize', layoutChanged, { passive: true });

    this.observeEnvironment();
  }

  /** Görünürlük + reduced-motion kapısı (guardian-head.ts → connect()). */
  private observeEnvironment(): void {
    const { doc, view } = this;
    const hasObserver = typeof view.IntersectionObserver === 'function';
    let intersecting = !hasObserver;
    const motion =
      typeof view.matchMedia === 'function'
        ? view.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const publish = (): void =>
      this.dispatch({
        type: 'environment',
        visible: intersecting && !doc.hidden,
        reducedMotion: motion?.matches ?? false,
      });
    if (hasObserver) {
      this.observer = new view.IntersectionObserver(([entry]) => {
        intersecting = entry?.isIntersecting ?? false;
        publish();
      });
      this.observer.observe(this.opts.root);
    }
    this.listen(doc, 'visibilitychange', publish);
    this.listen(motion, 'change', publish);
    publish();
  }

  /* ───────────── İşaretçi ───────────── */

  /** pointermove 1000 Hz'e çıkabilir; kare başına bir kez birleştirilir. */
  private queuePointer(event: PointerEvent): void {
    this.pendingPointer = { x: event.clientX, y: event.clientY };
    if (this.pointerFrame !== null) return;
    this.pointerFrame = this.view.requestAnimationFrame(() => {
      this.pointerFrame = null;
      const point = this.pendingPointer;
      this.pendingPointer = null;
      if (!point || this.destroyed) return;
      if (this.state.sleeping && this.hitsRoot(point)) this.wake();
      this.touch();
      this.dispatch({ type: 'pointer-move', point });
    });
  }

  private hitsRoot(point: Vec2): boolean {
    const rect = this.opts.root.getBoundingClientRect();
    return (
      point.x >= rect.left - WAKE_MARGIN_PX &&
      point.x <= rect.right + WAKE_MARGIN_PX &&
      point.y >= rect.top - WAKE_MARGIN_PX &&
      point.y <= rect.bottom + WAKE_MARGIN_PX
    );
  }

  /* ───────────── Alan odağı ve caret ───────────── */

  private onFocusIn(target: Element | null): void {
    this.touch(true);
    const { fieldSelector, privacySelector } = this.opts.tracking;
    if (!target || typeof target.matches !== 'function' || !target.matches(fieldSelector)) return;
    this.focused = target;
    this.field = isCaretTrackable(target) ? target : null;
    this.privacy =
      target.closest(privacySelector) !== null || (target as HTMLInputElement).type === 'password';
    this.dispatch({ type: 'field-focus', privacy: this.privacy, ...this.readField(target) });
  }

  private onFocusOut(event: FocusEvent): void {
    if (!this.focused) return;
    const next = event.relatedTarget as Element | null;
    // Başka bir alana geçiliyorsa yeni alanın focusin'i devralır.
    if (next && typeof next.matches === 'function' && next.matches(this.opts.tracking.fieldSelector)) {
      return;
    }
    this.focused = null;
    this.field = null;
    this.privacy = false;
    this.dispatch({ type: 'field-blur' });
    this.armIdle();
  }

  private onFieldActivity(event: Event): void {
    if (!this.focused || event.target !== this.focused) return;
    if (event.type === 'input' || event.type === 'compositionend') {
      this.dispatch({ type: 'typing', on: true });
      this.after('typing', this.timing.typingMs, () => this.dispatch({ type: 'typing', on: false }));
    }
    this.touch();
    this.queueField();
  }

  /** Alan merkezi + (gizli değilse) caret satırının dikey ortası; ikisi de viewport koordinatı. */
  private readField(element: Element): { focusPoint: Vec2; caret: Vec2 | null } {
    const rect = element.getBoundingClientRect();
    const focusPoint = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const field = this.field;
    let caret: Vec2 | null = null;
    if (!this.privacy && field && field === element) {
      const point = this.tracker.measure(field);
      if (point) caret = { x: point.x, y: point.y + point.height / 2 };
    }
    return { focusPoint, caret };
  }

  private queueField(): void {
    if (!this.focused || this.fieldFrame !== null || this.destroyed) return;
    this.fieldFrame = this.view.requestAnimationFrame(() => {
      this.fieldFrame = null;
      const element = this.focused;
      if (!element || this.destroyed) return;
      this.dispatch({ type: 'field-update', ...this.readField(element) });
    });
  }

  /* ───────────── Zamanlayıcılar ───────────── */

  private after(key: string, ms: number, run: () => void): void {
    this.clear(key);
    if (this.destroyed) return;
    this.timers.set(
      key,
      this.view.setTimeout(() => {
        this.timers.delete(key);
        run();
      }, ms),
    );
  }

  private clear(key: string): void {
    const id = this.timers.get(key);
    if (id === undefined) return;
    this.view.clearTimeout(id);
    this.timers.delete(key);
  }

  /** Etkileşim uyku sayacını sıfırlar; `strong` ise uyuyan karakteri de uyandırır. */
  private touch(strong = false): void {
    if (strong && this.state.sleeping) this.wake();
    else this.armIdle();
  }

  private armIdle(): void {
    if (!this.opts.tracking.idleSleep) return;
    this.after('idle', this.timing.idleSleepMs, () => this.dispatch({ type: 'sleep' }));
  }

  /** Göz kırpma döngüsü: yalnızca görünür, hareket serbest, uyanık ve gözetlemiyorken. */
  private syncBlink(): void {
    const s = this.state;
    const wanted = s.visible && !s.reducedMotion && !s.sleeping && s.mode !== 'peeking';
    if (!wanted) {
      this.clear('blink');
      if (s.blinking) this.dispatch({ type: 'blink', on: false });
      return;
    }
    if (s.blinking || this.timers.has('blink')) return;
    this.after('blink', nextBlinkDelay(this.timing), () => {
      this.dispatch({ type: 'blink', on: true });
      this.after('blink', this.timing.blinkDurationMs, () =>
        this.dispatch({ type: 'blink', on: false }),
      );
    });
  }

  /** Gizli alan odağındayken periyodik olarak bir gözü aralar. */
  private syncPeek(): void {
    const s = this.state;
    const wanted = s.mode === 'peeking' && s.visible && !s.reducedMotion;
    if (!wanted) {
      this.clear('peek');
      if (s.peekEye) this.dispatch({ type: 'peek', eye: null });
      return;
    }
    if (s.peekEye || this.timers.has('peek')) return;
    this.after('peek', this.timing.peekEveryMs, () => {
      this.dispatch({ type: 'peek', eye: Math.random() < 0.5 ? 'left' : 'right' });
      this.after('peek', this.timing.peekHoldMs, () => this.dispatch({ type: 'peek', eye: null }));
    });
  }
}

/* ───────────── Parça sürükleme (sakal/bıyık) ───────────── */

export interface LayerDragOptions {
  /** Ekran pikseli / tasarım pikseli oranı (kök genişliği ÷ görünüm genişliği). */
  readonly pxPerUnit: () => number;
}

/**
 * `data-drag-axis` / `data-drag-min` / `data-drag-max` taşıyan öğeleri sürüklenebilir yapar
 * (olay delegasyonu; öğeler sonradan eklenip çıkarılabilir). Sürükleme `--drag-x|y` CSS
 * değişkenini yazar; bırakınca değişken silinir ve CSS geçişi (taşmalı yay) geri döndürür.
 * Kaynak: hero.html → [appMascotDrag] + hero.css .dragging { transition: none }.
 */
export function bindLayerDrag(stage: HTMLElement, options: LayerDragOptions): () => void {
  let active: {
    element: HTMLElement;
    pointerId: number;
    axis: 'x' | 'y';
    start: number;
    min: number;
    max: number;
  } | null = null;

  const down = (event: PointerEvent): void => {
    if (!event.isPrimary || event.button !== 0) return;
    const element = (event.target as Element | null)?.closest<HTMLElement>('[data-drag-axis]');
    if (!element || !stage.contains(element)) return;
    const axis = element.dataset['dragAxis'] === 'y' ? 'y' : 'x';
    active = {
      element,
      pointerId: event.pointerId,
      axis,
      start: axis === 'x' ? event.clientX : event.clientY,
      min: Number(element.dataset['dragMin']),
      max: Number(element.dataset['dragMax']),
    };
    element.setPointerCapture(event.pointerId);
    element.setAttribute('data-dragging', '');
  };
  const move = (event: PointerEvent): void => {
    if (!active || active.pointerId !== event.pointerId) return;
    const delta = (active.axis === 'x' ? event.clientX : event.clientY) - active.start;
    const value = clampDrag(delta, options.pxPerUnit(), active.min, active.max);
    active.element.style.setProperty(`--drag-${active.axis}`, value.toFixed(2));
  };
  const end = (event: PointerEvent): void => {
    if (!active || active.pointerId !== event.pointerId) return;
    const { element, axis, pointerId } = active;
    active = null;
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
    element.removeAttribute('data-dragging');
    element.style.removeProperty(`--drag-${axis}`);
  };

  const events: Array<[string, (event: PointerEvent) => void]> = [
    ['pointerdown', down],
    ['pointermove', move],
    ['pointerup', end],
    ['pointercancel', end],
  ];
  for (const [type, handler] of events) {
    stage.addEventListener(type, handler as EventListener);
  }
  return () => {
    for (const [type, handler] of events) {
      stage.removeEventListener(type, handler as EventListener);
    }
  };
}
