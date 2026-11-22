// Calls a signed Convex endpoint: HMAC-SHA256 over "timestamp.body" with the n8n-to-Convex
// secret, exactly as packages/contracts/src/integration/signature.ts verifies it. Every attempt is
// signed afresh (a retry must not resend a stale timestamp), and only failures that can heal are
// retried: network errors, 5xx, 408 and 429. Anything else fails the run at once, which hands it to
// the error workflow.
const crypto = require('crypto');

const CONVEX_MAX_TRIES = 3;
const CONVEX_RETRY_WAIT_MS = 2000;
const CONVEX_TIMEOUT_MS = 10000;
const RETRYABLE_STATUSES = [408, 429];

function signForConvex(body) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto
    .createHmac('sha256', $env.LENDLOOP_N8N_TO_CONVEX_SECRET)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return { timestamp, signature };
}

async function postToConvex(helpers, path, payload) {
  const body = JSON.stringify(payload);
  let lastProblem = '';
  for (let attempt = 1; attempt <= CONVEX_MAX_TRIES; attempt += 1) {
    const { timestamp, signature } = signForConvex(body);
    let status = 0;
    let text = '';
    try {
      const response = await helpers.httpRequest({
        method: 'POST',
        url: `${$env.LENDLOOP_CONVEX_SITE_URL}${path}`,
        headers: {
          'content-type': 'application/json',
          'x-lendloop-timestamp': timestamp,
          'x-lendloop-signature': signature,
        },
        body,
        json: false,
        timeout: CONVEX_TIMEOUT_MS,
        returnFullResponse: true,
        ignoreHttpStatusErrors: true,
      });
      status = response.statusCode;
      text = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
    } catch (error) {
      lastProblem = `network error (${error.name})`;
    }
    if (status >= 200 && status < 300) {
      return text === '' ? null : JSON.parse(text);
    }
    if (status !== 0) {
      lastProblem = `HTTP ${status}`;
      const canHeal = status >= 500 || RETRYABLE_STATUSES.includes(status);
      if (!canHeal) {
        break;
      }
    }
    if (attempt < CONVEX_MAX_TRIES) {
      await new Promise((resolve) => setTimeout(resolve, CONVEX_RETRY_WAIT_MS * attempt));
    }
  }
  throw new Error(`Convex ${path} failed: ${lastProblem}`);
}
