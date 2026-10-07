/**
 * A page header's meta line, "Data as of 2026-10-05": the UTC day admin's
 * Deploy workflow built the artifact the page reads. PageLayout's meta line
 * sets the size and the muted colour, so this sets neither, and the day is a
 * bare <code> (R-7). It renders no element of its own around the words, so it
 * fits wherever phrasing content does (the meta line is a <p>).
 */
export function DataAsOf({generatedAt}: {generatedAt: string}) {
  return (
    <>
      Data as of <code>{generatedAt.slice(0, 10)}</code>
    </>
  );
}
