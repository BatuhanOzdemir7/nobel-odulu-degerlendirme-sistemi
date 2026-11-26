import { DEMO_FIXTURES } from '../../../../core/events/demo-fixtures';
import type { StageVote, VoteValue } from '../../../../core/events/activity-event.model';

export function stageDemoFixtures() {
  const vote = DEMO_FIXTURES.find((fixture) => fixture.stageCue?.scene === 'COMMITTEE_VOTE');
  const decision = DEMO_FIXTURES.find((fixture) => fixture.stageCue?.scene === 'DECISION_FINALIZED');
  const voteCue = vote?.stageCue;
  const decisionCue = decision?.stageCue;
  if (!vote || !decision || voteCue?.scene !== 'COMMITTEE_VOTE' || decisionCue?.scene !== 'DECISION_FINALIZED') {
    return [];
  }

  const [first, second, third] = voteCue.members;
  if (!first || !second || !third) return [];

  const firstVote: StageVote = { expertId: first.expertId, vote: 'KABUL' };
  const secondVote: StageVote = { expertId: second.expertId, vote: 'RED' };
  const thirdVote: StageVote = { expertId: third.expertId, vote: 'INCELEMEDE' };
  const voteFixtures = [
    { label: 'Oy 2/3 · Red', expert: second, ballot: secondVote, votes: [firstVote, secondVote] },
    { label: 'Oy 3/3 · İncelemede', expert: third, ballot: thirdVote, votes: [firstVote, secondVote, thirdVote] },
  ].map(({ label, expert, ballot, votes }) => ({
    ...vote,
    label,
    actorLabel: expert.label,
    sqlSummary: "INSERT INTO uzman_oyu (komite_id=" + voteCue.committeeId
      + ", uzman_id=" + expert.expertId + ", karar='" + ballot.vote + "')",
    stageCue: {
      ...voteCue, expertId: expert.expertId, expertLabel: expert.label, vote: ballot.vote, votesCast: votes.length, votes,
    },
  }));

  const decisions: readonly { label: string; result: VoteValue; tally: typeof decisionCue.tally }[] = [
    { label: 'Karar · Red', result: 'RED', tally: { kabul: 0, red: 2, incelemede: 1 } },
    { label: 'Karar · İncelemede', result: 'INCELEMEDE', tally: { kabul: 1, red: 1, incelemede: 1 } },
  ];
  return [
    ...voteFixtures,
    ...decisions.map(({ label, result, tally }) => ({
      ...decision,
      label,
      sqlSummary: "INSERT INTO degerlendirme (komite_id=" + decisionCue.committeeId + ", sonuc='" + result + "')",
      stageCue: { ...decisionCue, result, tally },
    })),
  ];
}
