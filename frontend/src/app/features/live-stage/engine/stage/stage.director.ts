import { signal } from '@angular/core';
import type { Vec2 } from '../character-rig';
import type { StageCharacterCommand, StageScene } from '../../stage/stage.contract';
import { accessoriesFor, rigConfig, type LookPhase } from './stage.accessories';
import { FLOOR_Y, FRONT_Y, SEAT_Y, SLOT, seatX } from './stage.layout';
import type { ActorRole, ActorState, Backdrop, Banner, Flight, MemberRef } from './stage.models';
import { SceneQueue, Timeline } from './stage.timeline';

export interface StageHost {
  /** 'actor:<id>' | 'prop:podium' | 'prop:table' | 'edge:right' → viewport merkez noktası. */
  centerOf(ref: string): Vec2 | null;
  readonly reducedMotion: boolean;
}
type Cmd<S extends StageScene> = Extract<StageCharacterCommand, { scene: S }>;

export class NobelStageDirector {
  readonly actors = signal<readonly ActorState[]>([]);
  readonly backdrop = signal<Backdrop>('empty');
  readonly plaque = signal('');
  readonly banner = signal<Banner | null>(null);
  readonly pips = signal({ cast: 0, required: 3 });
  readonly flight = signal<Flight | null>(null);
  readonly envelopeOnPodium = signal(false);
  readonly flash = signal(0);
  readonly confetti = signal(0);
  readonly timeScale = signal(1);
  readonly playing = signal(false);

  private readonly queue = new SceneQueue<StageCharacterCommand>((cmd, fast) => this.run(cmd, fast));
  private current: Timeline | null = null;
  private committeeKey = '';
  private flightRev = 0;

  constructor(private readonly host: StageHost) {}

  play(cmd: StageCharacterCommand): void { this.queue.push(cmd); }
  destroy(): void { this.queue.dispose(); this.current?.abort(); }

  /** Hareket bitince / yeniden boyutlanınca tüm aktörlerin göz hedeflerini yeniden ölçer. */
  refreshGaze(): void {
    this.actors.update((list) =>
      list.map((a) => (a.gazeRef ? { ...a, gazeTarget: this.host.centerOf(a.gazeRef) ?? undefined } : a)),
    );
  }

  private async run(cmd: StageCharacterCommand, fast: boolean): Promise<void> {
    this.playing.set(true);
    this.timeScale.set(this.host.reducedMotion ? 0.15 : fast ? 0.5 : 1);
    const t = new Timeline(this.timeScale);
    this.current = t;
    try {
      switch (cmd.scene) {
        case 'NOMINATION': await this.nomination(cmd, t); break;
        case 'COMMITTEE_VOTE': await this.committeeVote(cmd, t); break;
        case 'DECISION_FINALIZED': await this.decision(cmd, t); break;
        case 'CONSTRAINT_ERROR': await this.constraintError(cmd, t); break;
      }
    } finally {
      if (this.current === t) {
        this.current = null;
        this.playing.set(false);
      }
    }
  }

