import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { N8N_ENDPOINTS } from './http';
import { SIGNATURE_HEADER, SIGNATURE_TOLERANCE_SECONDS, TIMESTAMP_HEADER } from './signature';

/**
 * n8n Code nodes cannot import this package, so they repeat a few of its constants. This test
 * fails when the exported workflows and the contract drift apart.
 */
const workflowsDir = join(import.meta.dirname, '../../../../n8n/workflows');
const workflows = readdirSync(workflowsDir)
  .map((file) => readFileSync(join(workflowsDir, file), 'utf8'))
  .join('\n');

describe('n8n workflows follow the integration contract', () => {
  it('call every Convex endpoint by its contract path', () => {
    for (const path of Object.values(N8N_ENDPOINTS)) {
      expect(workflows).toContain(path);
    }
  });

  it('use the contract header names and replay window', () => {
    expect(workflows).toContain(SIGNATURE_HEADER);
    expect(workflows).toContain(TIMESTAMP_HEADER);
    expect(workflows).toContain(`TOLERANCE_SECONDS = ${String(SIGNATURE_TOLERANCE_SECONDS)}`);
  });

  it('serve the webhook path Convex posts to', () => {
    expect(workflows).toContain('"path": "lendloop-loan-event"');
  });
});
