import {
  isAppErrorData,
  MAX_N8N_REQUEST_BYTES,
  SIGNATURE_HEADER,
  signatureProblem,
  TIMESTAMP_HEADER,
} from '@lendloop/contracts';
import { ConvexError } from 'convex/values';

import { httpAction } from '../_generated/server';
import { integrationEnv } from '../lib/env';

import type { z } from 'zod';

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_PAYLOAD_TOO_LARGE = 413;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

async function parseJson<Schema extends z.ZodType>(
  body: string,
  schema: Schema,
): Promise<z.output<Schema> | null> {
  try {
    const parsed = await schema.safeParseAsync(JSON.parse(body));
    return parsed.success ? parsed.data : null;
  } catch {
    // Not JSON at all: same answer as JSON of the wrong shape.
    return null;
  }
}

type HttpCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

/** Reads at most MAX_N8N_REQUEST_BYTES and stops there, whatever Content-Length claims. */
async function readLimited(request: Request): Promise<string | null> {
  const reader = request.body?.getReader();
  if (reader === undefined) {
    return '';
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    size += value.byteLength;
    if (size > MAX_N8N_REQUEST_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

/** The raw body if it is small enough and signed with the n8n-to-Convex secret, else a response. */
async function readSignedBody(request: Request, secret: string): Promise<string | Response> {
  const raw = await readLimited(request);
  if (raw === null) {
    return json(HTTP_PAYLOAD_TOO_LARGE, { error: 'too_large' });
  }
  const problem = await signatureProblem(secret, {
    timestamp: request.headers.get(TIMESTAMP_HEADER),
    signature: request.headers.get(SIGNATURE_HEADER),
    body: raw,
  });
  return problem === null ? raw : json(HTTP_UNAUTHORIZED, { error: 'unauthorized' });
}

/**
 * Wraps an endpoint n8n calls: checks the body size and the HMAC signature over the raw body
 * (n8n-to-Convex secret, five-minute window) before anything is parsed, then validates the JSON
 * against the contract. Failures say only what kind of problem it was, never why in detail.
 */
export function signedEndpoint<Schema extends z.ZodType>(
  schema: Schema,
  handle: (ctx: HttpCtx, body: z.output<Schema>) => Promise<unknown>,
) {
  return httpAction(async (ctx, request) => {
    // Without a secret nothing can be verified; answer like any bad signature so callers cannot
    // tell whether the integration is set up.
    const env = integrationEnv();
    if (env === null) {
      return json(HTTP_UNAUTHORIZED, { error: 'unauthorized' });
    }
    const raw = await readSignedBody(request, env.N8N_TO_CONVEX_SECRET);
    if (raw instanceof Response) {
      return raw;
    }
    const body = await parseJson(raw, schema);
    if (body === null) {
      return json(HTTP_BAD_REQUEST, { error: 'invalid_body' });
    }
    try {
      return json(HTTP_OK, (await handle(ctx, body)) ?? { ok: true });
    } catch (error) {
      if (error instanceof ConvexError && isAppErrorData(error.data)) {
        return json(HTTP_BAD_REQUEST, { error: error.data.code });
      }
      throw error;
    }
  });
}
