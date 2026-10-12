import {describe, expect, it} from 'vitest';
import type {CardType} from 'inkweave-synergy-engine';
import {REVEAL_ID_BASE, SET_TOTAL, inkBlock} from '../../../app-bridge';
import {RUBY_NUMBER, revealForm} from '../../../test/revealForm';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import {
  revealChecklist,
  sectionStatuses,
  visibleErrors,
  visibleImageError,
  type ChecklistId,
  type ChecklistItem,
  type ImageStatus,
  type SectionId,
  type SectionState,
  type SectionStatus,
} from '../readiness';

const NO_IDS: ReadonlySet<number> = new Set();
/** The fixture card's own id, so its number collides. */
const TAKEN: ReadonlySet<number> = new Set([REVEAL_ID_BASE + RUBY_NUMBER]);
const NO_FILE: ImageStatus = {name: null, ready: false, error: null};
const READING: ImageStatus = {name: 'mei.png', ready: false, error: null};
const READ: ImageStatus = {name: 'mei.png', ready: true, error: null};
const INK_NEEDS_NUMBER = 'Checked against the collector number: set it first';
const INK_NEEDS_FIXED_NUMBER = 'Checked against the collector number: fix it first';

/** A form as the page holds it: the card list's ids and the image beside it. */
interface Case {form: RevealCardForm; ids?: ReadonlySet<number>; image?: ImageStatus}

/** The validator's verdict, as the page runs it: no test writes errors by hand. */
function validate({form, ids = NO_IDS, image = READ}: Case) {
  return validateRevealCardForm(form, ids, image.name);
}

function checklist(c: Case): ChecklistItem[] {
  return revealChecklist(c.form, validate(c), c.image ?? READ);
}

/** The items still open, each as its id and message. */
function openItems(c: Case): Array<Pick<ChecklistItem, 'id' | 'message'>> {
  return checklist(c)
    .filter((item) => !item.done)
    .map(({id, message}) => ({id, message}));
}

/** The sections that aren't complete, with their status. */
function openSections(c: Case): Partial<Record<SectionId, SectionStatus>> {
  const statuses = sectionStatuses(c.form, validate(c).errors);
  return Object.fromEntries(Object.entries(statuses).filter(([, status]) => status.state !== 'complete'));
}

interface OneError {key: string; c: Case; item: ChecklistId; section?: SectionId; state?: SectionState}

// One form per key validateRevealCardForm reports, valid but for that key. Each key
// opens exactly one checklist item, which takes the validator's message, and every
// key but the image opens exactly one section: red for a filled value that fails,
// neutral for a blank one (R-72).
const ONE_ERROR: readonly OneError[] = [
  // A collision leaves Collector number open, and Ink done: the block check ran on the number.
  {key: 'collectorNumber', c: {form: revealForm(), ids: TAKEN}, item: 'collectorNumber', section: 'identity', state: 'error'},
  {key: 'name', c: {form: revealForm({name: ''})}, item: 'name', section: 'identity', state: 'incomplete'},
  {key: 'cost', c: {form: revealForm({cost: ''})}, item: 'cost', section: 'type', state: 'incomplete'},
  // The ink-block clash: the number's block names another ink.
  {key: 'ink', c: {form: revealForm({ink: 'Amber'})}, item: 'ink', section: 'ink', state: 'error'},
  {key: 'ink2', c: {form: revealForm({ink2: 'Ruby'})}, item: 'ink', section: 'ink', state: 'error'},
  // Only a hand-built form gets this far: the type control offers the four types.
  {key: 'type', c: {form: revealForm({type: 'Bogus' as CardType})}, item: 'typeStats', section: 'type', state: 'error'},
  {key: 'strength', c: {form: revealForm({strength: '3foo'})}, item: 'typeStats', section: 'type', state: 'error'},
  {key: 'willpower', c: {form: revealForm({willpower: '-1'})}, item: 'typeStats', section: 'type', state: 'error'},
  // A Character with no lore leaves Type & stats incomplete, not red.
  {key: 'lore', c: {form: revealForm({lore: ''})}, item: 'typeStats', section: 'type', state: 'incomplete'},
  {key: 'moveCost', c: {form: revealForm({type: 'Location', moveCost: ''})}, item: 'typeStats', section: 'type', state: 'incomplete'},
  {key: 'fullText', c: {form: revealForm({fullText: 'Your Strength wins.'})}, item: 'cardText', section: 'text', state: 'error'},
  {key: 'keywords', c: {form: revealForm({keywords: 'Challenger +2 Strength'})}, item: 'cardText', section: 'text', state: 'error'},
  {key: 'image', c: {form: revealForm(), image: NO_FILE}, item: 'image'},
];

describe('the checklist and the section dots', () => {
  it.each(ONE_ERROR)('put $key on the $item item, and on one section at most', ({key, c, item, section, state}) => {
    const message = validate(c).errors[key];
    expect({errors: Object.keys(validate(c).errors), items: openItems(c), sections: openSections(c)}).toEqual({
      errors: [key],
      items: [{id: item, message}],
      sections: section ? {[section]: {state, message: state === 'error' ? message : null}} : {},
    });
  });

  it.each([
    ['a Character', revealForm()],
    ['an Item with a cost and no stats', revealForm({type: 'Item', strength: '', willpower: '', lore: ''})],
    ['a Location with its move cost', revealForm({type: 'Location', strength: '', moveCost: '1'})],
  ])('tick every item and section for %s with its image read', (_, form) => {
    expect({items: openItems({form}), sections: openSections({form})}).toEqual({items: [], sections: {}});
  });

  it('read 1/7 on a fresh form, naming what is left, with no section red', () => {
    const c: Case = {form: EMPTY_FORM, image: NO_FILE};
    expect({items: openItems(c), sections: openSections(c)}).toEqual({
      // Card text is optional, as a vanilla card has none, so it starts ticked.
      items: [
        {id: 'collectorNumber', message: 'Enter a positive collector number'},
        {id: 'name', message: 'Name is required'},
        {id: 'ink', message: INK_NEEDS_NUMBER},
        {id: 'cost', message: 'Enter a cost (0 or more)'},
        {id: 'typeStats', message: 'Enter strength for a character'},
        {id: 'image', message: 'Upload a card image'},
      ],
      sections: {
        identity: {state: 'incomplete', message: null},
        ink: {state: 'incomplete', message: null},
        type: {state: 'incomplete', message: null},
      },
    });
  });

  it('turn a section red for one value that fails, even beside a blank one', () => {
    const form = revealForm({collectorNumber: '0', name: ''});
    expect(sectionStatuses(form, validate({form}).errors).identity).toEqual({
      state: 'error',
      message: 'Enter a positive collector number',
    });
  });
});

