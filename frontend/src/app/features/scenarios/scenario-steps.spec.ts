import { describe, expect, it } from 'vitest';
import { createScenarioSteps, SCENARIOS } from './scenario-steps';

describe('scenario playback', () => {
  it.each(SCENARIOS)('keeps the same candidate through each event in $category', scenario => {
    const ballots = [0.1, 0.9, 0.3];
    const steps = createScenarioSteps(scenario, 1, () => ballots.shift()!);

    expect(steps.map(step => step.command.scene)).toEqual([
      'NOMINATION', 'COMMITTEE_VOTE', 'COMMITTEE_VOTE', 'COMMITTEE_VOTE', 'DECISION_FINALIZED',
    ]);
    expect(steps.map(step => step.command)).toEqual(steps.map(() => expect.objectContaining({
      candidateName: scenario.candidate,
    })));
    expect(steps[0].highlight.edges).toContain('KURULUS-aday_gosterir');
    expect(steps.slice(1, 4).map(step => step.command)).toEqual([
      expect.objectContaining({ votesCast: 1, vote: 'KABUL' }),
      expect.objectContaining({ votesCast: 2, vote: 'RED' }),
      expect.objectContaining({ votesCast: 3, vote: 'KABUL' }),
    ]);
    expect(steps[3].highlight.edges).toContain('UZMAN-uyesidir');
    expect(steps[4].highlight.nodes).toContain('ODUL');
    expect(steps[4].command).toMatchObject({ result: 'KABUL', tally: { kabul: 2, red: 1 } });
  });

  it('allows the same scenario to end without an award on replay', () => {
    const original = createScenarioSteps(SCENARIOS[0], 1, () => 0.1);
    const replay = createScenarioSteps(SCENARIOS[0], 2, () => 0.9);
    expect(replay[4].command).toMatchObject({ result: 'RED', tally: { kabul: 0, red: 3 } });
    expect(replay[4].highlight.nodes).not.toContain('ODUL');
    expect(replay[4].command.eventId).not.toBe(original[4].command.eventId);
  });
});
