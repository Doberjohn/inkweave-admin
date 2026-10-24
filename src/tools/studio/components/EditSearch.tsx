import {useId, useRef} from 'react';
import {Link} from 'react-router-dom';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {CtaButton, FONTS, SPACING, TRUNCATE, smallImageUrl} from '../../../app-bridge';
import {ForgetTokenOffer} from '../../../github/ForgetTokenOffer';
import {isRejectedToken} from '../../../github/rejectedToken';
import {useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {studioHref} from '../../../shell/nav';
import {PAGE_GUTTER} from '../../../shell/PageLayout';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Notice} from '../../../ui/Notice';
import {numberLabel, type SearchRow} from '../editSearch';
import {searchStatus} from '../searchStatus';
import {CardInks, CardTags, MARK_SIZE, RarityMark} from './CardMarks';

/** The search screen's column, the handoff's 720px (README §7). */
const COLUMN_WIDTH = 720;
/** A row's thumbnail, the handoff's 34 × 48: a card's own proportions. */
const THUMB_WIDTH = 34;
const THUMB_HEIGHT = 48;
/** Room for two inks and a rarity, so every row's marks line up. */
const MARKS_WIDTH = 3 * MARK_SIZE + 2 * SPACING.xs;
/**
 * The number's column: one width for every list, so the marks never jump while a query is typed. A
 * card of Sets 1 to 8 names its set before its number (numberLabel) and the cell wraps there, "Set 8 ·"
 * over "#204", so the column holds the first line: seven characters of the 12px monospace at 0.6em
 * each, and a pixel to spare, 52px. "#204" alone had 44px, so this takes 8px of the names column. On
 * a phone that column is the viewport less the 64px rail, 64px of gutters (the studio root's 16px
 * padding, then the search's own PAGE_GUTTER, 16px there, each a side), 26px of border and padding,
 * 138px of thumbnail, marks and gaps, and this column: 31px at 375px, narrower than the "released"
 * chip (about 50px).
 */
const NUMBER_WIDTH = Math.ceil(7 * 0.6 * ADMIN_TYPE.small) + 1;

