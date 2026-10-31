/** PostgREST returns at most this many rows a request, so reads page through in steps of it. */
const PAGE_ROWS = 1000;

/**
 * Read every row of a Supabase table, paginating past PostgREST's 1000-row cap.
 * Its error names the table and Supabase's message, never a row.
 */
export async function fetchAllRows(client, table, columns) {
  const rows = [];
  for (let from = 0; ; from += PAGE_ROWS) {
    const {data, error} = await client
      .from(table)
      .select(columns)
      .range(from, from + PAGE_ROWS - 1);
    if (error) throw new Error(`${table} read failed: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_ROWS) break;
  }
  return rows;
}
