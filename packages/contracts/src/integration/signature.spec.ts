import { describe, expect, it } from 'vitest';

import {
  constantTimeEqual,
  sign,
  SIGNATURE_TOLERANCE_SECONDS,
  signatureProblem,
  unixSeconds,
} from './signature';

const SECRET = 'test-secret';
const NOW = Date.UTC(2026, 10, 22, 12, 0, 0);
const BODY = '{"hello":"world"}';

describe('sign', () => {
  it('matches HMAC-SHA256 over "timestamp.body" as computed by openssl', async () => {
    // printf '1700000000.{"a":1}' | openssl dgst -sha256 -hmac test-secret
    expect(await sign(SECRET, 1_700_000_000, '{"a":1}')).toBe(
      '8cb2c3355fca388e9ac2caec004f4d5d7045d74937ab5faad61dc11682247a9f',
    );
  });
});

describe('signatureProblem', () => {
  it('accepts a fresh, correct signature', async () => {
    const timestamp = unixSeconds(NOW);
    const signature = await sign(SECRET, timestamp, BODY);
    expect(
      await signatureProblem(SECRET, { timestamp: String(timestamp), signature, body: BODY }, NOW),
    ).toBeNull();
  });

  it('rejects a changed body or another secret', async () => {
    const timestamp = unixSeconds(NOW);
    const signature = await sign(SECRET, timestamp, BODY);
    const request = { timestamp: String(timestamp), signature };
    expect(await signatureProblem(SECRET, { ...request, body: '{}' }, NOW)).toBe('mismatch');
    expect(await signatureProblem('other', { ...request, body: BODY }, NOW)).toBe('mismatch');
  });

  it('rejects requests outside the time window, so they cannot be replayed', async () => {
    const old = unixSeconds(NOW) - SIGNATURE_TOLERANCE_SECONDS - 1;
    const signature = await sign(SECRET, old, BODY);
    expect(
      await signatureProblem(SECRET, { timestamp: String(old), signature, body: BODY }, NOW),
    ).toBe('stale');
  });

  it('rejects missing or malformed headers', async () => {
    expect(
      await signatureProblem(SECRET, { timestamp: null, signature: 'x', body: BODY }, NOW),
    ).toBe('missing');
    expect(
      await signatureProblem(SECRET, { timestamp: '12a', signature: 'x', body: BODY }, NOW),
    ).toBe('missing');
  });
});

describe('constantTimeEqual', () => {
  it('compares whole strings, including different lengths', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
  });
});
