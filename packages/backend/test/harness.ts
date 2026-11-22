/// <reference types="vite/client" />
import { convexTest } from 'convex-test';

import schema from '../convex/schema';

// Every deployable function module; files with more than one dot (specs) are not deployed.
const modules = import.meta.glob(['../convex/**/*.{ts,js}', '!../convex/**/*.*.{ts,js}']);

export const ISSUER = 'https://clerk.test';

export interface TestIdentity {
  subject: string;
  email?: string;
  name?: string;
}

export function setup() {
  return convexTest(schema, modules);
}

export type TestConvex = ReturnType<typeof setup>;

/** A Clerk-like identity; convex-test derives tokenIdentifier from issuer and subject. */
export function as(t: TestConvex, identity: TestIdentity) {
  return t.withIdentity({ issuer: ISSUER, ...identity });
}

/** Creates the account through the real sign-in path and returns a client acting as that user. */
export async function signUp(t: TestConvex, identity: TestIdentity) {
  const client = as(t, identity);
  const { api } = await import('../convex/_generated/api');
  await client.mutation(api.users.mutations.ensure, {});
  return client;
}
