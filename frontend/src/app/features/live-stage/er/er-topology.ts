type ErNodeKind = 'entity' | 'relationship';

interface ErNode {
  readonly id: string;
  readonly kind: ErNodeKind;
  readonly label: string;
  readonly cx: number;
  readonly cy: number;
  readonly w: number;
  readonly h: number;
}

export const ER_NODES = [
  { id: 'KURULUS', kind: 'entity', label: 'KURULUŞ', cx: 120, cy: 90, w: 160, h: 56 },
  { id: 'aday_gosterir', kind: 'relationship', label: 'aday gösterir', cx: 340, cy: 90, w: 170, h: 72 },
  { id: 'ADAY', kind: 'entity', label: 'ADAY', cx: 560, cy: 90, w: 160, h: 56 },
  { id: 'ODUL', kind: 'entity', label: 'ÖDÜL', cx: 340, cy: 250, w: 160, h: 56 },
  { id: 'kategorisine_aittir', kind: 'relationship', label: 'kategorisine aittir', cx: 340, cy: 390, w: 170, h: 72 },
  { id: 'KATEGORI', kind: 'entity', label: 'KATEGORİ', cx: 340, cy: 530, w: 160, h: 56 },
  { id: 'olusturulur', kind: 'relationship', label: 'oluşturulur', cx: 545, cy: 530, w: 170, h: 72 },
  { id: 'DEGERLENDIRME_KOMITESI', kind: 'entity', label: 'DEĞERLENDİRME KOMİTESİ', cx: 780, cy: 530, w: 220, h: 56 },
  { id: 'degerlendirir', kind: 'relationship', label: 'değerlendirir', cx: 780, cy: 310, w: 170, h: 72 },
  { id: 'UZMAN', kind: 'entity', label: 'UZMAN', cx: 980, cy: 270, w: 160, h: 56 },
  { id: 'uyesidir', kind: 'relationship', label: 'üyesidir', cx: 980, cy: 410, w: 170, h: 72 },
] as const satisfies readonly ErNode[];

type ErNodeId = typeof ER_NODES[number]['id'];
const nodesById = new Map(ER_NODES.map(node => [node.id, node]));

export const ER_EDGES = [
  edge('KURULUS', 'aday_gosterir'),
  edge('aday_gosterir', 'ADAY'),
  edge('aday_gosterir', 'ODUL'),
  edge('ODUL', 'kategorisine_aittir'),
  edge('kategorisine_aittir', 'KATEGORI'),
  edge('KATEGORI', 'olusturulur'),
  edge('olusturulur', 'DEGERLENDIRME_KOMITESI'),
  edge('DEGERLENDIRME_KOMITESI', 'degerlendirir'),
  edge('degerlendirir', 'ADAY'),
  edge('UZMAN', 'uyesidir'),
  edge('uyesidir', 'DEGERLENDIRME_KOMITESI'),
] as const;

function edge(from: ErNodeId, to: ErNodeId) {
  const source = nodesById.get(from)!;
  const target = nodesById.get(to)!;
  return { id: [from, to].join('-'), from, to, start: border(source, target), end: border(target, source) };
}

function border(node: ErNode, toward: ErNode): { x: number; y: number } {
  const dx = toward.cx - node.cx;
  const dy = toward.cy - node.cy;
  const x = Math.abs(dx) / (node.w / 2);
  const y = Math.abs(dy) / (node.h / 2);
  const scale = 1 / (node.kind === 'entity' ? Math.max(x, y) : x + y);
  return { x: node.cx + dx * scale, y: node.cy + dy * scale };
}
