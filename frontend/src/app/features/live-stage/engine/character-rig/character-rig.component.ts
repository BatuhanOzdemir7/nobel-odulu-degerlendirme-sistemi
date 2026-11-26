/**
 * character-rig.component.ts — Görsel sunum ve animasyon katmanı (Angular).
 *
 * Sorumluluklar (yalnızca bunlar):
 *  - Manifestten katmanları üretip şablona vermek (yerleşim yüzdeleri, z-index, pivotlar).
 *  - Ayrık durumu (mod, ifade, aktivite, kırpma…) data-* özniteliklerine yansıtmak.
 *  - Sürekli değerleri (göz bebeği, baş eğimi, paralaks) rAF döngüsüyle CSS değişkenlerine yazmak:
 *    --pupil-x, --pupil-y, --head-x, --head-y, --head-tilt, --brow-px, --brow-py.
 * Olay dinleme controller'da, hareket matematiği kinematics dosyasındadır.
 */
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  assetUrl,
  DESIGN_SIZE,
  EXPRESSIONS,
  EYE_CENTER,
  EYES,
  HEAD_PIVOT,
  layerZIndex,
  PUPIL_RATIO,
  resolveConfig,
  resolveLayers,
} from './character-assets.config';
import {
  bindLayerDrag,
  CharacterInteractionController,
} from './character-interaction.controller';
import {
  designToViewport,
  gazeFromTarget,
  isPoseSettled,
  NEUTRAL_POSE,
  resolveEyeOpenness,
  stepPose,
  targetPose,
  ZERO,
} from './character-kinematics.math';
import {
  INITIAL_CHARACTER_STATE,
  selectGazeTarget,
  selectRestGaze,
} from './character-state.machine';
import type {
  CharacterActivity,
  CharacterConfigInput,
  CharacterEmote,
  CharacterMode,
  CharacterPose,
  CharacterState,
  ControlId,
  FingerId,
  LayerBox,
  LayerDef,
  LayerDrag,
  LayerGroup,
  LayerId,
  Vec2,
} from './character.types';

interface RenderLayer {
  readonly id: LayerId;
  readonly group: LayerGroup;
  readonly src: string;
  readonly style: Record<string, string>;
  /** Yalnızca etkileşimli + etiketli ise dolu. */
  readonly control: ControlId | null;
  readonly label: string | null;
  readonly fingerKind: 'finger' | 'thumb' | null;
  /** Yalnızca etkileşimli modda dolu. */
  readonly drag: LayerDrag | null;
}

interface RenderEye {
  readonly side: 'left' | 'right';
  readonly whiteSrc: string;
  readonly pupilSrc: string;
  readonly style: Record<string, string>;
  readonly control: ControlId | null;
  readonly label: string | null;
}

/** Şablonu yeniden çizdirmesi gereken alanlar; pointer/caret/focusPoint bilerek yok. */
const DISCRETE_KEYS = [
  'mode',
  'expression',
  'activity',
  'blinking',
  'talking',
  'typing',
  'peekEye',
  'winkEye',
  'nosePressed',
  'hoveredFinger',
  'pressedFinger',
] as const satisfies readonly (keyof CharacterState)[];

const pct = (value: number, total: number): string => `${((value / total) * 100).toFixed(4)}%`;

const boxStyle = (box: LayerBox): Record<string, string> => ({
  left: pct(box.x, DESIGN_SIZE.w),
  top: pct(box.y, DESIGN_SIZE.h),
  width: pct(box.w, DESIGN_SIZE.w),
  height: pct(box.h, DESIGN_SIZE.h),
});

const isFinger = (control: ControlId): control is FingerId =>
  control !== 'nose' && control !== 'left-eye' && control !== 'right-eye';

