/**
 * Escapes a string value for safe inclusion in SQL queries.
 * This function handles multiple SQL injection vectors including:
 * - Single quotes
 * - Backslashes
 * - Null bytes
 * - Carriage returns and line feeds
 * 
 * @param value - The string to escape
 * @returns The escaped string safe for SQL inclusion
 */
export function escapeSQL(value: string): string {
  return value
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/'/g, "''")     // Escape single quotes
    .replace(/\0/g, '\\0')   // Escape null bytes
    .replace(/\n/g, '\\n')   // Escape newlines
    .replace(/\r/g, '\\r')   // Escape carriage returns
    // eslint-disable-next-line no-control-regex
    .replace(/\x1a/g, '\\Z'); // Escape EOF marker
}

/**
 * Formats a value for SQL inclusion, handling nulls and escaping strings.
 * 
 * @param value - The value to format
 * @returns SQL-formatted string or NULL
 */
export function formatSQLValue(value: string | undefined | null): string {
  if (value === undefined || value === null) {
    return 'NULL';
  }
  return `'${escapeSQL(value)}'`;
}