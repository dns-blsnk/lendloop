// Accepts only events Convex signed with the Convex-to-n8n secret within the last five minutes.
// The check runs on the raw body exactly as received, before anything is parsed.
const crypto = require('crypto');

const TOLERANCE_SECONDS = 300;
const item = $input.first();
const headers = item.json.headers ?? {};
const raw = item.binary?.data
  ? (await this.helpers.getBinaryDataBuffer(0, 'data')).toString('utf8')
  : '';
const timestamp = String(headers['x-lendloop-timestamp'] ?? '');
const given = Buffer.from(String(headers['x-lendloop-signature'] ?? '').toLowerCase(), 'utf8');
const isFresh =
  /^\d+$/.test(timestamp) &&
  Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) <= TOLERANCE_SECONDS;
const expected = Buffer.from(
  crypto
    .createHmac('sha256', $env.LENDLOOP_CONVEX_TO_N8N_SECRET)
    .update(`${timestamp}.${raw}`)
    .digest('hex'),
  'utf8',
);
// Byte lengths, not string lengths: timingSafeEqual throws on buffers of different sizes.
const valid =
  isFresh && given.length === expected.length && crypto.timingSafeEqual(given, expected);

return [{ json: valid ? { valid, event: JSON.parse(raw) } : { valid } }];
