import { ErrorCode, Role } from '@lendloop/contracts';
import { describe, expect, it } from 'vitest';

import { as, setup, signUp } from '../../test/harness';
import { api, internal } from '../_generated/api';

const alice = { subject: 'alice', email: 'Alice@Example.com', name: 'Alice' };

describe('users.ensure', () => {
  it('creates a regular, untrusted user on first sign-in', async () => {
    const t = setup();
    const viewer = await as(t, alice).mutation(api.users.mutations.ensure, {});
    expect(viewer).toEqual({ name: 'Alice', role: Role.USER, isTrustedLender: false });
  });

  it('stores the email in lower case and keeps one record per identity', async () => {
    const t = setup();
    await signUp(t, alice);
    await signUp(t, { ...alice, name: 'Alice B' });
    const users = await t.run((ctx) => ctx.db.query('users').collect());
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ email: 'alice@example.com', name: 'Alice B' });
  });

  it('falls back to the email name when the identity has no name', async () => {
    const t = setup();
    const viewer = await as(t, { subject: 'bob', email: 'bob@example.com' }).mutation(
      api.users.mutations.ensure,
      {},
    );
    expect(viewer.name).toBe('bob');
  });

  it('rejects guests', async () => {
    const t = setup();
    await expect(t.mutation(api.users.mutations.ensure, {})).rejects.toMatchObject({
      data: { code: ErrorCode.UNAUTHENTICATED },
    });
  });

  it('rejects an identity without an email', async () => {
    const t = setup();
    await expect(
      as(t, { subject: 'no-mail' }).mutation(api.users.mutations.ensure, {}),
    ).rejects.toMatchObject({ data: { code: ErrorCode.VALIDATION_FAILED } });
  });

  it('keeps the role an admin was given when the user signs in again', async () => {
    const t = setup();
    await signUp(t, alice);
    await t.mutation(internal.users.internal.setRole, {
      email: 'alice@example.com',
      role: Role.ADMIN,
    });
    const viewer = await as(t, alice).mutation(api.users.mutations.ensure, {});
    expect(viewer.role).toBe(Role.ADMIN);
  });
});

describe('users.me', () => {
  it('returns null for guests and for identities without an account', async () => {
    const t = setup();
    expect(await t.query(api.users.queries.me, {})).toBeNull();
    expect(await as(t, alice).query(api.users.queries.me, {})).toBeNull();
  });

  it('returns only the public viewer fields', async () => {
    const t = setup();
    const client = await signUp(t, alice);
    const viewer = await client.query(api.users.queries.me, {});
    expect(viewer).toEqual({ name: 'Alice', role: Role.USER, isTrustedLender: false });
  });
});

describe('users.internal.setRole', () => {
  it('fails for an email that never signed in', async () => {
    const t = setup();
    await expect(
      t.mutation(internal.users.internal.setRole, { email: 'x@example.com', role: Role.ADMIN }),
    ).rejects.toMatchObject({ data: { code: ErrorCode.NOT_FOUND } });
  });
});
