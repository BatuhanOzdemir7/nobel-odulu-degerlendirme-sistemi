/**
 * character.types.ts — Tipler ve durum modelleri.
 *
 * Tasarım uzayı: tüm kutular 616×476 px'lik "sahne" üzerinde tanımlıdır
 * (kaynak: hero.css → .mascot-css3d-object). Piksel → yüzde dönüşümü bileşende yapılır.
 * Bu dosya çalışma zamanı kodu içermez; yalnızca tip tanımlarıdır.
 */

/* ───────────── Temel geometri ───────────── */

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** Tasarım uzayı pikseli cinsinden dikdörtgen. */
export interface LayerBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/* ───────────── Kimlikler ───────────── */

export type EyeSide = 'left' | 'right';

export type FingerId =
  | 'thumb-left'
  | 'index-left'
  | 'middle-left'
  | 'pinkie-left'
  | 'thumb-right'
  | 'index-right'
  | 'middle-right'
  | 'pinkie-right';

/** Yeni PNG katmanı eklemek için önce buraya kimlik ekleyin (bkz. character-assets.config.ts). */
export type LayerId =
  | 'body'
  | 'blue-collar'
  | 'left-arm'
  | 'right-arm'
  | FingerId
  | 'face'
  | 'eyebags'
  | 'hair'
  | 'beard'
  | 'mouth'
  | 'mustache'
  | 'nose'
  | 'left-eyebrow'
  | 'right-eyebrow'
  | 'hard-hat';

/** Yeni aksesuar eklemek için önce buraya kimlik ekleyin. */
export type AccessoryId = 'eyebags' | 'beard' | 'mustache' | 'hard-hat' | 'blue-collar';

/** Etkileşimli (tıklanabilir/odaklanabilir) parçalar; etiketleri `controlLabels` ile verilir. */
export type ControlId = FingerId | 'left-eye' | 'right-eye' | 'nose';

/**
 * Katman grupları. `body`/`arm`/`finger` düz yığılır; `head` tek bir kapsayıcıdır,
 * böylece baş eğimi ve paralaksı tek dönüşümle uygulanır.
 */
export type LayerGroup = 'body' | 'arm' | 'finger' | 'head';

/* ───────────── Katman ve aksesuar manifesti ───────────── */

export interface LayerDrag {
  readonly axis: 'x' | 'y';
  /** Tasarım pikseli cinsinden alt/üst sınır (kaynak: hero.html dragMinimum/dragMaximum). */
  readonly min: number;
  readonly max: number;
}

export interface LayerDef {
  readonly id: LayerId;
  readonly group: LayerGroup;
  /** `assetBase`'e göreli dosya adı. */
  readonly src: string;
  readonly box: LayerBox;
  /** Grup içi z-index. Aralıkları 10'ar bırakılmıştır; araya yeni katman sığar. */
  readonly z: number;
  /** CSS transform-origin (kol/parmak pivotları). */
  readonly origin?: string;
  readonly drag?: LayerDrag;
  readonly control?: ControlId;
  readonly fingerKind?: 'finger' | 'thumb';
}

/** Bir katmanın kaynağını/kutusunu/pivotunu/z'sini değiştiren yama. */
export type LayerPatch = Partial<Pick<LayerDef, 'src' | 'box' | 'z' | 'origin'>>;

/** Göz yuvası: beyaz + göz bebeği birlikte ölçeklenir (göz kırpma). */
export interface EyeDef {
  readonly side: EyeSide;
  readonly whiteSrc: string;
  readonly pupilSrc: string;
  readonly box: LayerBox;
  readonly z: number;
  readonly origin: string;
  readonly control: ControlId;
}

export interface AccessoryDef {
  readonly id: AccessoryId;
  readonly label: string;
  /** Aksesuar açıkken görünür olan katmanlar. Bir aksesuara ait katman, aksesuar kapalıyken çizilmez. */
  readonly add: readonly LayerId[];
  /** Aksesuar açıkken gizlenen katmanlar. */
  readonly hide?: readonly LayerId[];
  /** Aksesuar açıkken değişen katman özellikleri (örn. mavi yaka kolları). */
  readonly swap?: Partial<Record<LayerId, LayerPatch>>;
}