  /* ───────────── NOMINATION ───────────── */
  private async nomination(c: Cmd<'NOMINATION'>, t: Timeline): Promise<void> {
    this.stageSet('nomination', c.awardLabel);

    // Kurye üniformalı kuruluş temsilcisi, elinde zarf, sol dışarıdan yürür.
    this.spawn('org', 'KURULUS', c.organizationLabel, SLOT.offLeft, { activity: 'pushing', z: 22, props: [{ kind: 'envelope' }] });
    this.dress('org', 'KURULUS', 'delivering');
    this.look('org', 'prop:podium');
    await t.wait(80, false);
    this.refreshGaze();
    await this.moveTo('org', SLOT.organization, 1400, t);
    this.patch('org', { activity: 'rest' });

    // Aday sağdan zıplayarak gelir.
    this.spawn('candidate', 'ADAY', c.candidateName, SLOT.offRight, { z: 21, hopping: !this.host.reducedMotion });
    await t.wait(80, false);
    this.look('candidate', 'actor:org');
    this.look('org', 'actor:candidate');
    await this.moveTo('candidate', SLOT.candidate, 1100, t);
    this.patch('candidate', { hopping: false });
    this.startle('candidate');
    if (c.newAccount) {
      this.dress('candidate', 'ADAY', 'onboarding');
      this.say('candidate', 'Yeni Hesap!');
    }
    await t.wait(900);

    // Zarf kürsüye uçar.
    this.patch('org', { props: [] });
    this.flight.set({
      rev: ++this.flightRev,
      from: { x: SLOT.organization.x, y: FLOOR_Y - 9 },
      to: { x: SLOT.podium.x, y: FLOOR_Y - 13 },
    });
    this.look('org', 'prop:podium');
    this.look('candidate', 'prop:podium');
    await t.wait(1000);
    this.flight.set(null);
    this.envelopeOnPodium.set(true);
    this.dress('org', 'KURULUS', 'base'); // üniforma çıkar
    this.patch('candidate', { emote: 'cheer' });
    this.look('org', 'actor:candidate');
    this.look('candidate', 'actor:org');
    this.banner.set({ text: `${c.organizationLabel} → ${c.candidateName}`, sub: `${c.awardLabel} · ${c.categoryLabel ?? ''}`, tone: 'success' });
    await t.wait(1500);
    this.dress('candidate', 'ADAY', 'base');
    this.patch('candidate', { emote: null, bubble: null });
    await t.wait(500);
  }

  /* ───────────── COMMITTEE_VOTE ───────────── */
  private async committeeVote(c: Cmd<'COMMITTEE_VOTE'>, t: Timeline): Promise<void> {
    const fresh = this.ensureCommittee(`${c.committeeId}:${c.candidateName}`, c.members, c.candidateName);
    const voterId = `expert-${c.expertId}`;
    const voter = this.get(voterId);
    if (!voter) return; // üye listesinde olmayan uzman: sessizce atla

    this.pips.set({ cast: Math.max(0, c.votesCast - 1), required: c.votesRequired });
    for (const v of c.votes) {
      if (v.expertId !== c.expertId) this.patch(`expert-${v.expertId}`, { tableCard: v.vote });
    }
    this.patch(voterId, { tableCard: null });
    this.banner.set(null);
    if (fresh) await t.wait(120, false);

    this.lookAll('actor:candidate', [voterId, 'candidate']);
    await this.moveTo(voterId, { x: Math.max(voter.x, 54), y: FRONT_Y }, 650, t, { scale: 0.98, z: 50 });
    this.look(voterId, 'actor:candidate');

    // Aksesuar + ifade + oy kartı
    this.dress(voterId, 'UZMAN', c.vote === 'RED' ? 'rejected' : 'base');
    this.patch(voterId, {
      activity: 'raise-right',
      emote: c.vote === 'KABUL' ? 'cheer' : c.vote === 'RED' ? 'stern' : 'puzzled',
      props: [{ kind: 'vote-card', variant: c.vote }],
    });
    this.say(voterId, c.vote);
    this.lookAll(`actor:${voterId}`, [voterId, 'candidate']); // diğerleri oy verene bakar
    this.look('candidate', `actor:${voterId}`);
    await t.wait(1500);

    // Kartı masaya bırak, yerine dön, sayaç dolsun.
    this.pips.set({ cast: c.votesCast, required: c.votesRequired });
    this.patch(voterId, { activity: 'rest', emote: null, props: [], bubble: null, tableCard: c.vote });
    this.dress(voterId, 'UZMAN', 'base');
    await this.moveTo(voterId, { x: voter.x, y: SEAT_Y }, 650, t, { scale: 0.86 });
    this.patch(voterId, { z: voter.z });
    this.lookAll('actor:candidate', ['candidate']);
    this.look('candidate', `actor:${voterId}`);
    this.banner.set({ text: `${c.expertLabel}: ${c.vote}`, sub: `${c.candidateName} · ${c.votesCast}/${c.votesRequired} oy`, tone: c.vote === 'RED' ? 'warn' : 'info' });
    await t.wait(500);
  }

