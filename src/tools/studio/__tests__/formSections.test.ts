import {describe, expect, it, vi} from 'vitest';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {RUBY_NUMBER, revealForm} from '../../../test/revealForm';
import {COST_SLIDER_MAX, SECTION_SUMMARY, costSlider, dualInk, type CostSlider} from '../formSections';

describe('SECTION_SUMMARY', () => {
  it.each<{title: string; patch: Partial<RevealCardForm>; sums: [string, string, string]}>([
    {title: 'a fresh form', patch: {}, sums: ['Unnamed', 'Amber · no rarity', 'Character · inkable · no cost']},
    {
      title: 'a filled card',
      patch: revealForm({ink2: 'Steel', inkwell: false}),
      sums: [`Mei · Red Panda · #${RUBY_NUMBER}`, 'Ruby / Steel · Rare', 'Character · uninkable · cost 4'],
    },
    {
      title: 'a card with no version',
      patch: {name: ' Stitch ', collectorNumber: '12'},
      sums: ['Stitch · #12', 'Amber · no rarity', 'Character · inkable · no cost'],
    },
  ])('sums up the identity, ink and type of $title', ({patch, sums}) => {
    const form = {...EMPTY_FORM, ...patch};
    expect([SECTION_SUMMARY.identity(form), SECTION_SUMMARY.ink(form), SECTION_SUMMARY.type(form)]).toEqual(sums);
  });

  it.each<{title: string; patch: Partial<RevealCardForm>; summary: string}>([
    {title: 'says when the card text is empty', patch: {}, summary: 'Not filled yet'},
    {
      title: 'joins the first keyword and the first line of text',
      patch: {keywords: 'Singer 5\nEvasive', fullText: 'BIG VOICE\nDraw a card.'},
      summary: 'Singer 5 · BIG VOICE',
    },
    {title: 'cuts a long line at 40 characters', patch: {fullText: 'A'.repeat(41)}, summary: `${'A'.repeat(40)}…`},
  ])('$title', ({patch, summary}) => {
    expect(SECTION_SUMMARY.text({...EMPTY_FORM, ...patch})).toBe(summary);
  });
});

describe('costSlider', () => {
  it.each<{title: string; cost: string; slider: CostSlider}>([
    {title: 'reads a blank cost as not set, with no thumb', cost: '', slider: {value: 0, unset: true, valueText: 'Not set'}},
    {title: 'treats spaces as blank', cost: '  ', slider: {value: 0, unset: true, valueText: 'Not set'}},
    {title: 'shows a cost in range as itself', cost: '7', slider: {value: 7, unset: false, valueText: undefined}},
    {title: 'shows 0 as a chosen 0', cost: '0', slider: {value: 0, unset: false, valueText: undefined}},
    {
      title: 'holds a cost above the end there, and reads the real cost',
      cost: '12',
      slider: {value: COST_SLIDER_MAX, unset: false, valueText: '12'},
    },
    {
      title: 'shows no thumb for a cost the validator refuses',
      cost: '1.5',
      slider: {value: 0, unset: true, valueText: 'Not a valid cost'},
    },
    {title: 'shows no thumb for a negative cost', cost: '-1', slider: {value: 0, unset: true, valueText: 'Not a valid cost'}},
  ])('$title ($cost)', ({cost, slider}) => {
    expect(costSlider({cost})).toEqual(slider);
  });
});

describe('dualInk', () => {
  /** The switch over a form, with spies for the state StudioForm lifts and the form's onChange. */
  function dualOver({open, ink2}: {open: boolean; ink2: RevealCardForm['ink2']}) {
    const setOpen = vi.fn();
    const onChange = vi.fn();
    return {dual: dualInk({open, setOpen, form: {...EMPTY_FORM, ink2}, onChange}), setOpen, onChange};
  }

  it('is off with nothing held and no second ink, and turns on without touching the form', () => {
    const {dual, setOpen, onChange} = dualOver({open: false, ink2: ''});
    expect(dual.on).toBe(false);
    dual.toggle();
    expect(setOpen).toHaveBeenCalledWith(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stays on while held, even with no second ink picked', () => {
    expect(dualOver({open: true, ink2: ''}).dual.on).toBe(true);
  });

  it('is on for a second ink the form already holds, and turning it off clears that ink', () => {
    const {dual, setOpen, onChange} = dualOver({open: false, ink2: 'Steel'});
    expect(dual.on).toBe(true);
    dual.toggle();
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(onChange).toHaveBeenCalledWith({ink2: ''});
  });
});