// The page body's padding (PageLayout's BODY), round the handoff's centred column.
const SCREEN: React.CSSProperties = {padding: `${SPACING.xxl}px ${PAGE_GUTTER}`};
const COLUMN: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.lg,
  width: '100%',
  maxWidth: COLUMN_WIDTH,
  margin: '0 auto',
};
const STACK: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.sm};
const TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.sectionTitle,
  fontWeight: 400,
  color: ADMIN_COLORS.text,
};
const HINT: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted};
const FIELD: React.CSSProperties = {width: '100%'};
const STATUS: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const LIST: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: ADMIN_RADIUS.panel,
  overflow: 'hidden',
};
const RULED: React.CSSProperties = {borderTop: `1px solid ${ADMIN_COLORS.divider}`};
// The link fills its row. adm-row-btn gives it the hover fill and the inset
// ring, which the list's clipped corners keep whole.
const ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `${THUMB_WIDTH}px minmax(0, 1fr) ${MARKS_WIDTH}px ${NUMBER_WIDTH}px`,
  alignItems: 'center',
  gap: SPACING.md,
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  textDecoration: 'none',
};
// The empty box shows until the art loads, and stays for a card with none.
const THUMB: React.CSSProperties = {
  display: 'block',
  width: THUMB_WIDTH,
  height: THUMB_HEIGHT,
  overflow: 'hidden',
  borderRadius: ADMIN_RADIUS.tag,
  backgroundColor: ADMIN_COLORS.card,
};
const THUMB_IMAGE: React.CSSProperties = {display: 'block', width: '100%', height: '100%', objectFit: 'cover'};
const NAMES: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xxs, minWidth: 0};
// The tags wrap under a long name rather than run into the marks at phone width.
const NAME_LINE: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: SPACING.sm,
  minWidth: 0,
};
const NAME: React.CSSProperties = {...TRUNCATE, fontSize: ADMIN_TYPE.emphasis};
const VERSION: React.CSSProperties = {...TRUNCATE, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const MARKS: React.CSSProperties = {display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: SPACING.xs};
// Muted, never dim: the number, and the set before it, tell two cards of one name apart (R-6).
// It wraps, so a card of Sets 1 to 8 reads "Set 3 ·" over "#90" in NUMBER_WIDTH's 52px, 8px more
// than a bare number's 44. The row is 64px tall at least, for its thumbnail, so the second line
// costs no height.
const NUMBER: React.CSSProperties = {textAlign: 'right', whiteSpace: 'normal', fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

/** The card list (useCardDataContext): every row comes from it, so its failure takes the field's place. */
export interface EditSearchList {
  loading: boolean;
  error: Error | null;
  /** The card list's retryLoad. */
  onRetry: () => void;
  /**
   * The cards of Sets 1 to 8 are still being read (#68), so a query that matches nothing may match
   * once they are in, and the status line says so (#74). Absent, they are in, or failed.
   */
  setsLoading?: boolean;
}

/** previewCards.json, read from the target branch (R4-4a). It only tags the rows, so its failure leaves them open (R-71). */
export interface EditSearchFile {
  error: string | null;
  /** Reads the file again. */
  onRetry: () => void;
  /**
   * Forgets the saved token: offered in place of reading again when GitHub
   * rejected it (R-26). The page asks first while a draft is dirty (R-84).
   */
  onForgetToken?: () => void;
}

export interface EditSearchProps {
  /** searchCards' rows: the first SEARCH_LIMIT matches, the branch file's cards first (R-76). */
  rows: readonly SearchRow[];
  /** Every match (searchCards' total). */
  total: number;
  /** The text in the field. The page holds it, so it survives opening a card and coming back. */
  query: string;
  onQuery: (query: string) => void;
  list: EditSearchList;
  file: EditSearchFile;
  /**
   * Lines above the field: the page's message for an id the card list doesn't
   * hold (R4-6b), and for Sets 1 to 8 failing to load (#68).
   */
  notice?: React.ReactNode;
  /**
   * The page's (R-59): the field takes it once "Load a different card", or the
   * card list's Retry, has unmounted the control pressed, and the card list is
   * in. Retry takes it when the card list fails again.
   */
  handoff?: FocusHandoff;
}

/** The screen's h2, and what the search covers. */
function SearchTitle({id}: {id: string}) {
  return (
    <div style={STACK}>
      <h2 id={id} style={TITLE}>
        Find a card to edit
      </h2>
      <p style={HINT}>
        Every card, by name, version or id, with the branch’s preview cards first. A preview card opens in
        the form with its current data; a card of Sets 1 to 8 opens for its printings’ versions only; any other
        card opens for a new image and its printings’ versions.
      </p>
    </div>
  );
}

type SearchFieldProps = Pick<EditSearchProps, 'query' | 'onQuery' | 'handoff'> & {
  /** The card list is in: until then a pending handoff waits, so Retry can take it if the list fails again. */
  ready: boolean;
};

/**
 * The search field. Its wrapper takes a pending handoff, since useTakeHandoff
 * looks inside a container, but only once the card list is in, as R3's card
 * page waits out its load: Retry's request then lands here, or on Retry again.
 * The field keeps its query after "Load a different card", so taking focus
 * selects it, and typing starts a new search rather than adding to the old
 * one. In Chrome a click still places the caret, since it collapses the
 * selection when the mouse button is released; Firefox keeps the selection
 * after a click, so there a click selects the old query too.
 */
function SearchField({query, onQuery, handoff, ready}: SearchFieldProps) {
  const ref = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, ref, 'input', ready);
  return (
    <div ref={ref}>
      <input
        type="search"
        className="adm-input"
        aria-label="Search cards"
        placeholder="e.g. Maui or Hero to All"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        style={FIELD}
      />
    </div>
  );
}

/**
 * The card list failed (R3's FailedCardList), and every row comes from it.
 * Retry swaps this for the field, taking its own button with it, so the page
 * asks for a handoff, which waits out the load: the field takes it once the
 * list is in, and Retry takes it if the list fails again.
 */
function FailedCardList({error, onRetry, handoff}: {error: Error; onRetry: () => void; handoff?: FocusHandoff}) {
  const ref = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, ref, 'button');
  return (
    <div ref={ref} style={STACK}>
      <Notice tone="error">Could not load the card list ({error.message})</Notice>
      <CtaButton type="button" variant="neutral" onClick={onRetry} style={{alignSelf: 'flex-start'}}>
        Retry
      </CtaButton>
    </div>
  );
}

/**
 * previewCards.json couldn't be read (R-71): the error and its way out, beside
 * the rows rather than in their place. Forget token when GitHub rejected the
 * token and the page offers it (R-26), else reading the file again, as the
 * tuning aside's read error does.
 */
