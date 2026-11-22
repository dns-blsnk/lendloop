import { describe, expect, it } from 'vitest';

import { can, Permission, PERMISSIONS } from './permissions';
import { Role } from './roles';

describe('permissions', () => {
  it('gives admins every permission', () => {
    for (const permission of Object.values(Permission)) {
      expect(can(Role.ADMIN, permission)).toBe(true);
    }
  });

  it('lets users create tools and request loans', () => {
    expect(can(Role.USER, Permission.TOOLS_CREATE)).toBe(true);
    expect(can(Role.USER, Permission.LOANS_REQUEST)).toBe(true);
  });

  it('keeps admin-only actions away from users', () => {
    const adminOnly = [
      Permission.TOOLS_REMOVE_ANY,
      Permission.LOANS_LIST_ALL,
      Permission.USERS_LIST,
      Permission.USERS_MARK_TRUSTED,
      Permission.AUTOMATION_VIEW_HEALTH,
    ];
    for (const permission of adminOnly) {
      expect(can(Role.USER, permission)).toBe(false);
    }
  });

  it('lists a role set for every permission', () => {
    expect(Object.keys(PERMISSIONS).sort()).toEqual(Object.values(Permission).sort());
  });
});