export interface ViewDef {
  /** Sahnenin görünen penceresi (tasarım pikseli). */
  readonly box: LayerBox;
  /** Bu görünümde çizilecek gruplar. */
  readonly groups: readonly LayerGroup[];
}

export type CharacterView = 'full' | 'head';

/* ───────────── Modlar, ifadeler, aktiviteler ───────────── */

/** Karakterin neye dikkat ettiğini belirler (türetilmiş durum). */
export type CharacterMode =
  | 'idle'
  | 'tracking-pointer'
  | 'tracking-caret'
  | 'focused'
  | 'peeking'
  | 'sleeping';

/** Karakterin yaptığı iş; dikkat modundan bağımsızdır. */
export type CharacterActivity = 'none' | 'pushing' | 'hauling' | 'rest' | 'raise-right' | 'cheer' | 'strike';

export type CharacterEmote = 'cheer' | 'sad' | 'stern' | 'puzzled';

/** Yeni ifade eklemek için önce buraya ad ekleyin, sonra EXPRESSIONS'a ön ayar yazın. */
export type CharacterExpression =
  | 'neutral'
  | 'attentive'
  | 'startled'
  | 'sneezing'
  | 'asleep'
  | 'peeking'
  | CharacterEmote;

export interface BrowPose {
  /** Tasarım pikseli; negatif = yukarı. */
  readonly y: number;
  /** Derece. */
  readonly rotate: number;
}

export interface ExpressionPreset {
  readonly browLeft: BrowPose;
  readonly browRight: BrowPose;
  /** 0 = kapalı, 1 = normal, >1 = iri (şaşkın). */
  readonly eyeOpenLeft: number;
  readonly eyeOpenRight: number;
  readonly pupilOpacity: number;
  /** İfadeye geçiş süresi (ms). */
  readonly transitionMs: number;
}

/* ───────────── Ayarlar ───────────── */

export interface GazeTuning {
  /** Bu uzaklıkta (px) bakış birim çembere doyar. Kaynak: guest-board.ts → /350. */
  readonly reachPx: number;
  /** Göz bebeğinin göz kutusuna oranla azami yer değiştirmesi. Kaynak: guardian-head.html → 26%. */
  readonly pupilRange: Vec2;
}

export interface ParallaxTuning {
  /** Baş kayması, bakış birim vektörü başına tasarım pikseli. */
  readonly head: Vec2;
  /** Bakış x = ±1 iken baş eğimi (derece). */
  readonly tiltDeg: number;
  /** Kaşların kafaya göre ek kayması. */
  readonly brow: Vec2;
}

export interface SmoothingTuning {
  /** Üstel sönümleme zaman sabitleri (ms). Küçük = hızlı. */
  readonly pupilMs: number;
  readonly headMs: number;
  readonly browMs: number;
}

export interface InteractionTiming {
  readonly blinkMinMs: number;
  readonly blinkSpanMs: number;
  readonly blinkDurationMs: number;
  readonly talkMs: number;
  readonly idleSleepMs: number;
  readonly startleMs: number;
  readonly boopMs: number;
  readonly boopsToSneeze: number;
  readonly boopStreakResetMs: number;
  readonly sneezeMs: number;
  readonly typingMs: number;
  readonly peekEveryMs: number;
  readonly peekHoldMs: number;
  readonly winkMs: number;
  readonly pressMs: number;
}

export interface CharacterTuning {
  readonly gaze: GazeTuning;
  readonly parallax: ParallaxTuning;
  readonly smoothing: SmoothingTuning;
  readonly timing: InteractionTiming;
}

export interface CharacterTuningInput {
  readonly gaze?: Partial<GazeTuning>;
  readonly parallax?: Partial<ParallaxTuning>;
  readonly smoothing?: Partial<SmoothingTuning>;
  readonly timing?: Partial<InteractionTiming>;
}

export interface TrackingOptions {
  /** Pencere genelinde fare/dokunma takibi. Varsayılan: true. */
  readonly pointer: boolean;
  /** input/textarea/select odak ve caret takibi. Varsayılan: true. */
  readonly fields: boolean;
  /** Boşta kalınca uyuma. Varsayılan: true. */
  readonly idleSleep: boolean;
  readonly fieldSelector: string;
  /** Eşleşen alanlar gizli sayılır: değer okunmaz, karakter bakışı kaçırır. */
  readonly privacySelector: string;
}

