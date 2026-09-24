export interface RawAmendment {
  amendment_id: string;
  name: string;
  enabled: boolean;
  supported?: boolean;
  deprecated?: boolean;
  majority?: number | null;
  count: number;
  threshold: number;
  validations: number;
  introduced?: string;
  xls?: string;
  xls_url?: string;
  enabled_on?: string;
  enabled_in_ledger?: number;
  isJustActivated?: boolean;
}

export interface ValidatorEntry {
  master_key?: string;
  domain?: string;
  domain_legacy?: string;
  meta?: {
    verified?: boolean;
    verification_message?: string;
  };
}

export interface DetailedAmendment extends RawAmendment {
  voters?: ValidatorEntry[];
  vetoers?: ValidatorEntry[];
}

export type VoteStatus = 'YEA' | 'NAY' | 'UNVOTED';

export interface EnrichedValidator {
  key: string;
  domain: string;
  status: VoteStatus;
  faviconUrl: string;
  isUnl?: boolean;
  version?: string;
}

export interface CommunityVoteStats {
  total: number;
  yea: number;
  nay: number;
  pct: number;
  validators: EnrichedValidator[];
}
