/**
 * character-assets.config.ts — Katman ve aksesuar manifestosu.
 *
 * Tek gerçek kaynak: tüm konumlar 616×476 tasarım uzayında piksel olarak tutulur.
 * Kaynak yüzdeler (hero.css) bu uzaydan türetilmiştir, örn. face.left 37.987% × 616 = 234 px.
 * guardian-head.css'teki 180×184'lük baş görünümü, aynı yerleşimin (214, 12) noktasından
 * kırpılmış halidir; ayrı bir yerleşim değildir.
 *
 * z-index: head dışındaki gruplar düz yığılır (grup z'si × 100 + katman z'si);
 * head grubu tek kapsayıcıdır ve içinde yerel z kullanır.
 */
import type {
  AccessoryDef,
  AccessoryId,
  CharacterConfigInput,
  CharacterExpression,
  CharacterTuning,
  CharacterView,
  EyeDef,
  ExpressionPreset,
  FingerId,
  LayerBox,
  LayerDef,
  LayerGroup,
  LayerId,
  ResolvedCharacterConfig,
  TrackingOptions,
  Vec2,
  ViewDef,
} from './character.types';

/* ───────────── Sahne sabitleri ───────────── */

export const DESIGN_SIZE = { w: 616, h: 476 } as const;
export const DEFAULT_ASSET_BASE = 'assets/images/';

/** İki göz yuvasının orta noktası: bakış vektörünün başlangıcı. */
export const EYE_CENTER: Vec2 = { x: 308, y: 93 };
/** Yüzün alt orta noktası (boyun): baş eğimi pivotu. */
export const HEAD_PIVOT: Vec2 = { x: 308, y: 176 };
/** Göz bebeği boyutunun göz yuvasına oranı (8/23 = %34.783). */
export const PUPIL_RATIO = 8 / 23;

/** Grup başına z tabanı; head kapsayıcısı en üstte. */
export const GROUP_Z: Record<LayerGroup, number> = { body: 1, arm: 2, finger: 3, head: 4 };

export const VIEWS: Record<CharacterView, ViewDef> = {
  full: {
    box: { x: 0, y: 0, w: DESIGN_SIZE.w, h: DESIGN_SIZE.h },
    groups: ['body', 'arm', 'finger', 'head'],
  },
  /** guardian-head.css: aspect-ratio 180/184. */
  head: { box: { x: 214, y: 12, w: 180, h: 184 }, groups: ['head'] },
};

/* ───────────── Katman manifesti ───────────── */

const FINGER_IDS: readonly FingerId[] = [
  'thumb-left',
  'index-left',
  'middle-left',
  'pinkie-left',
  'thumb-right',
  'index-right',
  'middle-right',
  'pinkie-right',
];

function finger(
  id: FingerId,
  box: LayerBox,
  origin: string,
  fingerKind: 'finger' | 'thumb',
): LayerDef {
  return { id, group: 'finger', src: `${id}.png`, box, z: 10, origin, control: id, fingerKind };
}

/**
 * Kaynak karşılaştırması (burun/bıyık örtüşmesi 49 opak piksel; diğer çiftler örtüşmez):
 *   burun > bıyık  → hero, logo-loop worker, freight dock   (kanonik)
 *   bıyık > burun  → yalnızca guardian-head.css             (preset: guardian)
 */
