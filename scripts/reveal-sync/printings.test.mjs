// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {UsageError} from './cli.mjs';
import {parseOfficialList} from './official.mjs';
import {addVariants, describePrintings, planPrintings} from './printings.mjs';
import {
  APP_AVIFS,
  HECTOR,
  JUDY,
  OFFICIAL_SLOTS,
  SEASON,
  SLOT_215,
  SLOT_239,
  THE_QUEEN,
  TIANA,
  allCardsOf,
  officialJson,
  previewOf,
} from './__fixtures__/printings.mjs';

/** What `stage` reads, as it stood on 2026-10-01, with any part replaced. */
const baseWith = ({slots = OFFICIAL_SLOTS, cards = [HECTOR, TIANA, JUDY], canonical = [THE_QUEEN], avifs = APP_AVIFS} = {}) => ({
  official: parseOfficialList(officialJson(...slots), SEASON),
  preview: previewOf(...cards),
  allCards: allCardsOf(...canonical),
  avifs: new Set(avifs),
  season: SEASON,
});

const HECTOR_EPIC = {
  number: 215,
  id: 14215,
  rarity: 'Epic',
  name: 'Héctor Rivera',
  fullName: 'Héctor Rivera - Street Musician',
  base: {id: 14117, fullName: 'Hector Rivera - Street Musician'},
  entry: SLOT_215,
};

const TIANA_ENCHANTED = {
  number: 239,
  id: 14239,
  rarity: 'Enchanted',
  name: 'Tiana',
  fullName: 'Tiana - Party Hostess',
  base: {id: 14196, fullName: 'Tiana - Party Hostess'},
  entry: SLOT_239,
};

