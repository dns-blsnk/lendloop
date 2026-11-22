import { Role } from './roles';

/**
 * Actions that depend on the role alone. Rules that depend on the record (only the owner approves a
 * request, only the borrower cancels it) are checked on top of this in the backend model.
 */
export const Permission = {
  TOOLS_CREATE: 'tools.create',
  TOOLS_REMOVE_ANY: 'tools.removeAny',
  LOANS_REQUEST: 'loans.request',
  LOANS_LIST_ALL: 'loans.listAll',
  USERS_LIST: 'users.list',
  USERS_MARK_TRUSTED: 'users.markTrusted',
  AUTOMATION_VIEW_HEALTH: 'automation.viewHealth',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const EVERYONE = [Role.ADMIN, Role.USER] as const;
const ADMINS = [Role.ADMIN] as const;

/** Who may do what. The backend enforces it; the web app uses it to decide what to show. */
export const PERMISSIONS: Readonly<Record<Permission, readonly Role[]>> = {
  [Permission.TOOLS_CREATE]: EVERYONE,
  [Permission.TOOLS_REMOVE_ANY]: ADMINS,
  [Permission.LOANS_REQUEST]: EVERYONE,
  [Permission.LOANS_LIST_ALL]: ADMINS,
  [Permission.USERS_LIST]: ADMINS,
  [Permission.USERS_MARK_TRUSTED]: ADMINS,
  [Permission.AUTOMATION_VIEW_HEALTH]: ADMINS,
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}
