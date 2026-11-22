import { z } from 'zod';

/** Length in characters as people count them (code points), not UTF-16 units. */
export function characterCount(text: string): number {
  return Array.from(text).length;
}

/** Trimmed text whose length is checked in characters, so emoji count once. */
export function boundedText(min: number, max: number) {
  return z
    .string()
    .trim()
    .refine((text) => characterCount(text) >= min, {
      message: `Use at least ${String(min)} characters.`,
    })
    .refine((text) => characterCount(text) <= max, {
      message: `Use at most ${String(max)} characters.`,
    });
}

/** The first word of a display name, for a greeting that does not repeat the full name. */
export function firstNameOf(name: string): string {
  const trimmed = name.trim();
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

const emailSchema = z.email();

/** Whether an address passes the same check the n8n payload contracts apply. */
export function isDeliverableEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}
