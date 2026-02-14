/**
 * RBAC types – minimal, extensible.
 * Replace mocked role resolution in getCurrentUser when ready.
 */

export type Role = "owner" | "admin" | "staff" | "viewer";

export type Resource =
  | "dashboard"
  | "modules"
  | "personnel"
  | "profile"
  | "settings"
  | "notifications";

export type Action = "view" | "manage";

export type Permission = {
  resource: Resource;
  action: Action;
};
