/**
 * character-kinematics.math.ts — Saf matematik ve hareket motoru.
 * DOM, Angular veya zamanlayıcı bilgisi içermez; her fonksiyon girdisinden çıktısını üretir.
 *
 * Kaynak: guardian-head.ts → guardianGaze() (birim çembere sıkıştırma);
 *         work-page.ts → trackPointer() (-1..1 normalizasyon).
 */
import type {
  CharacterPose,
  CharacterStateCore,
  EyeSide,
  LayerBox,
  ParallaxTuning,
  SmoothingTuning,
  Vec2,
} from './character.types';

export const ZERO: Vec2 = { x: 0, y: 0 };

/** hero.css .closed / .sleeping: scaleY(0.06). */
export const EYE_CLOSED = 0.06;
/** Gözetleme (peeking) sırasında aralanan göz açıklığı (yeni). */
export const EYE_PEEK = 0.38;

/* ───────────── Skaler yardımcılar ───────────── */

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

/**
 * Kare hızından bağımsız üstel sönümleme: `lerp(current, target, 1 - e^(-dt/tau))`.
 * tau ≤ 0 → anında hedefe atlar.
 */
export function damp(current: number, target: number, tauMs: number, dtMs: number): number {
  if (tauMs <= 0) return target;
  return lerp(current, target, 1 - Math.exp(-dtMs / tauMs));
}

/* ───────────── Açı dönüşümleri ───────────── */

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Ekran koordinatlarında (y aşağı) vektörün derece cinsinden açısı: 0° = sağ, 90° = aşağı. */
export const vecAngleDeg = (v: Vec2): number => radToDeg(Math.atan2(v.y, v.x));

export const vecFromAngleDeg = (deg: number, magnitude = 1): Vec2 => ({
  x: Math.cos(degToRad(deg)) * magnitude,
  y: Math.sin(degToRad(deg)) * magnitude,
});

/* ───────────── Vektör yardımcıları ───────────── */

export const dampVec = (current: Vec2, target: Vec2, tauMs: number, dtMs: number): Vec2 => ({
  x: damp(current.x, target.x, tauMs, dtMs),
  y: damp(current.y, target.y, tauMs, dtMs),
});

/**
 * Vektörü birim çembere sıkıştırır: çember içindeyse korunur, dışındaysa normalize edilir.
 * Sonlu olmayan girdi → (0,0). Birebir guardian-head.ts → guardianGaze().
 */
export function limitToUnitDisc(v: Vec2): Vec2 {
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) return ZERO;
  const magnitude = Math.max(1, Math.hypot(v.x, v.y));
  return { x: v.x / magnitude, y: v.y / magnitude };
}

/* ───────────── Bakış ───────────── */

/**
 * Hedef noktaya (viewport px) göre bakış vektörü. `reachPx` uzaklıkta birim çembere doyar.
 * Hedef yoksa (0,0).
 */
export function gazeFromTarget(origin: Vec2, target: Vec2 | null, reachPx: number): Vec2 {
  if (!target || reachPx <= 0) return ZERO;
  return limitToUnitDisc({ x: (target.x - origin.x) / reachPx, y: (target.y - origin.y) / reachPx });
}

/** Tasarım uzayı noktasını, görünümü `rect` ile gösterilen elemanın viewport koordinatına çevirir. */
export function designToViewport(
  rect: { readonly left: number; readonly top: number; readonly width: number; readonly height: number },
  view: LayerBox,
  point: Vec2,
): Vec2 {
  return {
    x: rect.left + ((point.x - view.x) / view.w) * rect.width,
    y: rect.top + ((point.y - view.y) / view.h) * rect.height,
  };
}

/* ───────────── Paralaks ve poz ───────────── */

export interface Parallax {
  readonly head: Vec2;
  readonly tilt: number;
  readonly brow: Vec2;
}

/** Bakış yönüne göre baş kayması, baş eğimi ve kaş paralaksı (hedef değerler). */
export function computeParallax(gaze: Vec2, tuning: ParallaxTuning): Parallax {
  return {
    head: { x: gaze.x * tuning.head.x, y: gaze.y * tuning.head.y },
    tilt: gaze.x * tuning.tiltDeg,
    // yukarı bakınca (gaze.y < 0) kaşlar da hafif yukarı çıkar
    brow: { x: gaze.x * tuning.brow.x, y: gaze.y * tuning.brow.y },
  };
}

export const NEUTRAL_POSE: CharacterPose = { gaze: ZERO, head: ZERO, tilt: 0, brow: ZERO };

export function targetPose(gaze: Vec2, tuning: ParallaxTuning): CharacterPose {
  const parallax = computeParallax(gaze, tuning);
  return { gaze, head: parallax.head, tilt: parallax.tilt, brow: parallax.brow };
}

/** Göz bebekleri hızlı, baş ve kaşlar daha yavaş izler; bu gecikme paralaks hissini verir. */
export function stepPose(
  current: CharacterPose,
  target: CharacterPose,
  smoothing: SmoothingTuning,
  dtMs: number,
): CharacterPose {
  return {
    gaze: dampVec(current.gaze, target.gaze, smoothing.pupilMs, dtMs),
    head: dampVec(current.head, target.head, smoothing.headMs, dtMs),
    tilt: damp(current.tilt, target.tilt, smoothing.headMs, dtMs),
    brow: dampVec(current.brow, target.brow, smoothing.browMs, dtMs),
  };
}

export function isPoseSettled(a: CharacterPose, b: CharacterPose, epsilon = 0.004): boolean {
  return (
    Math.abs(a.gaze.x - b.gaze.x) < epsilon &&
    Math.abs(a.gaze.y - b.gaze.y) < epsilon &&
    Math.abs(a.head.x - b.head.x) < epsilon &&
    Math.abs(a.head.y - b.head.y) < epsilon &&
    Math.abs(a.tilt - b.tilt) < epsilon &&
    Math.abs(a.brow.x - b.brow.x) < epsilon &&
    Math.abs(a.brow.y - b.brow.y) < epsilon
  );
}

/* ───────────── Göz, sürükleme, zamanlama ───────────── */

/** Gözün son açıklığı: kırpma/gözetleme geçersiz kılmaları ifade değerinin üzerine biner. */
export function resolveEyeOpenness(
  base: number,
  side: EyeSide,
  state: Pick<CharacterStateCore, 'peekEye' | 'winkEye'>,
): number {
  if (state.winkEye === side) return EYE_CLOSED;
  if (state.peekEye === side) return Math.max(base, EYE_PEEK);
  return base;
}

/** Ekran pikselindeki sürükleme farkını tasarım pikseline çevirip [min, max] içine sıkıştırır. */
export function clampDrag(deltaPx: number, pxPerUnit: number, min: number, max: number): number {
  if (!(pxPerUnit > 0)) return 0;
  return clamp(deltaPx / pxPerUnit, min, max);
}

/** Bir sonraki göz kırpmaya kadar bekleme (ms). `random` test için enjekte edilebilir. */
export function nextBlinkDelay(
  timing: { readonly blinkMinMs: number; readonly blinkSpanMs: number },
  random: () => number = Math.random,
): number {
  return timing.blinkMinMs + random() * timing.blinkSpanMs;
}
