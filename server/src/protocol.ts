export const MAX_PUSH_BATCH = 100;
export const PULL_PAGE_SIZE = 500;
export const ACCOUNT_HEADER = 'X-Account-Id';

export type SightingPayload = {
  id: string;
  noradId: number;
  observedAt: number;
  verified: boolean;
  angleError: number | null;
  note: string | null;
  updatedAt: number;
};

export type NoteUpdatePayload = {
  id: string;
  note: string | null;
  updatedAt: number;
};

export type DeletePayload = {
  id: string;
  updatedAt: number;
};

export type PushChange =
  | { id: number; entity: 'sighting'; operation: 'insert'; payload: SightingPayload }
  | { id: number; entity: 'sighting'; operation: 'update'; payload: NoteUpdatePayload }
  | { id: number; entity: 'sighting'; operation: 'delete'; payload: DeletePayload };

export type PushRequest = { changes: PushChange[] };
export type PushResponse = { accepted: number[] };

export type ServerSighting = SightingPayload & { version: number; deletedAt: number | null };
export type PullResponse = { changes: ServerSighting[]; cursor: number; hasMore: boolean };
