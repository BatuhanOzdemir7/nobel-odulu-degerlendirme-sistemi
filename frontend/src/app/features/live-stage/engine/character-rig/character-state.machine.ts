/**
 * character-state.machine.ts — Saf durum makinesi (DOM yok, zamanlayıcı yok).
 *
 * Olaylar (CharacterEvent) → yeni durum. Zaman bazlı geçişler (göz kırpma bitişi, uyku, hapşırma
 * sonu…) zamanlayıcıyı çalıştıran controller tarafından ayrı olaylar olarak gönderilir.
 *
 * Mod önceliği (yüksekten düşüğe):
 *   sleeping › peeking (gizli alan odakta) › tracking-caret › focused › tracking-pointer › idle
 */
import type {
  CharacterActivity,
  CharacterEvent,
  CharacterExpression,
  CharacterMode,
  CharacterState,
  CharacterStateCore,
  Vec2,
} from './character.types';

const CORE_INITIAL: CharacterStateCore = {
  activity: 'none',
  emote: null,
  pointer: null,
  focusPoint: null,
  caret: null,
  privacy: false,
  sleeping: false,
  startled: false,
  sneezing: false,
  typing: false,
  blinking: false,
  talking: false,
  peekEye: null,
  winkEye: null,
  nosePressed: false,
  boopStreak: 0,
  hoveredFinger: null,
  pressedFinger: null,
  visible: true,
  reducedMotion: false,
};

export function resolveMode(s: CharacterStateCore): CharacterMode {
  if (s.sleeping) return 'sleeping';
  if (s.focusPoint) {
    if (s.privacy) return 'peeking';
    return s.caret ? 'tracking-caret' : 'focused';
  }
  return s.pointer ? 'tracking-pointer' : 'idle';
}

/** Geçici ifadeler (hapşırma, irkilme) mod ifadesini geçici olarak ezer. */
export function resolveExpression(s: CharacterStateCore, mode: CharacterMode): CharacterExpression {
  if (s.sneezing) return 'sneezing';
  if (s.startled) return 'startled';
  if (s.emote && mode !== 'sleeping') return s.emote;
  switch (mode) {
    case 'sleeping':
      return 'asleep';
    case 'peeking':
      return 'peeking';
    case 'tracking-caret':
    case 'focused':
      return 'attentive';
    default:
      return 'neutral';
  }
}

function derive(core: CharacterStateCore): CharacterState {
  const mode = resolveMode(core);
  return { ...core, mode, expression: resolveExpression(core, mode) };
}

export const INITIAL_CHARACTER_STATE: CharacterState = derive(CORE_INITIAL);

/** Değişen alan yoksa aynı referansı döndürür (gereksiz bildirimleri önler). */
function patch(state: CharacterState, changes: Partial<CharacterStateCore>): CharacterState {
  const keys = Object.keys(changes) as (keyof CharacterStateCore)[];
  if (keys.every((key) => state[key] === changes[key])) return state;
  return derive({ ...state, ...changes });
}

export function reduceCharacter(state: CharacterState, event: CharacterEvent): CharacterState {
  switch (event.type) {
    case 'pointer-move':
      return patch(state, { pointer: event.point });
    case 'pointer-leave':
      return patch(state, { pointer: null });
    case 'field-focus':
      return patch(state, {
        focusPoint: event.focusPoint,
        caret: event.privacy ? null : event.caret,
        privacy: event.privacy,
      });
    case 'field-update':
      if (!state.focusPoint) return state;
      return patch(state, {
        focusPoint: event.focusPoint,
        caret: state.privacy ? null : event.caret,
      });
    case 'field-blur':
      return patch(state, {
        focusPoint: null,
        caret: null,
        privacy: false,
        typing: false,
        peekEye: null,
      });
    case 'typing':
      return patch(state, { typing: event.on });
    case 'sleep':
      // Bir alan odaktayken uyumaz.
      if (state.focusPoint) return state;
      return patch(state, { sleeping: true, blinking: false, peekEye: null, winkEye: null });
    case 'wake':
      return state.sleeping ? patch(state, { sleeping: false, startled: true }) : state;
    case 'emote':
      return patch(state, { emote: event.emote });
    case 'startle':
      return state.sleeping ? state : patch(state, { startled: true });
    case 'startle-end':
      return patch(state, { startled: false });
    case 'blink':
      return patch(state, { blinking: event.on && !state.sleeping });
    case 'peek':
      return patch(state, { peekEye: state.mode === 'peeking' ? event.eye : null });
    case 'wink':
      return patch(state, { winkEye: state.sleeping ? null : event.eye });
    case 'talk':
      return patch(state, { talking: event.on });
    case 'boop':
      return patch(state, { nosePressed: true, boopStreak: state.boopStreak + 1 });
    case 'boop-release':
      return patch(state, { nosePressed: false });
    case 'boop-streak-reset':
      return patch(state, { boopStreak: 0 });
    case 'sneeze':
      return patch(state, { sneezing: true, boopStreak: 0 });
    case 'sneeze-end':
      return patch(state, { sneezing: false });
    case 'finger-hover':
      return patch(state, { hoveredFinger: event.finger });
    case 'finger-press':
      return patch(state, { pressedFinger: event.finger });
    case 'set-activity':
      return patch(state, { activity: event.activity });
    case 'environment':
      return patch(state, { visible: event.visible, reducedMotion: event.reducedMotion });
  }
}

/** Aktif moda göre bakılacak viewport noktası; `null` → dinlenme bakışı. */
export function selectGazeTarget(state: CharacterState): Vec2 | null {
  switch (state.mode) {
    case 'tracking-caret':
      return state.caret;
    case 'focused':
      return state.focusPoint;
    // gizli alanda yalnızca "göz ucuyla" bakarken alana döner
    case 'peeking':
      return state.peekEye ? state.focusPoint : null;
    case 'tracking-pointer':
      return state.pointer;
    default:
      return null;
  }
}

/**
 * Hedef yokken bakış. logo-loop işçisinde göz bebeği sabit biçimde aşağıdadır
 * (.worker-pupil left:33% top:42% → y ≈ +0.36).
 */
export function selectRestGaze(state: Pick<CharacterState, 'activity'>): Vec2 {
  return restGazeFor(state.activity);
}

function restGazeFor(activity: CharacterActivity): Vec2 {
  return activity === 'pushing' ? { x: 0, y: 0.36 } : { x: 0, y: 0 };
}
