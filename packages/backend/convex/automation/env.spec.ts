import { afterEach, describe, expect, it, vi } from 'vitest';

import { integrationEnv } from '../lib/env';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('integrationEnv', () => {
  it('drops trailing slashes from the webhook base URL', () => {
    vi.stubEnv('N8N_WEBHOOK_BASE_URL', 'http://n8n:5678/webhook//');
    vi.stubEnv('CONVEX_TO_N8N_SECRET', 'a'.repeat(32));
    vi.stubEnv('N8N_TO_CONVEX_SECRET', 'b'.repeat(32));
    expect(integrationEnv()?.N8N_WEBHOOK_BASE_URL).toBe('http://n8n:5678/webhook');
  });

  it('is null while a secret is missing or too short', () => {
    vi.stubEnv('N8N_WEBHOOK_BASE_URL', 'http://n8n:5678/webhook');
    vi.stubEnv('CONVEX_TO_N8N_SECRET', 'short');
    vi.stubEnv('N8N_TO_CONVEX_SECRET', 'b'.repeat(32));
    expect(integrationEnv()).toBeNull();
  });
});
