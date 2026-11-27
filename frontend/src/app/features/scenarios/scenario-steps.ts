import type { ErHighlight, StageVote } from '../../core/events/activity-event.model';
import { ER_EDGES } from '../live-stage/er/er-topology';
import type { StageCharacterCommand } from '../live-stage/stage/stage.contract';

interface Scenario {
  readonly id: number;
  readonly organization: string;
  readonly candidate: string;
  readonly category: string;
  readonly award: string;
  readonly experts: readonly [string, string, string];
}

export interface ScenarioStep {
  readonly title: string;
  readonly detail: string;
  readonly sql: string;
  readonly highlight: ErHighlight;
  readonly command: StageCharacterCommand;
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 1, organization: 'CERN', candidate: 'Dr. Selin Arslan', category: 'Fizik', award: 'Nobel Fizik Ödülü',
    experts: ['Prof. İlker Kaya', 'Prof. Elif Demir', 'Dr. Deniz Akın'],
  },
  {
    id: 2, organization: 'Kuzey Sağlık Enstitüsü', candidate: 'Dr. Ece Aydın', category: 'Tıp',
    award: 'Nobel Fizyoloji veya Tıp Ödülü', experts: ['Prof. Zeynep Tunç', 'Dr. Mert Uslu', 'Prof. Leyla Duru'],
  },
  {
    id: 3, organization: 'Uluslararası Kimya Akademisi', candidate: 'Dr. Arda Yalçın', category: 'Kimya',
    award: 'Nobel Kimya Ödülü', experts: ['Prof. Nil Aksoy', 'Dr. Can Erdem', 'Prof. Ada Sönmez'],
  },
];

const NOMINATION_NODES = ['KURULUS', 'aday_gosterir', 'ADAY', 'ODUL'];
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
      title: 'Aday gösterme',
      detail: `${organization}, ${candidate} adlı araştırmacıyı ${award} için aday gösterdi.`,
      sql: `INSERT INTO aday_gosterme (kurulus_no, aday_id, odul_no, tarih, saat) VALUES (${id}, ${id}, ${id}, CURRENT_DATE, LOCALTIME)`,
      highlight: highlightFor(NOMINATION_NODES),
      command: {
        eventId: `scenario-${run}-nomination`, scene: 'NOMINATION', severity: 'success',
        organizationLabel: organization, candidateName: candidate, awardLabel: award, categoryLabel: category,
        newAccount: true,
      },
    },
    ...members.map<ScenarioStep>(({ expertId, label }, index) => {
      const { vote } = votes[index];
      return {
        title: `${index + 1}. uzman oyu`,
        detail: `${label} ${vote === 'KABUL' ? 'kabul' : 'ret'} oyu verdi.`,
        sql: `INSERT INTO uzman_oyu (komite_id, uzman_id, aday_id, olcut, karar) VALUES (${id}, ${expertId}, ${id}, 'Özgünlük', '${vote}')`,
        highlight: highlightFor(VOTE_NODES),
        command: {
          eventId: `scenario-${run}-vote-${expertId}`, scene: 'COMMITTEE_VOTE', severity: 'success',
          ...committee, candidateName: candidate, expertId, expertLabel: label, vote,
          votesCast: index + 1, votesRequired: members.length, votes: votes.slice(0, index + 1),
        },
      };
    }),
    {
      title: awarded ? 'Ödül verildi' : 'Ödül verilmedi',
      detail: `${candidate} için komite kararı ${kabul} kabul ve ${red} ret oyuyla kesinleşti.`,
      sql: `INSERT INTO degerlendirme (komite_id, aday_id, tarih, sonuc, olcut) VALUES (${id}, ${id}, CURRENT_DATE, '${result}', 'Özgünlük')`,
      highlight: highlightFor(awarded ? [...DECISION_NODES, 'aday_gosterir', 'ODUL'] : DECISION_NODES),
      command: {
        eventId: `scenario-${run}-decision`, scene: 'DECISION_FINALIZED', severity: 'success',
        ...committee, candidateName: candidate, result, tally: { kabul, red, incelemede: 0 },
      },
    },
  ];
}

function highlightFor(nodes: readonly string[]): ErHighlight {
  const edges = ER_EDGES.filter(edge => nodes.includes(edge.from) && nodes.includes(edge.to)).map(edge => edge.id);
  return { nodes, edges, severity: 'success' };
}