export const LAYERS: Record<LayerId, LayerDef> = {
  body: { id: 'body', group: 'body', src: 'body.png', box: { x: 203, y: 151, w: 210, h: 305 }, z: 10 },
  'blue-collar': {
    id: 'blue-collar',
    group: 'body',
    src: 'blue-collar.png',
    box: { x: 203, y: 151, w: 210, h: 213 },
    z: 20,
  },

  'left-arm': {
    id: 'left-arm',
    group: 'arm',
    src: 'left-arm.png',
    box: { x: 52, y: 158, w: 161, h: 46 },
    z: 10,
    origin: '100% 50%',
  },
  'right-arm': {
    id: 'right-arm',
    group: 'arm',
    src: 'right-arm.png',
    box: { x: 403, y: 158, w: 161, h: 46 },
    z: 10,
    origin: '0% 50%',
  },

  'pinkie-left': finger('pinkie-left', { x: 20, y: 191, w: 41, h: 12 }, '100% 50%', 'finger'),
  'middle-left': finger('middle-left', { x: 20, y: 175, w: 41, h: 12 }, '100% 50%', 'finger'),
  'index-left': finger('index-left', { x: 20, y: 159, w: 41, h: 12 }, '100% 50%', 'finger'),
  'thumb-left': finger('thumb-left', { x: 74, y: 138, w: 12, h: 21 }, '50% 100%', 'thumb'),
  'pinkie-right': finger('pinkie-right', { x: 555, y: 191, w: 41, h: 12 }, '0% 50%', 'finger'),
  'middle-right': finger('middle-right', { x: 555, y: 175, w: 41, h: 12 }, '0% 50%', 'finger'),
  'index-right': finger('index-right', { x: 555, y: 159, w: 41, h: 12 }, '0% 50%', 'finger'),
  'thumb-right': finger('thumb-right', { x: 530, y: 138, w: 12, h: 21 }, '50% 100%', 'thumb'),

  face: { id: 'face', group: 'head', src: 'face.png', box: { x: 234, y: 28, w: 148, h: 148 }, z: 10 },
  eyebags: { id: 'eyebags', group: 'head', src: 'eyebags.png', box: { x: 263, y: 96, w: 90, h: 13 }, z: 20 },
  hair: { id: 'hair', group: 'head', src: 'hair.png', box: { x: 223, y: 20, w: 160, h: 97 }, z: 30 },
  beard: {
    id: 'beard',
    group: 'head',
    src: 'beard.png',
    box: { x: 276, y: 123, w: 64, h: 65 },
    z: 40,
    drag: { axis: 'y', min: -5, max: 7 },
  },
  mouth: { id: 'mouth', group: 'head', src: 'mouth.png', box: { x: 288, y: 137, w: 40, h: 8 }, z: 50 },
  mustache: {
    id: 'mustache',
    group: 'head',
    src: 'mustache.png',
    box: { x: 275, y: 127, w: 66, h: 12 },
    z: 60,
    drag: { axis: 'x', min: -15, max: 15 },
  },
  nose: {
    id: 'nose',
    group: 'head',
    src: 'nose.png',
    box: { x: 298, y: 85, w: 21, h: 47 },
    z: 70,
    origin: '50% 50%',
    control: 'nose',
  },
  /* göz yuvaları z: 80 (EYES) */
  'left-eyebrow': {
    id: 'left-eyebrow',
    group: 'head',
    src: 'left_eyebrow.png',
    box: { x: 262, y: 80, w: 30, h: 9 },
    z: 90,
    origin: '50% 50%',
  },
  'right-eyebrow': {
    id: 'right-eyebrow',
    group: 'head',
    src: 'right_eyebrow.png',
    box: { x: 324, y: 80, w: 30, h: 9 },
    z: 90,
    origin: '50% 50%',
  },
  /** logo-loop.component.css ölçüsü: doğal 146×71, 1:1 ölçek. */
  'hard-hat': {
    id: 'hard-hat',
    group: 'head',
    src: 'hard-hat.png',
    box: { x: 235, y: -12, w: 146, h: 71 },
    z: 100,
  },
};

