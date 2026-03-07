/**
 * Operational Context – lightweight foundation for Event-Driven Organization Platform.
 *
 * Centralizes how the app reasons about:
 * - user identity
 * - org unit context
 * - event context
 * - role context
 * - effective permissions summary
 *
 * This is a domain layer only. No UI, no data fetching.
 * Future modules (M02 Event Ops, M04 Personnel) can consume this context.
 */

import type { Role } from "@/lib/rbac/types";
import { canAccess, canAccessSystem, canAccessBusiness } from "@/lib/rbac/canAccess";

// =============================================================================
// Context types
// =============================================================================

/** Authenticated user + system RBAC role. */
export type SystemContext = {
  userId: string;
  email: string;
  fullName: string;
  /** System-wide RBAC role from profiles.role */
  role: Role;
};

/** Organization unit and job title context (from person_assignments / org structure). */
export type OrganizationContext = {
  orgUnitId: string | null;
  orgUnitName: string | null;
  jobTitleId: string | null;
  jobTitleName: string | null;
};

/** Active event context and event-scoped access level. */
export type EventContext = {
  eventId: string | null;
  eventName: string | null;
  eventDate: string | null;
  /** Event-scoped access: view | edit. Null when no event selected. */
  eventAccessLevel: "view" | "edit" | null;
};

/** Effective permissions summary – derived from role + event context. */
export type EffectivePermissionsSummary = {
  canViewDashboard: boolean;
  canManagePersonnel: boolean;
  canManageEvents: boolean;
  canAccessSystem: boolean;
  canAccessBusiness: boolean;
  /** Event-scoped: can edit current event (admin OR event edit access). */
  canEditCurrentEvent: boolean;
};

/** Full operational context – normalized view for the platform. */
export type OperationalContext = {
  system: SystemContext;
  organization: OrganizationContext;
  event: EventContext;
  effectivePermissions: EffectivePermissionsSummary;
};

// =============================================================================
// Helpers
// =============================================================================

/** Derive effective permissions from role and optional event access. */
export function deriveEffectivePermissions(
  role: Role | null,
  eventAccessLevel: "view" | "edit" | null
): EffectivePermissionsSummary {
  const canManagePersonnel = role ? canAccess(role, "personnel", "manage") : false;
  const canViewDashboard = role ? canAccess(role, "dashboard", "view") : false;

  return {
    canViewDashboard,
    canManagePersonnel,
    canManageEvents: role ? ["system_owner", "ceo", "admin", "lead"].includes(role) : false,
    canAccessSystem: canAccessSystem(role),
    canAccessBusiness: canAccessBusiness(role),
    canEditCurrentEvent:
      (role ? ["system_owner", "ceo", "admin", "lead"].includes(role) : false) ||
      eventAccessLevel === "edit",
  };
}

/** Compose full operational context from parts. */
export function createOperationalContext(input: {
  system: SystemContext;
  organization?: Partial<OrganizationContext> | null;
  event?: Partial<EventContext> | null;
}): OperationalContext {
  const organization: OrganizationContext = {
    orgUnitId: input.organization?.orgUnitId ?? null,
    orgUnitName: input.organization?.orgUnitName ?? null,
    jobTitleId: input.organization?.jobTitleId ?? null,
    jobTitleName: input.organization?.jobTitleName ?? null,
  };

  const event: EventContext = {
    eventId: input.event?.eventId ?? null,
    eventName: input.event?.eventName ?? null,
    eventDate: input.event?.eventDate ?? null,
    eventAccessLevel: input.event?.eventAccessLevel ?? null,
  };

  const effectivePermissions = deriveEffectivePermissions(
    input.system.role,
    event.eventAccessLevel
  );

  return {
    system: input.system,
    organization,
    event,
    effectivePermissions,
  };
}

/** Build minimal context from CurrentUser only (no org/event). */
export function createMinimalContext(input: {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
}): OperationalContext {
  return createOperationalContext({
    system: {
      userId: input.userId,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
    },
    organization: null,
    event: null,
  });
}
