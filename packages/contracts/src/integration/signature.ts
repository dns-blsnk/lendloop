/**
 * Request signing shared by Convex and n8n (n8n re-implements the same steps in its Code node).
 * The signature is HMAC-SHA256 over `${timestamp}.${body}` with the secret of that direction, sent
 * as lowercase hex. A timestamp outside the tolerance is rejected, so a captured request cannot be
 * replayed later.
 */
export const SIGNATURE_HEADER = 'x-lendloop-signature';
export const TIMESTAMP_HEADER = 'x-lendloop-timestamp';
export const EVENT_ID_HEADER = 'x-lendloop-event-id';

/** How far a request's timestamp may be from the receiver's clock. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

const MS_PER_SECOND = 1000;
const HEX_RADIX = 16;
const HEX_BYTE_WIDTH = 2;

export function unixSeconds(now: number = Date.now()): number {
  return Math.floor(now / MS_PER_SECOND);
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

export async function sign(secret: string, timestamp: number, body: string): Promise<string> {
  const mac = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret),
    new TextEncoder().encode(`${String(timestamp)}.${body}`),
  );
  return Array.from(new Uint8Array(mac), (byte) =>
    byte.toString(HEX_RADIX).padStart(HEX_BYTE_WIDTH, '0'),
  ).join('');
}

/** Compares every character whatever the input, so timing does not reveal a matching prefix. */
export function constantTimeEqual(a: string, b: string): boolean {
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export type SignatureProblem = 'missing' | 'stale' | 'mismatch';

/** Why a signed request must be rejected, or null when it is authentic and fresh. */
export async function signatureProblem(
  secret: string,
  request: { timestamp: string | null; signature: string | null; body: string },
  now: number = Date.now(),
): Promise<SignatureProblem | null> {
  const { timestamp, signature, body } = request;
  if (timestamp === null || signature === null || !/^\d+$/.test(timestamp)) {
    return 'missing';
  }
  const sentAt = Number(timestamp);
  if (Math.abs(unixSeconds(now) - sentAt) > SIGNATURE_TOLERANCE_SECONDS) {
    return 'stale';
  }
  const expected = await sign(secret, sentAt, body);
  return constantTimeEqual(expected, signature.toLowerCase()) ? null : 'mismatch';
}