export interface CharacterConfigInput {
  readonly view?: CharacterView | ViewDef;
  readonly accessories?: readonly AccessoryId[];
  readonly assetBase?: string;
  readonly layerOverrides?: Partial<Record<LayerId, LayerPatch>>;
  /** Kol animasyonlarına faz kaydırması (saniye). Kaynak: logo-loop → --worker-phase. */
  readonly armPhaseSec?: number;
  readonly tuning?: CharacterTuningInput;
  readonly tracking?: Partial<TrackingOptions>;
}

export interface ResolvedCharacterConfig {
  readonly view: ViewDef;
  readonly accessories: readonly AccessoryId[];
  readonly assetBase: string;
  readonly layerOverrides: Partial<Record<LayerId, LayerPatch>>;
  readonly armPhaseSec: number;
  readonly tuning: CharacterTuning;
  readonly tracking: TrackingOptions;
}

/* ───────────── Poz (sürekli değerler) ───────────── */

export interface CharacterPose {
  /** Birim çember içinde bakış vektörü (-1..1). */
  readonly gaze: Vec2;
  /** Baş kayması (tasarım pikseli). */
  readonly head: Vec2;
  /** Baş eğimi (derece). */
  readonly tilt: number;
  /** Kaş paralaksı (tasarım pikseli). */
  readonly brow: Vec2;
}

/* ───────────── Durum modeli ───────────── */

/** Olaylarla değişen ham durum. `mode` ve `expression` bundan türetilir. */
export interface CharacterStateCore {
  readonly activity: CharacterActivity;
  readonly emote: CharacterEmote | null;
  /** Görüntü alanı (viewport) koordinatları. */
  readonly pointer: Vec2 | null;
  readonly focusPoint: Vec2 | null;
  readonly caret: Vec2 | null;
  readonly privacy: boolean;
  readonly sleeping: boolean;
  readonly startled: boolean;
  readonly sneezing: boolean;
  readonly typing: boolean;
  readonly blinking: boolean;
  readonly talking: boolean;
  readonly peekEye: EyeSide | null;
  readonly winkEye: EyeSide | null;
  readonly nosePressed: boolean;
  readonly boopStreak: number;
  readonly hoveredFinger: FingerId | null;
  readonly pressedFinger: FingerId | null;
  readonly visible: boolean;
  readonly reducedMotion: boolean;
}

export interface CharacterState extends CharacterStateCore {
  readonly mode: CharacterMode;
  readonly expression: CharacterExpression;
}

export type CharacterEvent =
  | { readonly type: 'pointer-move'; readonly point: Vec2 }
  | { readonly type: 'pointer-leave' }
  | {
      readonly type: 'field-focus';
      readonly focusPoint: Vec2;
      readonly caret: Vec2 | null;
      readonly privacy: boolean;
    }
  | { readonly type: 'field-update'; readonly focusPoint: Vec2; readonly caret: Vec2 | null }
  | { readonly type: 'field-blur' }
  | { readonly type: 'typing'; readonly on: boolean }
  | { readonly type: 'sleep' }
  | { readonly type: 'wake' }
  | { readonly type: 'emote'; readonly emote: CharacterEmote | null }
  | { readonly type: 'startle' }
  | { readonly type: 'startle-end' }
  | { readonly type: 'blink'; readonly on: boolean }
  | { readonly type: 'peek'; readonly eye: EyeSide | null }
  | { readonly type: 'wink'; readonly eye: EyeSide | null }
  | { readonly type: 'talk'; readonly on: boolean }
  | { readonly type: 'boop' }
  | { readonly type: 'boop-release' }
  | { readonly type: 'boop-streak-reset' }
  | { readonly type: 'sneeze' }
  | { readonly type: 'sneeze-end' }
  | { readonly type: 'finger-hover'; readonly finger: FingerId | null }
  | { readonly type: 'finger-press'; readonly finger: FingerId | null }
  | { readonly type: 'set-activity'; readonly activity: CharacterActivity }
  | { readonly type: 'environment'; readonly visible: boolean; readonly reducedMotion: boolean };