/** Kaynak: .eye-socket { transform-origin: 50% 55% } (guardian-head.css). */
export const EYES: readonly EyeDef[] = [
  {
    side: 'left',
    whiteSrc: 'left_eye_white.png',
    pupilSrc: 'left_eye_pupil.png',
    box: { x: 266, y: 82, w: 22, h: 22 },
    z: 80,
    origin: '50% 55%',
    control: 'left-eye',
  },
  {
    side: 'right',
    whiteSrc: 'right_eye_white.png',
    pupilSrc: 'right_eye_pupil.png',
    box: { x: 328, y: 82, w: 22, h: 22 },
    z: 80,
    origin: '50% 55%',
    control: 'right-eye',
  },
];

/* ───────────── Aksesuarlar ───────────── */

export const ACCESSORIES: Record<AccessoryId, AccessoryDef> = {
  eyebags: { id: 'eyebags', label: 'Göz altı torbaları', add: ['eyebags'] },
  beard: { id: 'beard', label: 'Sakal', add: ['beard'] },
  mustache: { id: 'mustache', label: 'Bıyık', add: ['mustache'] },
  'hard-hat': { id: 'hard-hat', label: 'Baret', add: ['hard-hat'] },
  /**
   * Mavi yaka: gövde üstüne bindirilir, kollar elsiz kolluklarla değişir (parmaklar gizlenir).
   * Kol pivotları kaynak: logo-loop.component.css (.worker-arm.left 98% / .right 2%).
   */
  'blue-collar': {
    id: 'blue-collar',
    label: 'Mavi yaka',
    add: ['blue-collar'],
    hide: FINGER_IDS,
    swap: {
      'left-arm': {
        src: 'bluecollar-left-arm.png',
        box: { x: 85, y: 158, w: 128, h: 46 },
        origin: '98% 50%',
      },
      'right-arm': {
        src: 'bluecollar-right-arm.png',
        box: { x: 403, y: 158, w: 128, h: 46 },
        origin: '2% 50%',
      },
    },
  },
};

export const DEFAULT_ACCESSORIES: readonly AccessoryId[] = ['eyebags', 'beard', 'mustache'];

/* ───────────── İfadeler ───────────── */

/**
 * Kaynakta olan: neutral, startled (.waking-up), sneezing, asleep (.sleeping).
 * Yeni (kaynakta yok): attentive, peeking. Yeni ifade = tip + buraya bir ön ayar.
 */
export const EXPRESSIONS: Record<CharacterExpression, ExpressionPreset> = {
  neutral: {
    browLeft: { y: 0, rotate: 0 },
    browRight: { y: 0, rotate: 0 },
    eyeOpenLeft: 1,
    eyeOpenRight: 1,
    pupilOpacity: 1,
    // göz kırpma sonrası göz açılışı da bu süreyi kullanır (hero.css: 0.15s)
    transitionMs: 120,
  },
  attentive: {
    browLeft: { y: 1, rotate: 5 },
    browRight: { y: 1, rotate: -5 },
    eyeOpenLeft: 0.92,
    eyeOpenRight: 0.92,
    pupilOpacity: 1,
    transitionMs: 200,
  },
  /** hero.css .waking-up: kaşlar -10px, ∓15°; gözler 1.3×; 0.1s. */
  startled: {
    browLeft: { y: -10, rotate: -15 },
    browRight: { y: -10, rotate: 15 },
    eyeOpenLeft: 1.3,
    eyeOpenRight: 1.3,
    pupilOpacity: 1,
    transitionMs: 100,
  },
  /** hero.css: yalnızca yüz/saç sarsıntısı (CSS keyframe); sayısal değerler nötr. */
  sneezing: {
    browLeft: { y: 0, rotate: 0 },
    browRight: { y: 0, rotate: 0 },
    eyeOpenLeft: 1,
    eyeOpenRight: 1,
    pupilOpacity: 1,
    transitionMs: 100,
  },
  /** hero.css .sleeping: scaleY(0.06), göz bebeği gizli, 2.5s. */
  asleep: {
    browLeft: { y: 1, rotate: 0 },
    browRight: { y: 1, rotate: 0 },
    eyeOpenLeft: 0.06,
    eyeOpenRight: 0.06,
    pupilOpacity: 0,
    transitionMs: 2500,
  },
  peeking: {
    browLeft: { y: -2, rotate: -4 },
    browRight: { y: -2, rotate: 4 },
    eyeOpenLeft: 0.06,
    eyeOpenRight: 0.06,
    pupilOpacity: 1,
    transitionMs: 300,
  },
  cheer:   { browLeft: { y: -3, rotate: -6 },  browRight: { y: -3, rotate: 6 },   eyeOpenLeft: 1.12, eyeOpenRight: 1.12, pupilOpacity: 1, transitionMs: 160 },
  sad:     { browLeft: { y: 2,  rotate: -14 }, browRight: { y: 2,  rotate: 14 },  eyeOpenLeft: 0.72, eyeOpenRight: 0.72, pupilOpacity: 1, transitionMs: 350 },
  stern:   { browLeft: { y: 2,  rotate: 12 },  browRight: { y: 2,  rotate: -12 }, eyeOpenLeft: 0.8,  eyeOpenRight: 0.8,  pupilOpacity: 1, transitionMs: 200 },
  puzzled: { browLeft: { y: -5, rotate: -8 },  browRight: { y: 1,  rotate: 6 },   eyeOpenLeft: 1.05, eyeOpenRight: 0.85, pupilOpacity: 1, transitionMs: 220 },
};