@Component({
  selector: 'app-character-rig',
  standalone: true,
  templateUrl: './character-rig.component.html',
  styleUrl: './character-rig.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterRigComponent {
  /** Görünüm, aksesuarlar, ayarlar. Hazır ayarlar için CHARACTER_PRESETS. */
  readonly config = input<CharacterConfigInput>({});
  readonly activity = input<CharacterActivity>('none');
  /** Göz kırpma, burna dokunma, parmaklar ve sakal/bıyık sürükleme gibi etkileşimleri açar. */
  readonly interactive = input(false);
  /** Erişilebilirlik adı (etkileşimsiz modda role="img" etiketi). */
  readonly label = input('');
  /** Etiketi verilen parça, etkileşimli modda odaklanabilir düğme olur. */
  readonly controlLabels = input<Partial<Record<ControlId, string>>>({});
  readonly message = input('');
  /** Aynı mesaj tekrar söylenecekse artırın (guardian-head.ts → speechRevision). */
  readonly speechRevision = input(0);
  /** undefined = dokunma; null = bakışı bırak; Vec2 = bu viewport noktasına bak. */
  readonly gazeTarget = input<Vec2 | null | undefined>(undefined);
  readonly emote = input<CharacterEmote | null>(null);
  /** Her artışta bir irkilme oynar (0 = yok). */
  readonly startleRevision = input(0);
  /** Her artışta konuşma (bıyık) animasyonu oynar (0 = yok). */
  readonly talkRevision = input(0);

  readonly modeChange = output<CharacterMode>();
  readonly fingerPress = output<FingerId>();
  readonly fingerHover = output<FingerId | null>();

  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly root = viewChild.required<ElementRef<HTMLElement>>('root');
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  protected readonly state = signal<CharacterState>(INITIAL_CHARACTER_STATE);
  private readonly mode = computed(() => this.state().mode);
  private readonly ready = signal(false);

  protected readonly resolved = computed(() => resolveConfig(this.config()));
  protected readonly view = computed(() => this.resolved().view);
  /** Gövdesiz görünümde taşan parçalar kırpılır. */
  protected readonly cropped = computed(() => !this.view().groups.includes('body'));

  private readonly renderLayers = computed<RenderLayer[]>(() => {
    const { assetBase } = this.resolved();
    const interactive = this.interactive();
    const labels = this.controlLabels();
    return resolveLayers(this.resolved()).map((layer: LayerDef) => {
      const label = interactive && layer.control ? (labels[layer.control] ?? null) : null;
      const style: Record<string, string> = {
        ...boxStyle(layer.box),
        '--z': String(layerZIndex(layer)),
      };
      if (layer.origin) style['transform-origin'] = layer.origin;
      return {
        id: layer.id,
        group: layer.group,
        src: assetUrl(assetBase, layer.src),
        style,
        control: label ? (layer.control ?? null) : null,
        label,
        fingerKind: layer.fingerKind ?? null,
        drag: interactive ? (layer.drag ?? null) : null,
      };
    });
  });
  protected readonly flatLayers = computed(() =>
    this.renderLayers().filter((layer) => layer.group !== 'head'),
  );
  protected readonly headLayers = computed(() =>
    this.renderLayers().filter((layer) => layer.group === 'head'),
  );

  protected readonly eyes = computed<RenderEye[]>(() => {
    const { assetBase } = this.resolved();
    const interactive = this.interactive();
    const labels = this.controlLabels();
    return EYES.map((eye) => {
      const label = interactive ? (labels[eye.control] ?? null) : null;
      return {
        side: eye.side,
        whiteSrc: assetUrl(assetBase, eye.whiteSrc),
        pupilSrc: assetUrl(assetBase, eye.pupilSrc),
        style: {
          ...boxStyle(eye.box),
          '--z': String(eye.z),
          'transform-origin': eye.origin,
        },
        control: label ? eye.control : null,
        label,
      };
    });
  });

  /** Kırpma/gözetleme geçersiz kılmaları dahil nihai göz açıklığı. */
  private readonly eyeOpen = computed(() => {
    const state = this.state();
    const preset = EXPRESSIONS[state.expression];
    return {
      left: resolveEyeOpenness(preset.eyeOpenLeft, 'left', state),
      right: resolveEyeOpenness(preset.eyeOpenRight, 'right', state),
    };
  });

  /** Sahne yerleşimi (kırpma) + ifade değişkenleri. Pose değişkenleri rAF ile ayrıca yazılır. */
  protected readonly stageStyle = computed<Record<string, string>>(() => {
    const { box } = this.view();
    const config = this.resolved();
    const preset = EXPRESSIONS[this.state().expression];
    const open = this.eyeOpen();
    const range = config.tuning.gaze.pupilRange;
    return {
      left: pct(-box.x, box.w),
      top: pct(-box.y, box.h),
      width: pct(DESIGN_SIZE.w, box.w),
      height: pct(DESIGN_SIZE.h, box.h),
      '--view-w': String(box.w),
      '--head-pivot': `${pct(HEAD_PIVOT.x, DESIGN_SIZE.w)} ${pct(HEAD_PIVOT.y, DESIGN_SIZE.h)}`,
      // göz kutusu oranı → göz bebeği boyutu yüzdesi (translate yüzdesi öğenin kendi boyutuna göredir)
      '--pupil-range-x': `${((range.x / PUPIL_RATIO) * 100).toFixed(2)}%`,
      '--pupil-range-y': `${((range.y / PUPIL_RATIO) * 100).toFixed(2)}%`,
      '--arm-phase': `${config.armPhaseSec}s`,
      '--expr-ms': `${preset.transitionMs}ms`,
      '--brow-l-y': String(preset.browLeft.y),
      '--brow-l-rot': String(preset.browLeft.rotate),
      '--brow-r-y': String(preset.browRight.y),
      '--brow-r-rot': String(preset.browRight.rotate),
      '--eye-open-l': String(open.left),
      '--eye-open-r': String(open.right),
      '--pupil-opacity': String(preset.pupilOpacity),
    };
  });

  private controller: CharacterInteractionController | null = null;
  private win: Window | null = null;
  private frame: number | null = null;
  private lastTime = 0;
  private pose: CharacterPose = NEUTRAL_POSE;
  private destroyed = false;
  private readonly cleanups: Array<() => void> = [];

  constructor() {
    afterNextRender(() => this.zone.runOutsideAngular(() => this.connect()));

    effect(() => {
      if (!this.ready()) return;
      const activity = this.activity();
      untracked(() => this.controller?.setActivity(activity));
    });
    effect(() => {
      this.speechRevision();
      const message = this.message();
      untracked(() => {
        if (message) this.controller?.speak();
      });
    });
    effect(() => {
      const mode = this.mode();
      untracked(() => this.modeChange.emit(mode));
    });
    effect(() => {
      if (!this.ready()) return;
      const target = this.gazeTarget();
      if (target === undefined) return;
      untracked(() => this.controller?.lookAt(target));
    });
    effect(() => {
      if (!this.ready()) return;
      const kind = this.emote();
      untracked(() => this.controller?.emote(kind));
    });
    effect(() => {
      if (!this.ready()) return;
      const rev = this.startleRevision();
      untracked(() => { if (rev > 0) this.controller?.startle(); });
    });
    effect(() => {
      if (!this.ready()) return;
      const rev = this.talkRevision();
      untracked(() => { if (rev > 0) this.controller?.speak(); });
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      if (this.frame !== null) this.win?.cancelAnimationFrame(this.frame);
      this.cleanups.splice(0).forEach((cleanup) => cleanup());
      this.controller?.destroy();
      this.controller = null;
    });
  }

  /* ───────────── Şablon olayları ───────────── */

  protected activate(control: ControlId | null): void {
    const controller = this.controller;
    if (!controller || !control) return;
    switch (control) {
      case 'nose':
        controller.boop();
        return;
      case 'left-eye':
        controller.wink('left');
        return;
      case 'right-eye':
        controller.wink('right');
        return;
      default:
        controller.pressFinger(control);
        this.fingerPress.emit(control);
    }
  }

  protected hover(control: ControlId | null, entering: boolean): void {
    if (!control || !isFinger(control)) return;
    const finger = entering ? control : null;
    this.controller?.hoverFinger(finger);
    this.fingerHover.emit(finger);
  }

  /* ───────────── Bağlantı ve kare döngüsü ───────────── */

  private connect(): void {
    const root = this.root().nativeElement;
    const win = root.ownerDocument.defaultView;
    if (!win || this.destroyed) return;
    this.win = win;
    const { tuning, tracking } = this.resolved();

    const controller = new CharacterInteractionController({
      root,
      timing: tuning.timing,
      tracking,
    });
    this.controller = controller;
    this.cleanups.push(
      controller.subscribe((next) => this.publish(next)),
      controller.onLayout(() => this.requestFrame()),
      bindLayerDrag(this.stage().nativeElement, {
        pxPerUnit: () => root.getBoundingClientRect().width / this.view().box.w,
      }),
    );
    // Abone olmadan önce gönderilen ortam olayını (görünürlük/reduced-motion) yakala.
    this.publish(controller.snapshot);
    this.zone.run(() => this.ready.set(true));
  }

  /** Yalnızca şablonu etkileyen alanlar değiştiyse sinyali (ve değişim algılamayı) tetikler. */
  private publish(next: CharacterState): void {
    const current = this.state();
    if (DISCRETE_KEYS.some((key) => next[key] !== current[key])) {
      this.zone.run(() => this.state.set(next));
    }
    this.requestFrame();
  }

  private requestFrame(): void {
    if (this.frame !== null || this.destroyed || !this.win) return;
    this.lastTime = this.win.performance.now();
    this.frame = this.win.requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number): void => {
    this.frame = null;
    const controller = this.controller;
    if (!controller || this.destroyed) return;
    const dt = Math.min(64, Math.max(1, now - this.lastTime));
    this.lastTime = now;

    const state = controller.snapshot;
    const { tuning } = this.resolved();
    const parallax = state.reducedMotion
      ? { ...tuning.parallax, head: ZERO, tiltDeg: 0, brow: ZERO }
      : tuning.parallax;
    const target = targetPose(this.gazeFor(state), parallax);
    this.pose = stepPose(this.pose, target, tuning.smoothing, dt);
    this.writePose(this.pose);
    // Hedefe varılana kadar sürer; yeni olay gelince requestFrame() yeniden başlatır.
    if (!isPoseSettled(this.pose, target)) this.requestFrame();
  };

  private gazeFor(state: CharacterState) {
    const target = selectGazeTarget(state);
    if (!target) return selectRestGaze(state);
    const rect = this.root().nativeElement.getBoundingClientRect();
    const origin = designToViewport(rect, this.view().box, EYE_CENTER);
    return gazeFromTarget(origin, target, this.resolved().tuning.gaze.reachPx);
  }

  private writePose(pose: CharacterPose): void {
    const style = this.stage().nativeElement.style;
    style.setProperty('--pupil-x', pose.gaze.x.toFixed(3));
    style.setProperty('--pupil-y', pose.gaze.y.toFixed(3));
    style.setProperty('--head-x', pose.head.x.toFixed(3));
    style.setProperty('--head-y', pose.head.y.toFixed(3));
    style.setProperty('--head-tilt', pose.tilt.toFixed(3));
    style.setProperty('--brow-px', pose.brow.x.toFixed(3));
    style.setProperty('--brow-py', pose.brow.y.toFixed(3));
  }
}
