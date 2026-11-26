/**
 * caret-tracker.util.ts — Genel amaçlı imleç (caret) konum çözümleyici.
 *
 * Kaynak: guest-board_caret-position.ts → PaperCaretMirror. Yapılan sadeleştirmeler:
 *  - Renderer2/Angular bağımlılığı kaldırıldı; yalnızca DOM API'si kullanılır.
 *  - "paper" kutusuna kırpma kaldırıldı; sonuç viewport koordinatıdır.
 *  - Ayna eleman ilk ölçümde oluşturulur (kullanılmıyorsa DOM'a dokunmaz).
 *  - `cleanGuestText` ziyaretçi defteri iş mantığı olduğu için taşınmadı.
 *
 * GİZLİLİK: Ayna, alanın değerini gizli bir DOM düğümüne kopyalar. Bu yüzden
 * `type="password"` alanları ölçülmez ve değerleri asla kopyalanmaz.
 */

export type CaretField = HTMLInputElement | HTMLTextAreaElement;

export interface CaretPoint {
  /** Caret'in sol kenarı (viewport px). */
  readonly x: number;
  /** Caret satırının üst kenarı (viewport px). */
  readonly y: number;
  /** Caret satır yüksekliği (px). Dikey merkez: y + height / 2. */
  readonly height: number;
}

/** Seçim/caret API'si olan metin girdi tipleri. `password` bilerek yok. */
const TRACKABLE_INPUT_TYPES: ReadonlySet<string> = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'number',
]);

const TEXT_METRICS = [
  'box-sizing',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'font-variant',
  'font-stretch',
  'font-kerning',
  'font-feature-settings',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'text-indent',
  'text-align',
  'text-transform',
  'tab-size',
  'direction',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
] as const;

export function isCaretTrackable(element: Element | null): element is CaretField {
  if (!element) return false;
  if (element.tagName === 'TEXTAREA') return true;
  return (
    element.tagName === 'INPUT' &&
    TRACKABLE_INPUT_TYPES.has((element as HTMLInputElement).type)
  );
}

/** Tarayıcıya özgü ayna: daraltılmış bir Range, satır kaymalarını da dahil seçimi izler. */
export class CaretTracker {
  private mirror: HTMLDivElement | null = null;

  constructor(private readonly doc: Document) {}

  measure(field: CaretField): CaretPoint | null {
    const view = this.doc.defaultView;
    if (!view || !field.isConnected || !isCaretTrackable(field)) return null;

    const mirror = this.ensureMirror();
    const styles = view.getComputedStyle(field);
    const fieldRect = field.getBoundingClientRect();
    for (const property of TEXT_METRICS) {
      mirror.style.setProperty(property, styles.getPropertyValue(property));
    }
    const multiline = field.tagName === 'TEXTAREA';
    mirror.style.left = `${fieldRect.left}px`;
    mirror.style.top = `${fieldRect.top}px`;
    mirror.style.width = `${fieldRect.width}px`;
    mirror.style.height = 'auto';
    mirror.style.whiteSpace = multiline ? 'pre-wrap' : 'pre';
    mirror.style.overflowWrap = multiline ? 'break-word' : 'normal';

    const value = field.value;
    let offset = value.length;
    try {
      // email/number gibi tiplerde selectionStart null döner veya eski tarayıcılarda fırlatır
      offset = field.selectionStart ?? value.length;
    } catch {
      offset = value.length;
    }
    offset = Math.max(0, Math.min(offset, value.length));

    const text = this.doc.createTextNode(`${value}\u200b`);
    mirror.replaceChildren(text);
    const range = this.doc.createRange();
    range.setStart(text, offset);
    range.collapse(true);
    let rect = range.getBoundingClientRect();
    if (!rect.height) {
      // satır sonu/boş satırda Range yükseklik vermez; işaretçi span ile yeniden ölç
      const marker = this.doc.createElement('span');
      marker.textContent = '\u200b';
      mirror.replaceChildren(
        this.doc.createTextNode(value.slice(0, offset)),
        marker,
        this.doc.createTextNode(value.slice(offset)),
      );
      rect = marker.getBoundingClientRect();
    }
    range.detach();

    const lineHeight =
      Number.parseFloat(styles.lineHeight) || Number.parseFloat(styles.fontSize) * 1.3 || 16;
    const height = rect.height ? Math.min(rect.height, lineHeight) : lineHeight;
    const x = rect.left - field.scrollLeft;
    const y = rect.top - field.scrollTop;
    return {
      x: Math.max(fieldRect.left, Math.min(fieldRect.right, x)),
      y: Math.max(fieldRect.top, Math.min(Math.max(fieldRect.top, fieldRect.bottom - height), y)),
      height,
    };
  }

  destroy(): void {
    this.mirror?.remove();
    this.mirror = null;
  }

  private ensureMirror(): HTMLDivElement {
    if (this.mirror?.isConnected) return this.mirror;
    const mirror = this.doc.createElement('div');
    mirror.setAttribute('aria-hidden', 'true');
    mirror.setAttribute('data-character-caret-mirror', '');
    Object.assign(mirror.style, {
      position: 'fixed',
      visibility: 'hidden',
      pointerEvents: 'none',
      margin: '0',
      overflow: 'visible',
      borderStyle: 'solid',
      borderColor: 'transparent',
    });
    this.doc.body.appendChild(mirror);
    this.mirror = mirror;
    return mirror;
  }
}
