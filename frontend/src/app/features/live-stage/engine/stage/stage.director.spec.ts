import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StageCharacterCommand } from '../../stage/stage.contract';
import { NobelStageDirector } from './stage.director';

const members = [
  { expertId: 1, label: 'İlker Kaya' }, { expertId: 2, label: 'Elif Demir' }, { expertId: 3, label: 'Deniz Akın' },
];
const committee = { committeeId: 1, committeeLabel: 'Fizik Komitesi', members };
const candidateName = 'Selin Arslan';
const nomination: StageCharacterCommand = {
  scene: 'NOMINATION', eventId: 'evt-1', severity: 'success',
  organizationLabel: 'CERN', candidateName, awardLabel: 'Fizik Ödülü', categoryLabel: 'Fizik', newAccount: true,
};
const firstVote: StageCharacterCommand = {
  scene: 'COMMITTEE_VOTE', eventId: 'evt-2', severity: 'success',
  ...committee, candidateName, expertId: 1, expertLabel: members[0].label, vote: 'KABUL',
  votesCast: 1, votesRequired: 3, votes: [{ expertId: 1, vote: 'KABUL' }],
};
const secondVote: StageCharacterCommand = {
  ...firstVote, eventId: 'evt-3', expertId: 2, expertLabel: members[1].label,
  vote: 'RED', votesCast: 2, votes: [...firstVote.votes, { expertId: 2, vote: 'RED' }],
};
const decision: StageCharacterCommand = {
  scene: 'DECISION_FINALIZED', eventId: 'evt-4', severity: 'success',
  ...committee, candidateName, result: 'KABUL', tally: { kabul: 2, red: 1, incelemede: 0 },
};
const constraint: StageCharacterCommand = {
  scene: 'CONSTRAINT_ERROR', eventId: 'evt-5', severity: 'error',
  ...committee, expertLabel: members[1].label, message: 'PostgreSQL Trigger: En az 3 uzman gerekli!',
};

