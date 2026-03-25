/**
 * PostgREST / Supabase often returns this when a column is absent from the schema cache
 * (e.g. migration not applied yet).
 */
export function isMissingColumnError(message: string | undefined, columnName: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  const col = columnName.toLowerCase();
  if (!lower.includes(col)) return false;
  return (
    lower.includes("schema cache") ||
    lower.includes("could not find") ||
    lower.includes("does not exist") ||
    lower.includes("unknown column")
  );
}

/** Any likely “column missing / schema drift” message (use to retry with a smaller SELECT). */
export function isPostgrestSchemaError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache") ||
    lower.includes("could not find") ||
    lower.includes("does not exist") ||
    lower.includes("unknown column")
  );
}

export function isNoRowOrNotSingleError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("0 rows") ||
    lower.includes("no rows") ||
    lower.includes("multiple rows") ||
    lower.includes("json object requested")
  );
}