  /* ───────────── DECISION_FINALIZED ───────────── */
  private async decision(c: Cmd<'DECISION_FINALIZED'>, t: Timeline): Promise<void> {
    const fresh = this.ensureCommittee(`${c.committeeId}:${c.candidateName}`, c.members, c.candidateName);
    if (fresh) await t.wait(120, false);
    const chair = c.members[0];
    const chairId = chair ? `expert-${chair.expertId}` : '';
    const chairActor = this.get(chairId);
    const { kabul, red, incelemede } = c.tally;
    this.pips.update((p) => ({ cast: kabul + red + incelemede, required: p.required }));
    this.banner.set(null);
    this.dress('candidate', 'ADAY', 'base');
    this.patch('candidate', { activity: 'rest', emote: null, props: [] });
    this.lookAll('actor:candidate', ['candidate']);
    if (chairActor) {
      await this.moveTo(chairId, { x: Math.max(chairActor.x, 54), y: FRONT_Y }, 600, t, { scale: 0.98, z: 50 });
      this.patch(chairId, { activity: 'strike', props: [{ kind: 'gavel' }] });
      await t.wait(2800); // 3 vuruş × 900 ms
      this.patch(chairId, { activity: 'rest', props: [] });
    }

    const emote = c.result === 'KABUL' ? 'cheer' : c.result === 'RED' ? 'stern' : 'puzzled';
    for (const m of c.members) {
      this.patch(`expert-${m.expertId}`, { emote, activity: c.result === 'KABUL' ? 'cheer' : 'rest' });
    }
    if (c.result === 'KABUL') {
      this.patch('candidate', { emote: 'cheer', activity: 'cheer', props: [{ kind: 'medal' }] });
      if (!this.host.reducedMotion) this.confetti.update((n) => n + 1);
    } else if (c.result === 'RED') {
      this.dress('candidate', 'ADAY', 'rejected');
      this.patch('candidate', { emote: 'sad', props: [{ kind: 'cloud' }] });
    } else {
      this.patch('candidate', { emote: 'puzzled' });
    }
    const label = c.result === 'KABUL' ? 'KABUL EDİLDİ' : c.result === 'RED' ? 'REDDEDİLDİ' : 'YENİDEN İNCELEME';
    this.banner.set({
      text: `${c.candidateName}: ${label}`,
      sub: `${c.tally.kabul} KABUL · ${c.tally.red} RED · ${c.tally.incelemede} İNCELEMEDE`,
      tone: c.result === 'KABUL' ? 'success' : c.result === 'RED' ? 'error' : 'warn',
    });
    await t.wait(3000);
    if (chairActor) {
      await this.moveTo(chairId, { x: chairActor.x, y: SEAT_Y }, 600, t, { scale: 0.86 });
      this.patch(chairId, { z: chairActor.z });
    }
  }

  /* ───────────── CONSTRAINT_ERROR ───────────── */
  private async constraintError(c: Cmd<'CONSTRAINT_ERROR'>, t: Timeline): Promise<void> {
    const members: readonly MemberRef[] = c.members?.length
      ? c.members
      : Array.from({ length: Math.max(1, c.memberCount ?? 3) }, (_, i) => ({ expertId: i + 1, label: `Uzman ${i + 1}` }));
    this.committeeKey = '';
    this.ensureCommittee(`err:${c.eventId}`, members, null);
    await t.wait(120, false);

    const target = members.find((m) => m.label === c.expertLabel) ?? members[members.length - 1];
    const id = `expert-${target.expertId}`;
    const seat = this.get(id);
    if (!seat) return;

    // Uzman masadan kalkıp çıkmaya çalışır.
    this.patch(id, { emote: 'puzzled' });
    this.look(id, 'edge:right');
    const exitX = Math.min(seat.x + 14, 69);
    this.lookAll(`actor:${id}`, [id]);
    await this.moveTo(id, { x: exitX, y: FRONT_Y }, 800, t, { scale: 0.98, z: 50 });

    // Trigger bekçisi kalkanla girer ve iter.
    this.spawn('guard', 'GUARD', 'PostgreSQL Trigger', SLOT.offRight, { activity: 'pushing', z: 60, props: [{ kind: 'shield' }] });
    await t.wait(80, false);
    this.look('guard', `actor:${id}`);
    await this.moveTo('guard', { x: Math.min(exitX + 19, 86), y: FRONT_Y }, 900, t);
    this.flash.update((n) => n + 1);
    this.startle(id);
    this.banner.set({ text: c.message, sub: c.committeeLabel ? `${c.committeeLabel} · ${members.length} üye` : undefined, tone: 'error' });
    this.patch(id, { emote: 'sad' });
    this.look(id, 'actor:guard');
    await this.moveTo(id, { x: seat.x, y: SEAT_Y }, 700, t, { scale: 0.86 }); // geri oturur
    this.patch(id, { z: seat.z });
    await t.wait(1800);
    this.patch(id, { emote: null });
    this.look(id, null);
    await this.moveTo('guard', SLOT.offRight, 900, t);
    this.actors.update((list) => list.filter((a) => a.id !== 'guard'));
  }

