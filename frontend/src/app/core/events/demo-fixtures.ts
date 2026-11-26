import { ER_EDGES } from '../../features/live-stage/er/er-topology';
import type { ActivityAction, ActivityEvent, ActorRole, EventSeverity, StageCue } from './activity-event.model';

const nomination = ['KURULUS', 'aday_gosterir', 'ADAY', 'ODUL'];
const membership = ['UZMAN', 'uyesidir', 'DEGERLENDIRME_KOMITESI'];
const committee = ['KATEGORI', 'olusturulur', 'DEGERLENDIRME_KOMITESI'];
const decision = ['DEGERLENDIRME_KOMITESI', 'degerlendirir', 'ADAY'];
const members = [
  { expertId: 1, label: 'Prof. Dr. İlker Kaya' },
  { expertId: 2, label: 'Prof. Dr. Elif Demir' },
  { expertId: 3, label: 'Prof. Dr. Deniz Akın' },
];
const committeeInfo = { committeeId: 1, committeeLabel: 'Fizik Komitesi', members };
const candidateName = 'Dr. Selin Arslan';

type DemoFixture = Omit<ActivityEvent, 'eventId' | 'timestamp'> & { readonly label: string };

function demo(action: ActivityAction, label: string, sqlSummary: string, nodes: readonly string[],
              severity: EventSeverity, actorRole: ActorRole = 'ADMIN', actorLabel = 'Yönetici',
              stageCue?: StageCue): DemoFixture {
  const edges = ER_EDGES.filter(edge => nodes.includes(edge.from) && nodes.includes(edge.to)).map(edge => edge.id);
  return { action, label, sqlSummary, erHighlight: { nodes, edges, severity }, actorRole, actorLabel, stageCue };
}

export const DEMO_FIXTURES: readonly DemoFixture[] = [
  demo('NOMINATION_CREATED', 'Aday göster', 'INSERT INTO aday_gosterme (kurulus_no=1, aday_id=4, odul_no=1)',
    nomination, 'success', 'KURULUS', 'CERN', {
      scene: 'NOMINATION', organizationLabel: 'CERN', candidateName, awardLabel: 'Nobel Fizik Ödülü',
      categoryLabel: 'Fizik', newAccount: true,
    }),
  demo('EXPERT_VOTED', 'Uzman oyu', "INSERT INTO uzman_oyu (komite_id=1, uzman_id=1, aday_id=4, karar='KABUL')",
    [...membership, 'degerlendirir', 'ADAY'], 'success', 'UZMAN', members[0].label, {
      scene: 'COMMITTEE_VOTE', ...committeeInfo, expertId: 1, expertLabel: members[0].label, candidateName,
      vote: 'KABUL', votesCast: 1, votesRequired: 3, votes: [{ expertId: 1, vote: 'KABUL' }],
    }),
  demo('DECISION_FINALIZED', 'Kararı kesinleştir', "INSERT INTO degerlendirme (komite_id=1, aday_id=4, sonuc='KABUL')",
    decision, 'success', 'SYSTEM', 'Sistem', {
      scene: 'DECISION_FINALIZED', ...committeeInfo, candidateName, result: 'KABUL',
      tally: { kabul: 2, red: 1, incelemede: 0 },
    }),
  demo('REGISTRY_CREATED', 'Ödül kaydı ekle', 'INSERT INTO odul (odul_no=1)', ['ODUL'], 'success'),
  demo('REGISTRY_UPDATED', 'Aday kaydını güncelle', 'UPDATE aday WHERE aday_id=4', ['ADAY'], 'success'),
  demo('REGISTRY_DELETED', 'Kuruluş kaydını sil', 'DELETE FROM kurulus WHERE kurulus_no=1', ['KURULUS'], 'info'),
  demo('COMMITTEE_CREATED', 'Komite oluştur', 'INSERT INTO degerlendirme_komitesi (komite_id=1)', committee, 'success'),
  demo('COMMITTEE_DELETED', 'Komite sil', 'DELETE FROM degerlendirme_komitesi WHERE komite_id=1', committee, 'info'),
  demo('COMMITTEE_MEMBER_ADDED', 'Komite üyesi ekle', 'INSERT INTO komite_uyesi (komite_id=1, uzman_id=1)',
    membership, 'success'),
  demo('COMMITTEE_MEMBER_REMOVED', 'Komite üyesi çıkar', 'DELETE FROM komite_uyesi WHERE komite_id=1 AND uzman_id=1',
    membership, 'info'),
  demo('CONSTRAINT_VIOLATION', 'Trigger ihlali', 'PostgreSQL [23514] · PostgreSQL Trigger: En az 3 uzman gerekli!',
    membership, 'error', 'SYSTEM', 'Yönetici', {
      scene: 'CONSTRAINT_ERROR', ...committeeInfo, memberCount: 3, expertLabel: members[0].label,
      message: 'PostgreSQL Trigger: En az 3 uzman gerekli!',
    }),
];

let demoSequence = 0;

export function createDemoEvent({ label: _label, ...event }: DemoFixture): ActivityEvent {
  return { ...event, eventId: 'demo-' + (++demoSequence), timestamp: new Date().toISOString() };
}
