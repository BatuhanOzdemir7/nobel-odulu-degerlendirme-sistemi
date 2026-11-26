import type { Aday } from './records';

export type PrivacyMode = 'SEFFAF' | 'GIZLI';
export type VoteDecision = 'KABUL' | 'RED' | 'INCELEMEDE';
export type NominationStage = 'ADAYLIK_ALINDI' | 'KOMITE_INCELEMESINDE' | 'KARAR_VERILDI';

export interface PrizeOption {
  odulId: number;
  odulAdi: string;
  kategoriId: number;
  kategoriAdi: string;
}

export interface CandidateSearchResult {
  adayId: number;
  gorunenAd: string;
  calismaAlani: string;
  hesapVar: boolean;
}

export type NewCandidate = Omit<Aday, 'adayId'>;
export type NominationRequest = { odulId: number } & (
  | { mevcutAdayId: number; yeniAday: null }
  | { mevcutAdayId: null; yeniAday: NewCandidate }
);

export interface NominationView {
  adayGostermeId: number;
  adayId: number;
  adayAdi: string;
  odulId: number;
  odulAdi: string;
  kategoriAdi: string | null;
  kurulusAdi: string;
  tarih: string | null;
  saat: string | null;
  asama: NominationStage;
  sonuc: string | null;
}

export interface TemporaryAccount {
  kullaniciAdi: string;
  geciciSifre: string;
}

export interface NominationResponse {
  adayGosterme: NominationView;
  yeniHesap: TemporaryAccount | null;
}

export interface EvaluationResult {
  degerlendirmeId: number;
  komiteId: number;
  komiteAdi: string;
  adayId: number;
  tarih: string;
  sonuc: string;
  olcut: string;
}

export interface CandidateSummary {
  aday: Aday;
  adayliklar: NominationView[];
  degerlendirmeler: EvaluationResult[];
  gizlilikModu: PrivacyMode;
}

export interface ExpertCommittee {
  komiteId: number;
  komiteAdi: string;
  kategoriId: number;
  kategoriAdi: string;
  uyeler: { uzmanId: number; uzmanAdi: string }[];
  bekleyenAdaySayisi: number;
}

export interface DecisionRequest {
  komiteId: number;
  adayId: number;
}

export interface ExpertVoteRequest extends DecisionRequest {
  olcut: string;
  karar: VoteDecision;
}

export interface ExpertVote extends ExpertVoteRequest {
  oyId: number;
  uzmanId: number;
  uzmanAdi: string;
  oyZamani: string;
}

export interface CommitteeCandidate {
  adayId: number;
  adayAdi: string;
  calismaAlani: string;
  votesCast: number;
  votesRequired: number;
  memberCount: number;
  myVote: ExpertVote | null;
  oylar: ExpertVote[];
  finalized: boolean;
  degerlendirme: EvaluationResult | null;
}

export interface VoteResult {
  oy: ExpertVote;
  votesCast: number;
  votesRequired: number;
  memberCount: number;
  kararKesinlesti: boolean;
  degerlendirme: EvaluationResult | null;
}

export interface PrivacySetting { mod: PrivacyMode }
