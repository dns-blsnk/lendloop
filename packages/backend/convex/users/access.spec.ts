import { ErrorCode, Role } from '@lendloop/contracts';
import { describe, expect, it } from 'vitest';

import { as, setup, signUp } from '../../test/harness';
import { internal } from '../_generated/api';

import { requireAdminUser, requireViewerUser } from './model';

const alice = { subject: 'alice', email: 'alice@example.com', name: 'Alice' };

describe('access gates', () => {
  it('rejects guests as unauthenticated', async () => {
    const t = setup();
    await expect(t.run((ctx) => requireViewerUser(ctx))).rejects.toMatchObject({
      data: { code: ErrorCode.UNAUTHENTICATED },
    });
  });

  it('rejects a signed-in identity whose account is not set up yet', async () => {
    const t = setup();
    await expect(as(t, alice).run((ctx) => requireViewerUser(ctx))).rejects.toMatchObject({
      data: { code: ErrorCode.UNAUTHENTICATED },
    });
  });

  it('rejects a regular user at the admin gate', async () => {
    const t = setup();
    const client = await signUp(t, alice);
    await expect(client.run((ctx) => requireAdminUser(ctx))).rejects.toMatchObject({
      data: { code: ErrorCode.FORBIDDEN },
    });
  });

  it('lets an admin through the admin gate', async () => {
    const t = setup();
    const client = await signUp(t, alice);
    await t.mutation(internal.users.internal.setRole, { email: alice.email, role: Role.ADMIN });
    const admin = await client.run((ctx) => requireAdminUser(ctx));
    expect(admin.role).toBe(Role.ADMIN);
  });
});

describe('users.internal.setRole with a shared email', () => {
  it('refuses to guess between accounts that share an email', async () => {
    const t = setup();
    await signUp(t, alice);
    await signUp(t, { ...alice, subject: 'alice-recreated' });
    await expect(
      t.mutation(internal.users.internal.setRole, { email: alice.email, role: Role.ADMIN }),
    ).rejects.toMatchObject({ data: { code: ErrorCode.CONFLICT } });
  });
});