describe('NobelStageDirector', () => {
  let director: NobelStageDirector;
  const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms);
  const actor = (id: string) => director.actors().find((item) => item.id === id);
  const host = { reducedMotion: false, centerOf: vi.fn(() => ({ x: 12, y: 14 })) };

  beforeEach(() => {
    vi.useFakeTimers();
    host.reducedMotion = false;
    host.centerOf.mockClear();
    director = new NobelStageDirector(host);
  });

  afterEach(async () => {
    director.destroy();
    await Promise.resolve();
    vi.useRealTimers();
  });

  it('walks the courier in, onboards the candidate and lands the envelope', async () => {
    director.play(nomination);
    expect(actor('org')).toMatchObject({ activity: 'pushing', props: [{ kind: 'envelope' }] });
    expect(actor('org')?.config.accessories).toEqual(expect.arrayContaining(['hard-hat', 'blue-collar']));
    await tick(1650);
    expect(actor('candidate')?.hopping).toBe(true);
    await tick(1200);
    expect(actor('candidate')).toMatchObject({ bubble: 'Yeni Hesap!', startleRevision: 1, talkRevision: 1 });
    expect(actor('candidate')?.config.accessories).toContain('hard-hat');
    await tick(900);
    expect(director.flight()).toMatchObject({ from: { x: 24 }, to: { x: 76 } });
    await tick(1050);
    expect(director.flight()).toBeNull();
    expect(director.envelopeOnPodium()).toBe(true);
    expect(actor('org')?.config.accessories).toEqual(['beard', 'mustache']);
    expect(actor('candidate')?.emote).toBe('cheer');
  });

  it('reuses the committee, shows each card and adds the vote to the table', async () => {
    director.play(firstVote);
    expect(director.pips().cast).toBe(0);
    expect(actor('expert-1')?.tableCard).toBeNull();
    const secondActor = actor('expert-2')?.config;
    await tick(900);
    expect(actor('expert-1')).toMatchObject({ activity: 'raise-right', props: [{ kind: 'vote-card', variant: 'KABUL' }] });
    expect(actor('candidate')?.gazeRef).toBe('actor:expert-1');
    await tick(2800);
    expect(director.pips().cast).toBe(1);
    expect(actor('expert-1')).toMatchObject({ tableCard: 'KABUL', activity: 'rest' });
    expect(actor('expert-2')?.config).toBe(secondActor);

    director.play(secondVote);
    expect(director.pips().cast).toBe(1);
    expect(actor('expert-1')?.tableCard).toBe('KABUL');
    await tick(800);
    expect(actor('expert-2')).toMatchObject({ activity: 'raise-right', emote: 'stern', props: [{ kind: 'vote-card', variant: 'RED' }] });
    expect(actor('expert-2')?.config.accessories).toContain('eyebags');
    await tick(2600);
    expect(director.pips().cast).toBe(2);
    expect(actor('expert-2')).toMatchObject({ tableCard: 'RED', activity: 'rest', props: [] });
    expect(actor('expert-2')?.config.accessories).not.toContain('eyebags');
    expect(director.actors()).toHaveLength(4);
  });

  it('rehydrates prior votes when earlier events were missed and skips an unknown voter', async () => {
    director.play(secondVote);
    expect(actor('expert-1')?.tableCard).toBe('KABUL');
    expect(actor('expert-2')?.tableCard).toBeNull();
    await tick(4000);
    director.play({ ...secondVote, expertId: 99 });
    await tick(4000);
    expect(director.pips().cast).toBe(2);
    expect(director.actors()).toHaveLength(4);
  });

  it('strikes the gavel, then shows the accepted, rejected and review results', async () => {
    director.play(decision);
    await tick(800);
    expect(actor('expert-1')).toMatchObject({ activity: 'strike', props: [{ kind: 'gavel' }] });
    await tick(2800);
    expect(actor('candidate')).toMatchObject({ activity: 'cheer', props: [{ kind: 'medal' }] });
    expect(director.confetti()).toBe(1);
    await tick(4000);

    director.play({ ...decision, eventId: 'evt-6', result: 'RED' });
    await tick(3500);
    expect(actor('candidate')).toMatchObject({ emote: 'sad', props: [{ kind: 'cloud' }] });
    expect(actor('candidate')?.config.accessories).toContain('eyebags');
    await tick(4000);

    director.play({ ...decision, eventId: 'evt-7', result: 'INCELEMEDE' });
    await tick(3500);
    expect(actor('candidate')).toMatchObject({ emote: 'puzzled', props: [] });
    expect(actor('candidate')?.config.accessories).not.toContain('eyebags');
  });

  it('flashes on constraint, returns the expert to the chair and removes the guard', async () => {
    director.play(constraint);
    await tick(1100);
    expect(actor('guard')).toMatchObject({ activity: 'pushing', props: [{ kind: 'shield' }] });
    expect(actor('guard')?.config.accessories).toEqual(expect.arrayContaining(['hard-hat', 'blue-collar']));
    await tick(1000);
    expect(director.flash()).toBe(1);
    expect(director.banner()).toMatchObject({ text: constraint.message, tone: 'error' });
    expect(actor('expert-2')).toMatchObject({ emote: 'sad', startleRevision: 1 });
    await tick(4100);
    expect(actor('guard')).toBeUndefined();
    expect(actor('expert-2')).toMatchObject({ emote: null, activity: 'rest', y: 66 });
  });

  it('scales reduced-motion scenes and omits hopping and confetti', async () => {
    host.reducedMotion = true;
    director.play(nomination);
    await tick(400);
    expect(actor('candidate')?.hopping).toBe(false);
    expect(director.timeScale()).toBe(.15);
    await tick(800);
    director.play(decision);
    await tick(700);
    expect(actor('candidate')?.props).toEqual([{ kind: 'medal' }]);
    expect(director.confetti()).toBe(0);
  });
});
