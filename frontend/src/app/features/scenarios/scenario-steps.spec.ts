import { describe, expect, it } from 'vitest';
import { createScenarioSteps, SCENARIOS } from './scenario-steps';

describe('scenario playback', () => {
  it.each(SCENARIOS)('keeps the same candidate through each event in $category', scenario => {
    const ballots = [0.1, 0.9, 0.3];
    const steps = createScenarioSteps(scenario, 1, () => ballots.shift()!);

    expect(steps.map(step => step.cue?.scene ?? 'CATEGORY')).toEqual([
      'NOMINATION', 'CATEGORY', 'COMMITTEE_VOTE', 'COMMITTEE_VOTE', 'COMMITTEE_VOTE', 'DECISION_FINALIZED',
    ]);
    for (const step of steps.filter(item => item.cue)) {
      expect(step.cue).toMatchObject({ candidateName: scenario.candidate });
    }
    const [nomination, category, firstVote, secondVote, thirdVote, decision] = steps;
    expect(nomination.highlight.edges).toContain('KURULUS-aday_gosterir');
    expect(category.categoryPath).toEqual([scenario.award, scenario.category, `${scenario.category} Değerlendirme Komitesi`]);
    expect(category.highlight.edges).toEqual([
      'ODUL-kategorisine_aittir', 'kategorisine_aittir-KATEGORI',
      'KATEGORI-olusturulur', 'olusturulur-DEGERLENDIRME_KOMITESI',
    ]);
    expect([firstVote.cue, secondVote.cue, thirdVote.cue]).toEqual([
      expect.objectContaining({ votesCast: 1, vote: 'KABUL' }),
      expect.objectContaining({ votesCast: 2, vote: 'RED' }),
      expect.objectContaining({ votesCast: 3, vote: 'KABUL' }),
    ]);
    expect(thirdVote.highlight.edges).toContain('UZMAN-uyesidir');
    expect(decision.highlight.nodes).toContain('ODUL');
    expect(decision.cue).toMatchObject({ result: 'KABUL', tally: { kabul: 2, red: 1 } });
  });

  it('allows the same scenario to end without an award on replay', () => {
    const original = createScenarioSteps(SCENARIOS[0], 1, () => 0.1).at(-1)!;
    const replay = createScenarioSteps(SCENARIOS[0], 2, () => 0.9).at(-1)!;
    expect(replay.cue).toMatchObject({ result: 'RED', tally: { kabul: 0, red: 3 } });
    expect(replay.highlight.nodes).not.toContain('ODUL');
    expect(replay.id).not.toBe(original.id);
  });
});