describe('the Ink item', () => {
  // The tick follows the ink-block check, never the Amber default. A blank number is still to set; a
  // filled one outside the set is one the validator refuses, R-73's past-the-set number included.
  it.each([
    {collectorNumber: '', message: INK_NEEDS_NUMBER},
    {collectorNumber: '  ', message: INK_NEEDS_NUMBER},
    {collectorNumber: '0', message: INK_NEEDS_FIXED_NUMBER},
    {collectorNumber: '12x', message: INK_NEEDS_FIXED_NUMBER},
    {collectorNumber: String(SET_TOTAL + 1), message: INK_NEEDS_FIXED_NUMBER},
  ])('waits for a number in the set ($collectorNumber), with the Amber default', ({collectorNumber, message}) => {
    const form = revealForm({collectorNumber, ink: 'Amber'});
    const ink = checklist({form}).find((item) => item.id === 'ink');
    expect({ink, section: sectionStatuses(form, validate({form}).errors).ink}).toEqual({
      ink: {id: 'ink', label: 'Ink', done: false, message},
      section: {state: 'incomplete', message: null},
    });
  });

  it("ticks once the number is in the ink's own block", () => {
    const form = revealForm({collectorNumber: String(inkBlock('Amber').first), ink: 'Amber'});
    expect(checklist({form}).find((item) => item.id === 'ink')?.done).toBe(true);
  });
});

describe('the image', () => {
  it.each([
    {name: 'no file yet', image: NO_FILE, item: 'Upload a card image', input: null},
    {name: 'bytes still being read', image: READING, item: 'Reading the image…', input: null},
    {
      name: 'a name the validator refuses',
      image: {...READING, name: 'mei.gif'},
      item: 'Image must be jpg, jpeg, png, or webp',
      input: 'Image must be jpg, jpeg, png, or webp',
    },
    {
      name: 'bytes that fail the byte check',
      image: {...READING, error: 'mei.png is not a JPEG, PNG or WebP image.'},
      item: 'mei.png is not a JPEG, PNG or WebP image.',
      input: 'mei.png is not a JPEG, PNG or WebP image.',
    },
    // Both refuse it: the upload's message comes first, since it says what to do.
    {
      name: 'a refused name whose bytes failed too',
      image: {name: 'mei.gif', ready: false, error: 'mei.gif holds a PNG image; rename it to end in .png.'},
      item: 'mei.gif holds a PNG image; rename it to end in .png.',
      input: 'mei.gif holds a PNG image; rename it to end in .png.',
    },
    {name: 'a file read and checked', image: READ, item: null, input: null},
  ])('gives the checklist and the file input their messages for $name', ({image, item, input}) => {
    const c: Case = {form: revealForm(), image};
    const imageItem = checklist(c).find((entry) => entry.id === 'image');
    expect({item: imageItem?.message, input: visibleImageError(validate(c).errors, image)}).toEqual({item, input});
  });
});

describe('visibleErrors', () => {
  it('keeps the errors on filled values and drops those on blank ones, spaces included (R-72)', () => {
    const form = revealForm({name: '   ', cost: '1.5', lore: '', fullText: 'Your Strength wins.'});
    expect(visibleErrors(form, validate({form}).errors)).toEqual({
      cost: 'Enter a cost (0 or more)',
      fullText: '"Strength" is spelled out: use ¤ ("their ¤")',
    });
  });

  it('shows nothing on a fresh form, and never the image', () => {
    const fresh = validate({form: EMPTY_FORM, image: NO_FILE}).errors;
    const badName = validate({form: revealForm(), image: {...READ, name: 'mei.gif'}}).errors;
    expect({fresh: visibleErrors(EMPTY_FORM, fresh), badName: visibleErrors(revealForm(), badName)}).toEqual({
      fresh: {},
      badName: {},
    });
  });
});

describe('readiness against readyToPublish', () => {
  // Every item is done exactly when the validation passes and the bytes are read.
  // Past the set, the validator once passed while Ink waited; R-73 refuses the number.
  it.each([
    {name: 'a fresh form', c: {form: EMPTY_FORM, image: NO_FILE}},
    {name: 'a valid form with no image', c: {form: revealForm(), image: NO_FILE}},
    {name: 'a valid form whose image is being read', c: {form: revealForm(), image: READING}},
    {name: 'a valid form whose image is read', c: {form: revealForm(), image: READ}},
    {name: 'a colliding number', c: {form: revealForm(), ids: TAKEN, image: READ}},
    {name: 'a number past the set', c: {form: revealForm({collectorNumber: String(SET_TOTAL + 1), ink: 'Amber'}), image: READ}},
  ])('hold for $name', ({c}) => {
    const validation = validate(c);
    expect(checklist(c).every((item) => item.done)).toBe(validation.ok && c.image.ready);
  });
});
