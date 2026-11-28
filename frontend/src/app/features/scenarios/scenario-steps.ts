import type { ErHighlight, StageCue, StageVote } from '../../core/events/activity-event.model';
import { ER_EDGES } from '../live-stage/er/er-topology';

interface Scenario {
  readonly id: number;
  readonly organization: string;
  readonly candidate: string;
  readonly category: string;
  readonly award: string;
  readonly experts: readonly [string, string, string];
}

export type ScenarioStep = {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly sql: string;
  readonly highlight: ErHighlight;
} & (
  { readonly cue: StageCue; readonly categoryPath?: never }
  | { readonly categoryPath: readonly [string, string, string]; readonly cue?: never }
);

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 1, organization: 'CERN', candidate: 'Selin Arslan', category: 'Fizik', award: 'Nobel Fizik Ödülü',
    experts: ['Prof. Leyla Aksoy', 'Prof. Murat Erdem', 'Dr. Elif Arslan'],
  },
  {
    id: 2, organization: 'Kuzey Sağlık Enstitüsü', candidate: 'Ece Aydın', category: 'Tıp',
    award: 'Nobel Fizyoloji veya Tıp Ödülü', experts: ['Prof. Jonas Berg', 'Dr. Sara Lind', 'Prof. Erik Holm'],
  },
  {
    id: 3, organization: 'Uluslararası Kimya Akademisi', candidate: 'Arda Yalçın', category: 'Kimya',
    award: 'Nobel Kimya Ödülü', experts: ['Prof. Nil Aksoy', 'Dr. Can Erdem', 'Prof. Ada Sönmez'],
  },
];

const NOMINATION_NODES = ['KURULUS', 'aday_gosterir', 'ADAY', 'ODUL'];
const CATEGORY_NODES = ['ODUL', 'kategorisine_aittir', 'KATEGORI', 'olusturulur', 'DEGERLENDIRME_KOMITESI'];
const DECISION_NODES = ['DEGERLENDIRME_KOMITESI', 'degerlendirir', 'ADAY'];
const VOTE_NODES = ['UZMAN', 'uyesidir', ...DECISION_NODES];

export function createScenarioSteps(scenario: Scenario, run: number, random = Math.random): readonly ScenarioStep[] {
  const { id, candidate, organization, category, award, experts } = scenario;
  const members = experts.map((label, index) => ({ expertId: id * 10 + index + 1, label }));
  const committee = { committeeId: id, committeeLabel: `${category} Değerlendirme Komitesi`, members };
  const votes = members.map<StageVote>(({ expertId }) => ({ expertId, vote: random() < .5 ? 'KABUL' : 'RED' }));
  const kabul = votes.filter(vote => vote.vote === 'KABUL').length;
  const red = votes.length - kabul;
  const awarded = kabul > red;
  const result = awarded ? 'KABUL' : 'RED';

  return [
    {
      id: `scenario-${run}-nomination`,
      title: 'Aday gösterme',
      detail: `${organization}, ${candidate} adlı araştırmacıyı ${award} için aday gösterdi.`,
      sql: 'INSERT INTO aday_gosterme (kurulus_no, aday_id, odul_no, tarih, saat) VALUES (:kurulus_no, :aday_id, :odul_no, CURRENT_DATE, LOCALTIME)',
      highlight: highlightFor(NOMINATION_NODES),
      cue: {
        scene: 'NOMINATION',
        organizationLabel: organization, candidateName: candidate, awardLabel: award, categoryLabel: category,
        newAccount: true,
      },
    },
    {
      id: `scenario-${run}-category`,
      title: 'Kategori ve komite eşleştirmesi',
      detail: `${award}, ${category} kategorisine bağlıdır. Bu kategorideki adaylığı ${committee.committeeLabel} inceler.`,
      sql: `SELECT k.kategori_adi, c.komite_adi FROM odul o JOIN kategori k USING (kategori_id) JOIN degerlendirme_komitesi c USING (kategori_id) WHERE o.aciklayici_ad = '${award}' AND c.komite_adi = '${committee.committeeLabel}'`,
      highlight: highlightFor(CATEGORY_NODES, 'info'),
      categoryPath: [award, category, committee.committeeLabel],
    },
    ...members.map<ScenarioStep>(({ expertId, label }, index) => {
      const { vote } = votes[index];
      return {
        id: `scenario-${run}-vote-${expertId}`,
        title: `${index + 1}. uzman oyu`,
        detail: `${label} ${vote === 'KABUL' ? 'kabul' : 'ret'} oyu verdi.`,
        sql: `INSERT INTO uzman_oyu (komite_id, uzman_id, aday_id, olcut, karar) VALUES (:komite_id, :uzman_id, :aday_id, 'Özgünlük', '${vote}')`,
        highlight: highlightFor(VOTE_NODES),
        cue: {
          scene: 'COMMITTEE_VOTE',
          ...committee, candidateName: candidate, expertId, expertLabel: label, vote,
          votesCast: index + 1, votesRequired: members.length, votes: votes.slice(0, index + 1),
        },
      };
    }),
    {
      id: `scenario-${run}-decision`,
      title: awarded ? 'Ödül verildi' : 'Ödül verilmedi',
      detail: `${candidate} için komite kararı ${kabul} kabul ve ${red} ret oyuyla kesinleşti.`,
      sql: `INSERT INTO degerlendirme (komite_id, aday_id, tarih, sonuc, olcut) VALUES (:komite_id, :aday_id, CURRENT_DATE, '${result}', 'Özgünlük')`,
      highlight: highlightFor(awarded ? [...DECISION_NODES, 'aday_gosterir', 'ODUL'] : DECISION_NODES),
      cue: {
        scene: 'DECISION_FINALIZED',
        ...committee, candidateName: candidate, result, tally: { kabul, red, incelemede: 0 },
      },
    },
  ];
}

function highlightFor(nodes: readonly string[], severity: ErHighlight['severity'] = 'success'): ErHighlight {
  const edges = ER_EDGES.filter(edge => nodes.includes(edge.from) && nodes.includes(edge.to)).map(edge => edge.id);
  return { nodes, edges, severity };
}
