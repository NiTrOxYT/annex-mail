export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  INBOX: "/dashboard/inbox",
  SENT: "/dashboard/sent",
  DRAFTS: "/dashboard/drafts",
  TEMPLATES: "/dashboard/templates",
  TEAM: "/dashboard/team",
  LOGS: "/dashboard/logs",
  SETTINGS: "/dashboard/settings",
} as const;

export const ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  EMPLOYEE: "EMPLOYEE",
  READONLY: "READONLY",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  MAIL_SEND: "mail.send",
  MAIL_REPLY: "mail.reply",
  MAIL_DELETE: "mail.delete",
  MAIL_TEMPLATES_MANAGE: "mail.templates.manage",
  LOGS_VIEW: "logs.view",
  SETTINGS_MANAGE: "settings.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const EVENTS = {
  USER_CREATED: "USER_CREATED",
  USER_LOGGED_IN: "USER_LOGGED_IN",
  USER_LOGIN_FAILED: "USER_LOGIN_FAILED",
  USER_UPDATED: "USER_UPDATED",
  ORGANIZATION_CREATED: "ORGANIZATION_CREATED",
} as const;

export type SystemEvent = (typeof EVENTS)[keyof typeof EVENTS];

export const STORAGE_PATHS = {
  UPLOADS: ".uploads",
} as const;