/* ───────────── Varsayılan ayarlar ───────────── */

export const DEFAULT_TUNING: CharacterTuning = {
  gaze: { reachPx: 350, pupilRange: { x: 0.26, y: 0.26 } },
  parallax: { head: { x: 2.5, y: 1.5 }, tiltDeg: 3, brow: { x: 0.6, y: 1.2 } },
  smoothing: { pupilMs: 60, headMs: 140, browMs: 110 },
  timing: {
    // guardian-head.ts: 3200 + rastgele 2000 ms aralık, 145 ms kırpma, 1800 ms konuşma
    blinkMinMs: 3200,
    blinkSpanMs: 2000,
    blinkDurationMs: 145,
    talkMs: 1800,
    // varsayım (kaynakta yok): hero direktifleri zip'te olmadığından yeniden kurgulandı
    idleSleepMs: 30000,
    boopsToSneeze: 3,
    boopStreakResetMs: 1500,
    winkMs: 400,
    peekEveryMs: 2600,
    peekHoldMs: 700,
    // kaynaktan: startleShake 0.45s, sneeze 0.35s, nose transition 0.15s,
    // cyberButtonStrike 260ms, postit-editor writingTimer 180ms
    startleMs: 450,
    sneezeMs: 350,
    boopMs: 150,
    pressMs: 260,
    typingMs: 180,
  },
};

export const DEFAULT_TRACKING: TrackingOptions = {
  pointer: true,
  fields: true,
  idleSleep: true,
  fieldSelector: 'input, textarea, select',
  privacySelector: 'input[type="password"], [data-character-privacy]',
};

/* ───────────── Çözümleme yardımcıları (saf) ───────────── */

export function resolveView(view: CharacterView | ViewDef = 'full'): ViewDef {
  return typeof view === 'string' ? VIEWS[view] : view;
}

export function resolveConfig(input: CharacterConfigInput = {}): ResolvedCharacterConfig {
  const tuning = input.tuning ?? {};
  return {
    view: resolveView(input.view),
    accessories: input.accessories ?? DEFAULT_ACCESSORIES,
    assetBase: input.assetBase ?? DEFAULT_ASSET_BASE,
    layerOverrides: input.layerOverrides ?? {},
    armPhaseSec: input.armPhaseSec ?? 0,
    tuning: {
      gaze: { ...DEFAULT_TUNING.gaze, ...tuning.gaze },
      parallax: { ...DEFAULT_TUNING.parallax, ...tuning.parallax },
      smoothing: { ...DEFAULT_TUNING.smoothing, ...tuning.smoothing },
      timing: { ...DEFAULT_TUNING.timing, ...tuning.timing },
    },
    tracking: { ...DEFAULT_TRACKING, ...input.tracking },
  };
}

