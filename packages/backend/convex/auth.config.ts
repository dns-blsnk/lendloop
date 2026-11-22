import type { AuthConfig } from 'convex/server';

const issuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN ?? '';

// Convex evaluates this file at deploy time, before any module can run, so it validates its one
// variable itself: a typo would otherwise reject every token without any error.
if (issuerDomain !== '' && !/^https:\/\/[^/\s]+$/.test(issuerDomain)) {
  throw new Error('CLERK_JWT_ISSUER_DOMAIN must look like https://<instance>.clerk.accounts.dev');
}

// Clerk issues the JWT from its "convex" template. Without an issuer the deployment trusts no
// tokens at all (fails closed): every caller is a guest until CLERK_JWT_ISSUER_DOMAIN is set.
export default {
  providers: issuerDomain === '' ? [] : [{ domain: issuerDomain, applicationID: 'convex' }],
} satisfies AuthConfig;
