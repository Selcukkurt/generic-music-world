/**
 * Log event model for audit / system logs.
 * V1: Used with mock data. Later wire to Supabase audit_log or extended schema.
 */

export type LogSeverity = "info" | "warning" | "error" | "critical";

export type LogCategory =
  | "auth"
  | "db"
  | "settings"
  | "roles"
  | "releases"
  | "security"
  | "import_export"
  | "system";

export type LogStatus = "success" | "failure";

export interface LogEvent {
  id: string;
  createdAt: string; // ISO
  severity: LogSeverity;
  category: LogCategory;
  action: string;
  message?: string;
  actor: {
    id?: string;
    email?: string;
    role?: string;
  };
  target?: {
    entity: string;
    id?: string;
  };
  status: LogStatus;
  metadata?: Record<string, unknown>;
  request?: {
    ip?: string;
    userAgent?: string;
  };
}

export interface LogFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  severities?: LogSeverity[];
  category?: LogCategory;
  status?: LogStatus;
  actor?: string;
}

export interface LogsQueryResult {
  events: LogEvent[];
  total: number;
  page: number;
  pageSize: number;
}
