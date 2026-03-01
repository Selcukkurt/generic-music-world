/**
 * GMW Pulse configuration
 * Set NEXT_PUBLIC_SINGLE_ADMIN_MODE=false to disable.
 * Owner/owner_id kept in data for future multi-user support.
 */

export const SINGLE_ADMIN_MODE =
  process.env.NEXT_PUBLIC_SINGLE_ADMIN_MODE !== "false";