describe('planPrintings', () => {
  it('puts each revealed printing on its base card, found by name and version without accents', () => {
    expect(planPrintings([215, 239], baseWith())).toEqual({printings: [HECTOR_EPIC, TIANA_ENCHANTED], problems: []});
  });

  // The fixtures' printings are an Epic and an Enchanted; Set 14's Iconics are #241 and #242.
  it('plans an Iconic slot as an Iconic', () => {
    const iconic = {...SLOT_239, set_number: 241, name: 'Mickey Mouse', subtitle: 'Best in Town', rarity: 'ICONIC'};
    const mickey = {...TIANA, id: 14023, number: 23, name: 'Mickey Mouse', version: 'Best in Town', fullName: 'Mickey Mouse - Best in Town'};
    const {printings, problems} = planPrintings([241], baseWith({slots: [iconic], cards: [mickey]}));
    expect(problems).toEqual([]);
    expect(printings.map(({number, id, rarity, base}) => [number, id, rarity, base.id])).toEqual([[241, 14241, 'Iconic', 14023]]);
  });

  it('plans each number once, in collector-number order', () => {
    expect(planPrintings([239, 215, 239], baseWith()).printings.map((p) => p.number)).toEqual([215, 239]);
  });

  it('refuses a number inside the main set', () => {
    expect(planPrintings([117], baseWith()).problems).toEqual([expect.stringMatching(/^#117: .*main set \(1-204\)/)]);
  });

  it('refuses a slot illumineertales.com has not revealed', () => {
    expect(planPrintings([205], baseWith()).problems).toEqual([expect.stringMatching(/^#205: .*not revealed/)]);
  });

  it('says so when the slot is revealed but its entry cannot be read', () => {
    const nameless = {...SLOT_239, name: ''};
    expect(planPrintings([239], baseWith({slots: [SLOT_215, nameless]})).problems).toEqual([
      expect.stringMatching(/^#239: .*could not be read/),
    ]);
  });

  it('refuses a revealed slot that is not an Epic, Enchanted or Iconic', () => {
    const blank = {...SLOT_239, rarity: ''};
    expect(planPrintings([239], baseWith({slots: [blank]})).problems).toEqual([
      expect.stringMatching(/^#239: .*rarity is ""/),
    ]);
  });

  it('refuses a printing whose official reveal is not in English', () => {
    expect(planPrintings([213], baseWith()).problems).toEqual([expect.stringMatching(/^#213: .*not in English/)]);
  });

  it('refuses a printing whose base card is not in the preview data', () => {
    expect(planPrintings([239], baseWith({cards: [HECTOR, JUDY]})).problems).toEqual([
      expect.stringMatching(/^#239: no Set 14 card named "Tiana - Party Hostess"/),
    ]);
  });

  it("looks for the base card in the season's set only", () => {
    const lastSeason = {...TIANA, id: 13196, setCode: '13', number: 196};
    expect(planPrintings([239], baseWith({cards: [lastSeason]})).problems).toEqual([
      expect.stringMatching(/^#239: no Set 14 card named "Tiana - Party Hostess"/),
    ]);
  });

  it('refuses a base name two cards share', () => {
    const twin = {...TIANA, id: 14999, number: undefined};
    expect(planPrintings([239], baseWith({cards: [TIANA, twin]})).problems).toEqual([
      expect.stringMatching(/^#239: .*"Tiana - Party Hostess" \(14196, 14999\)/),
    ]);
  });

  it('refuses an id a printing in previewCards.json already has', () => {
    expect(planPrintings([206], baseWith()).problems).toEqual([
      expect.stringMatching(/^#206: id 14206 is already Judy Hopps - Always Vigilant's Epic in previewCards\.json/),
    ]);
  });

  it('refuses an id a card or printing in allCards.json already has', () => {
    const card = {...THE_QUEEN, id: 14215, variants: []};
    const printing = {...THE_QUEEN, variants: [{...THE_QUEEN.variants[0], id: 14239}]};
    expect(planPrintings([215, 239], baseWith({canonical: [card, printing]})).problems).toEqual([
      expect.stringMatching(/^#215: id 14215 is already The Queen - Conceited Ruler in allCards\.json/),
      expect.stringMatching(/^#239: id 14239 is already The Queen - Conceited Ruler's Epic in allCards\.json/),
    ]);
  });

  it('refuses an id whose art the app already has, either size', () => {
    expect(planPrintings([215, 239], baseWith({avifs: [...APP_AVIFS, '14215.avif', '14239-sm.avif']})).problems).toEqual([
      expect.stringMatching(/^#215: .*already has 14215\.avif/),
      expect.stringMatching(/^#239: .*already has 14239-sm\.avif/),
    ]);
  });

  it('refuses a base card that already has a printing of that rarity', () => {
    const enchanted = {...TIANA, variants: [{id: 14240, rarity: 'Enchanted', number: 240}]};
    expect(planPrintings([239], baseWith({cards: [enchanted]})).problems).toEqual([
      expect.stringMatching(/^#239: Tiana - Party Hostess \(14196\) already has an Enchanted \(#240\)/),
    ]);
  });

  it('refuses two printings of one rarity for the same base card', () => {
    const again = {...SLOT_239, set_number: 240};
    expect(planPrintings([239, 240], baseWith({slots: [SLOT_239, again]})).problems).toEqual([
      expect.stringMatching(/^#240: Tiana - Party Hostess \(14196\) already has an Enchanted \(#239\)/),
    ]);
  });

  it('lists every refused printing, not only the first', () => {
    const {problems} = planPrintings([205, 213, 215], baseWith());
    expect(problems.map((problem) => problem.slice(0, 5))).toEqual(['#205:', '#213:']);
  });
});

const PREVIEW = `{
  "metadata": {
    "language": "en"
  },
  "cards": [
    {
      "id": 14021,
      "fullName": "Miguel Rivera - Street Musician",
      "lore": 1,
      "variants": [
        {
          "id": 14224,
          "rarity": "Enchanted",
          "number": 224
        }
      ]
    },
    {
      "id": 14117,
      "fullName": "Hector Rivera - Street Musician",
      "lore": 1
    }
  ]
}
`;

describe('addVariants', () => {
  it("appends a variants array last on a base card, and adds to one in collector-number order", () => {
    const miguelEpic = {number: 210, id: 14210, rarity: 'Epic', base: {id: 14021}};
    expect(addVariants(PREVIEW, [miguelEpic, HECTOR_EPIC])).toBe(`{
  "metadata": {
    "language": "en"
  },
  "cards": [
    {
      "id": 14021,
      "fullName": "Miguel Rivera - Street Musician",
      "lore": 1,
      "variants": [
        {
          "id": 14210,
          "rarity": "Epic",
          "number": 210
        },
        {
          "id": 14224,
          "rarity": "Enchanted",
          "number": 224
        }
      ]
    },
    {
      "id": 14117,
      "fullName": "Hector Rivera - Street Musician",
      "lore": 1,
      "variants": [
        {
          "id": 14215,
          "rarity": "Epic",
          "number": 215
        }
      ]
    }
  ]
}
`);
  });

  it('refuses a file the JSON writer would reformat, so the diff never rewrites it', () => {
    expect(() => addVariants(PREVIEW.trimEnd(), [HECTOR_EPIC])).toThrow(UsageError);
    expect(() => addVariants(PREVIEW.replaceAll('  ', '    '), [HECTOR_EPIC])).toThrow(/previewCards\.json/);
  });

  it('throws rather than drop a printing whose base card is missing', () => {
    expect(() => addVariants(PREVIEW, [TIANA_ENCHANTED])).toThrow(/14196/);
  });
});

describe('describePrintings', () => {
  it("writes #689's PR for two printings, flagging a base card the app spells differently", () => {
    const pr = describePrintings([HECTOR_EPIC, TIANA_ENCHANTED], SEASON);
    expect(pr.branch).toBe('reveals/set14-variants-215-239');
    expect(pr.title).toBe('feat(reveals): add the Epic of Héctor Rivera and the Enchanted of Tiana (215, 239)');
    expect(pr.body).toBe(`Adds two newly revealed printings as variants of their base cards. Neither is a separate card.

| Printing | Base card | Variant entry | Scan |
|---|---|---|---|
| Héctor Rivera - Street Musician, Epic 215/204 | \`14117\` | \`{"id": 14215, "rarity": "Epic", "number": 215}\` | English |
| Tiana - Party Hostess, Enchanted 239/204 | \`14196\` | \`{"id": 14239, "rarity": "Enchanted", "number": 239}\` | English |

Each comes with \`card-images-preview/{id}.avif\` and \`{id}-sm.avif\`, converted with the app's own \`convert-preview-images\` script from the printing's official scan. illumineertales.com lists both as revealed, in English. Staged and published with admin's \`scripts/reveal-sync/variants.mjs\` (REVEAL_RUNBOOK, "Variant printings from admin").

The scans are used unchanged. \`PrintingCarousel\` clips them at \`RADIUS.xl\` (14px), which covers an official scan's printed corners at the size the art is shown.

**Follow-ups**
- When LorcanaJSON adds these printings, \`pnpm sync-variants\` will report that the preview AVIFs shadow the official art. Delete those files then.
- The app spells 14117 \`Hector Rivera - Street Musician\`, but illumineertales.com spells the Epic \`Héctor Rivera - Street Musician\`. \`sync-variants\` matches preview cards on set and full name, so if LorcanaJSON keeps that spelling it will list this Epic as unmatched until the two names agree.
- \`pnpm precompute-synergies\` wasn't run, because this PR was made through the GitHub API. Variants add no cards, and its output (\`data/synergies/\`, \`featuredCards.json\`) is git-ignored, so there is nothing else to commit.`);
  });

  it('writes a commit message naming each base card, wrapped for git', () => {
    const [subject, blank, ...body] = describePrintings([HECTOR_EPIC, TIANA_ENCHANTED], SEASON).message.split('\n');
    expect([subject, blank]).toEqual(['feat(reveals): add two Set 14 variant printings (215, 239)', '']);
    expect(body.join(' ')).toBe(
      "Variant printings from admin's scripts/reveal-sync/variants.mjs, each folded into its base card: Hector Rivera - Street Musician's Epic 14215 into 14117 and Tiana - Party Hostess's Enchanted 14239 into 14196. The art is each printing's official English scan from illumineertales.com.",
    );
    expect(body.every((line) => line.length <= 72)).toBe(true);
  });

  it('groups the title by rarity, as #687 did', () => {
    const printing = (number, rarity, name) => ({...TIANA_ENCHANTED, number, id: 14000 + number, rarity, name});
    const printings = [printing(206, 'Epic', 'Judy Hopps'), printing(230, 'Enchanted', 'Belle'), printing(237, 'Enchanted', 'Baymax')];
    const pr = describePrintings(printings, SEASON);
    expect(pr.title).toBe('feat(reveals): add the Epic of Judy Hopps and the Enchanteds of Belle and Baymax (206, 230, 237)');
    expect(pr.body).toMatch(/^Adds three newly revealed printings as variants of their base cards\. None is a separate card\./);
    expect(pr.body).toMatch(/lists all three as revealed/);
  });

  // 2026-10-01's batch: seven Epics and three Enchanteds. Named, the title ran to 213 characters.
  it('counts a big batch by rarity in the title, and leaves the numbers out of a long commit subject', () => {
    const numbers = [205, 208, 210, 211, 214, 219, 222, 228, 229, 240];
    const printings = numbers.map((number) => ({...TIANA_ENCHANTED, number, id: 14000 + number, rarity: number <= 222 ? 'Epic' : 'Enchanted'}));
    const pr = describePrintings(printings, SEASON);
    expect(pr.title).toBe('feat(reveals): add seven Epics and three Enchanteds (205, 208, 210, 211, 214, 219, 222, 228, 229, 240)');
    expect(pr.message.split('\n')[0]).toBe('feat(reveals): add ten Set 14 variant printings');
  });

  it("keeps the title within GitHub's 256 characters, even for every slot of a set", () => {
    const rarityOf = (number) => (number <= 222 ? 'Epic' : number <= 240 ? 'Enchanted' : 'Iconic');
    const printings = Array.from({length: 38}, (_, i) => 205 + i).map((number) => ({
      ...TIANA_ENCHANTED,
      number,
      id: 14000 + number,
      rarity: rarityOf(number),
    }));
    expect(describePrintings(printings, SEASON).title).toBe('feat(reveals): add 18 Epics, 18 Enchanteds and two Iconics');
  });

  it('speaks of one printing in the singular, and adds no spelling note when the names agree', () => {
    const pr = describePrintings([TIANA_ENCHANTED], SEASON);
    expect(pr.message.split('\n')[0]).toBe('feat(reveals): add one Set 14 variant printing (239)');
    expect(pr.body).toMatch(/^Adds one newly revealed printing as a variant of its base card\. It is not a separate card\./);
    expect(pr.body).toMatch(/lists it as revealed/);
    expect(pr.body).toMatch(/When LorcanaJSON adds this printing,/);
    expect(pr.body).not.toMatch(/spells/);
  });
});
