import {
  ACCOUNT_HEADER,
  type PullResponse,
  type PushChange,
  type PushResponse,
} from '../../server/src/protocol';

export type SyncTransport = {
  push(accountId: string, changes: PushChange[]): Promise<PushResponse>;
  pull(accountId: string, since: number): Promise<PullResponse>;
};

export class SyncHttpError extends Error {
  constructor(readonly status: number) {
    super(`Sync server returned HTTP ${status}`);
  }
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

const TIMEOUT_MS = 15_000;

export function httpTransport(baseUrl: string, fetchImpl: Fetch = fetch): SyncTransport {
  const request = async <T>(
    path: string,
    accountId: string,
    init: RequestInit = {},
  ): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', [ACCOUNT_HEADER]: accountId },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new SyncHttpError(response.status);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    push: (accountId, changes) =>
      request<PushResponse>('/sync/push', accountId, {
        method: 'POST',
        body: JSON.stringify({ changes }),
      }),
    pull: (accountId, since) => request<PullResponse>(`/sync/pull?since=${since}`, accountId),
  };
}