  /* ───────────── yardımcılar ───────────── */
  private stageSet(backdrop: Backdrop, plaque = ''): void {
    this.committeeKey = '';
    this.actors.set([]);
    this.backdrop.set(backdrop);
    this.plaque.set(plaque);
    this.banner.set(null);
    this.flight.set(null);
    this.envelopeOnPodium.set(false);
    this.pips.set({ cast: 0, required: 3 });
  }

  /** Aynı komite+aday için sahne zaten kuruluysa false döner (ardışık oylar aktörleri yeniden yaratmaz). */
  private ensureCommittee(key: string, members: readonly MemberRef[], candidate: string | null): boolean {
    const rosterKey = `${key}:${members.map((m) => m.expertId).join(',')}`;
    if (this.committeeKey === rosterKey && this.backdrop() === 'committee') return false;
    this.committeeKey = rosterKey;
    this.actors.set([]);
    this.backdrop.set('committee');
    this.banner.set(null);
    this.envelopeOnPodium.set(false);
    this.pips.set({ cast: 0, required: 3 });
    members.forEach((m, i) =>
      this.spawn(`expert-${m.expertId}`, 'UZMAN', m.label, { x: seatX(i, members.length), y: SEAT_Y }, { scale: 0.86, z: 10 + i }),
    );
    if (candidate) {
      this.spawn('candidate', 'ADAY', candidate, SLOT.committeeCandidate, { scale: 0.92, z: 40 });
    }
    return true;
  }

  private get(id: string): ActorState | undefined { return this.actors().find((a) => a.id === id); }

  private patch(id: string, change: Partial<ActorState>): void {
    this.actors.update((list) => list.map((a) => (a.id === id ? { ...a, ...change } : a)));
  }

  private spawn(id: string, role: ActorRole, label: string, at: { x: number; y: number }, extra: Partial<ActorState> = {}): void {
    const actor: ActorState = {
      id, role, label, x: at.x, y: at.y, scale: 1, z: 20, moveMs: 0, hopping: false,
      config: rigConfig(accessoriesFor(role)), activity: 'rest', emote: null,
      gazeRef: null, gazeTarget: undefined, startleRevision: 0, talkRevision: 0,
      bubble: null, props: [], tableCard: null, ...extra,
    };
    this.actors.update((list) => [...list.filter((a) => a.id !== id), actor]);
  }

  /** Aksesuar değişimi: rig `config.accessories` girdisini yeniden çözer. */
  private dress(id: string, role: ActorRole, phase: LookPhase): void {
    this.patch(id, { config: rigConfig(accessoriesFor(role, phase)) });
  }

  private async moveTo(id: string, to: { x: number; y: number }, ms: number, t: Timeline, extra: Partial<ActorState> = {}): Promise<void> {
    this.patch(id, { x: to.x, y: to.y, moveMs: t.duration(ms), ...extra });
    await t.wait(ms + 60);
    this.refreshGaze();
  }

  private look(id: string, ref: string | null): void {
    this.patch(id, { gazeRef: ref, gazeTarget: ref ? (this.host.centerOf(ref) ?? undefined) : null });
  }

  private lookAll(ref: string, except: readonly string[] = []): void {
    for (const a of this.actors()) if (!except.includes(a.id)) this.look(a.id, ref);
  }

  private say(id: string, text: string): void {
    this.patch(id, { bubble: text, talkRevision: (this.get(id)?.talkRevision ?? 0) + 1 });
  }

  private startle(id: string): void {
    this.patch(id, { startleRevision: (this.get(id)?.startleRevision ?? 0) + 1 });
  }
}