function FileReadError({error, file}: {error: string; file: EditSearchFile}) {
  const {onForgetToken} = file;
  return (
    <div style={STACK}>
      <Notice tone="error">Could not read previewCards.json: {error}. Released cards still open for a new image.</Notice>
      {onForgetToken && isRejectedToken(error) ? (
        <ForgetTokenOffer onForget={onForgetToken} />
      ) : (
        <CtaButton type="button" variant="neutral" onClick={file.onRetry} style={{alignSelf: 'flex-start'}}>
          Read previewCards.json again
        </CtaButton>
      )}
    </div>
  );
}

/** A row's art, or its empty box. Decoration: the row's text names the card. */
function Thumb({card}: {card: LorcanaCard}) {
  const src = smallImageUrl(card);
  return (
    <span style={THUMB}>
      {src && <img src={src} alt="" width={THUMB_WIDTH} height={THUMB_HEIGHT} loading="lazy" style={THUMB_IMAGE} />}
    </span>
  );
}

/**
 * One match: a link that opens the card in Edit card, drawn as the handoff
 * draws it (README §7): the thumbnail, name and version, inks, rarity and
 * collector number, plus the card's tags. A card of Sets 1 to 8 names its set
 * before the number (numberLabel), so it tells from a Core reprint of itself
 * (#68); the number's cell wraps, the set over the number. The spaces are text
 * nodes of their own, so the link's name reads
 * "Mei preview Red Panda Ruby #31", or "Ursula released Deceiver Emerald
 * Set 3 · #90": a grid or a flex row draws none of them.
 */
function ResultRow({row, ruled}: {row: SearchRow; ruled: boolean}) {
  const {card} = row;
  return (
    <li style={ruled ? RULED : undefined}>
      <Link to={studioHref('edit', card.id)} className="adm-row-btn" style={ROW}>
        <Thumb card={card} />{' '}
        <span style={NAMES}>
          <span style={NAME_LINE}>
            <span style={NAME}>{card.name}</span> <CardTags tag={row.tag} deployed={row.deployed} />
          </span>{' '}
          <span style={VERSION}>{card.version}</span>
        </span>{' '}
        <span style={MARKS}>
          <CardInks card={card} />
          <RarityMark rarity={card.rarity} />
        </span>{' '}
        <code style={NUMBER}>{numberLabel(card)}</code>
      </Link>
    </li>
  );
}

/** The matches, or nothing for none: the status line says so. */
function ResultList({rows}: {rows: readonly SearchRow[]}) {
  if (rows.length === 0) return null;
  return (
    <ul aria-label="Cards" style={LIST}>
      {rows.map((row) => (
        <ResultRow key={row.card.id} row={row} ruled={row !== rows[0]} />
      ))}
    </ul>
  );
}

/**
 * Edit card's search screen (R4-5f): a search over the card list, each match a
 * link to the card (studioHref), and an always-mounted polite status line that
 * counts the matches. The page runs searchCards and holds the query. The rows
 * wait for the card list, and its failure takes the field's place, since every
 * row comes from it; previewCards.json's failure shows beside the rows, which
 * still open (R-71).
 */
export function EditSearch({rows, total, query, onQuery, list, file, notice, handoff}: EditSearchProps) {
  const titleId = useId();
  const failed = list.error !== null;
  const status = searchStatus({
    query,
    shown: rows.length,
    total,
    list: {loading: list.loading, failed, setsLoading: list.setsLoading === true},
  });
  // Rows only once the card list is in: while it loads, a card the branch file
  // also holds would read "not deployed yet" (R-66).
  const listed = !list.loading && !failed;
  return (
    <div style={SCREEN}>
      <section aria-labelledby={titleId} style={COLUMN}>
        <SearchTitle id={titleId} />
        {notice}
        {list.error ? (
          <FailedCardList error={list.error} onRetry={list.onRetry} handoff={handoff} />
        ) : (
          <SearchField query={query} onQuery={onQuery} handoff={handoff} ready={!list.loading} />
        )}
        {file.error !== null && <FileReadError error={file.error} file={file} />}
        {/* Mounted with the screen, so each new count is announced. */}
        <p role="status" style={STATUS}>
          {status}
        </p>
        {listed && <ResultList rows={rows} />}
      </section>
    </div>
  );
}
