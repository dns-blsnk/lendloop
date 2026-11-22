import { z } from 'zod';

const MIN_SECRET_LENGTH = 32;

const integrationEnvSchema = z.object({
  // A trailing slash would turn into "//" when the webhook path is appended.
  N8N_WEBHOOK_BASE_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
  CONVEX_TO_N8N_SECRET: z.string().min(MIN_SECRET_LENGTH),
  N8N_TO_CONVEX_SECRET: z.string().min(MIN_SECRET_LENGTH),
});

export type IntegrationEnv = z.infer<typeof integrationEnvSchema>;

/**
 * The n8n integration settings, validated when used. Returns null while they are not set, so a
 * deployment without n8n keeps working; outgoing events wait, without using their attempts.
 */
export function integrationEnv(): IntegrationEnv | null {
  const parsed = integrationEnvSchema.safeParse({
    N8N_WEBHOOK_BASE_URL: process.env.N8N_WEBHOOK_BASE_URL,
    CONVEX_TO_N8N_SECRET: process.env.CONVEX_TO_N8N_SECRET,
    N8N_TO_CONVEX_SECRET: process.env.N8N_TO_CONVEX_SECRET,
  });
  return parsed.success ? parsed.data : null;
}
