import { UserRole, Permission, PERMISSIONS, ROLES } from "@/utils/constants";

export const ROLE_POLICIES: Record<UserRole, Permission[]> = {
  [ROLES.OWNER]: [
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.MAIL_SEND,
    PERMISSIONS.MAIL_REPLY,
    PERMISSIONS.MAIL_DELETE,
    PERMISSIONS.MAIL_TEMPLATES_MANAGE,
    PERMISSIONS.LOGS_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.MAIL_SEND,
    PERMISSIONS.MAIL_REPLY,
    PERMISSIONS.MAIL_TEMPLATES_MANAGE,
    PERMISSIONS.LOGS_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
  ],
  [ROLES.EMPLOYEE]: [
    PERMISSIONS.MAIL_SEND,
    PERMISSIONS.MAIL_REPLY,
    PERMISSIONS.MAIL_TEMPLATES_MANAGE,
  ],
  [ROLES.READONLY]: [],
};

export class PermissionChecker {
  static hasPermission(role: UserRole, permission: Permission): boolean {
    const allowed = ROLE_POLICIES[role];
    if (!allowed) return false;
    return allowed.includes(permission);
  }

  static hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
    return permissions.every((p) => this.hasPermission(role, p));
  }

  static hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
    return permissions.some((p) => this.hasPermission(role, p));
  }
}
export const permissionChecker = new PermissionChecker();
