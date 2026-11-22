// Where a LendLoop workflow failed, never what it was processing: no payload leaves n8n, and
// email addresses that may appear in error texts (e.g. SMTP rejections) are masked.
const MAX_NAME = 120;
const MAX_MESSAGE = 300;
const EMAIL = /[^\s<>"']+@[^\s<>"']+/g;
const { execution, workflow } = $input.first().json;
const clip = (text, max) =>
  String(text ?? '')
    .replace(EMAIL, '[email]')
    .slice(0, max);
const node = clip(execution?.lastNodeExecuted ?? execution?.error?.node?.name, MAX_NAME);

await postToConvex(this.helpers, '/n8n/workflow-errors', {
  executionId: clip(execution?.id ?? `manual-${Date.now()}`, MAX_NAME),
  workflow: clip(workflow?.name ?? 'unknown', MAX_NAME),
  ...(node === '' ? {} : { node }),
  message: clip(execution?.error?.message ?? 'Unknown error', MAX_MESSAGE),
});
return [];