export function assetUrl(base: string, src: string): string {
  return !base || base.endsWith('/') ? `${base}${src}` : `${base}/${src}`;
}

/** Düz yığılan gruplar için global z-index; head içinde yerel z. */
export function layerZIndex(layer: Pick<LayerDef, 'group' | 'z'>): number {
  return layer.group === 'head' ? layer.z : GROUP_Z[layer.group] * 100 + layer.z;
}

/**
 * Aktif aksesuarlara ve geçersiz kılmalara göre çizilecek katmanları üretir.
 * Sıra: aksesuar ekle → aksesuar gizle → aksesuar swap → kullanıcı layerOverrides.
 */
export function resolveLayers(config: ResolvedCharacterConfig): LayerDef[] {
  const active = config.accessories.flatMap((id) => ACCESSORIES[id] ?? []);
  const owned = new Set<LayerId>(Object.values(ACCESSORIES).flatMap((a) => a.add));
  const shown = new Set<LayerId>(
    (Object.keys(LAYERS) as LayerId[]).filter((id) => !owned.has(id)),
  );
  for (const accessory of active) accessory.add.forEach((id) => shown.add(id));
  for (const accessory of active) accessory.hide?.forEach((id) => shown.delete(id));

  const patches: Partial<Record<LayerId, LayerDef>> = {};
  for (const accessory of active) {
    for (const [id, patch] of Object.entries(accessory.swap ?? {}) as [LayerId, Partial<LayerDef>][]) {
      patches[id] = { ...LAYERS[id], ...patches[id], ...patch };
    }
  }

  return (Object.keys(LAYERS) as LayerId[])
    .filter((id) => shown.has(id) && config.view.groups.includes(LAYERS[id].group))
    .map((id) => ({
      ...(patches[id] ?? LAYERS[id]),
      ...config.layerOverrides[id],
    }));
}

/* ───────────── Hazır ayarlar (dört orijinal kullanım) ───────────── */

const DOCK_HAT: LayerBox = { x: 216, y: -5, w: 191, h: 93 };

export const CHARACTER_PRESETS = {
  /** hero.html: tam gövde, etkileşimli. */
  hero: { view: 'full' },
  /** guest-board → guardian-head: yalnızca baş; bıyık burnun üstünde. */
  guardian: { view: 'head', layerOverrides: { mustache: { z: 75 } } },
  /** logo-loop: mavi yaka işçi; fare takibi yok, kollar itme animasyonuyla (activity="pushing"). */
  worker: {
    view: 'full',
    accessories: ['eyebags', 'beard', 'mustache', 'hard-hat', 'blue-collar'],
    tracking: { pointer: false, fields: false, idleSleep: false },
  },
  /** freight-elevator-dock: baret 31% genişlikte; fare takibi var (activity="hauling"). */
  dockWorker: {
    view: 'full',
    accessories: ['eyebags', 'beard', 'mustache', 'hard-hat', 'blue-collar'],
    layerOverrides: { 'hard-hat': { box: DOCK_HAT } },
    tracking: { fields: false, idleSleep: false },
  },
  /** freight-elevator-dock → mini-avatar: kare baş kırpması (yuvarlak maskeye uygun, türetilmiş). */
  miniAvatar: {
    view: { box: { x: 200, y: -12, w: 216, h: 216 }, groups: ['head'] },
    accessories: ['eyebags', 'beard', 'mustache', 'hard-hat'],
    layerOverrides: { 'hard-hat': { box: DOCK_HAT } },
    tracking: { fields: false, idleSleep: false },
  },
} satisfies Record<string, CharacterConfigInput>;

export type CharacterPresetName = keyof typeof CHARACTER_PRESETS;
