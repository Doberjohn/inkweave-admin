/** PostgREST returns at most this many rows a request, so reads page through in steps of it. */
const PAGE_ROWS = 1000;

/**
 * Read every row of a Supabase table, paginating past PostgREST's 1000-row cap.
 * `order` names columns that together are unique, since a page has no order of its
 * own and unordered pages could overlap or skip rows; they need not be among
 * `columns`. A write that lands between two page requests can still shift a row,
 * and the next nightly run reads it again. Its error names the table and Supabase's
 * message, never a row.
 */
export async function fetchAllRows(client, {table, columns, order}) {
  const rows = [];
  for (let from = 0; ; from += PAGE_ROWS) {
    const query = order.reduce((ordered, column) => ordered.order(column), client.from(table).select(columns));
    const {data, error} = await query.range(from, from + PAGE_ROWS - 1);
    if (error) throw new Error(`${table} read failed: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_ROWS) break;
  }
  return rows;
}
