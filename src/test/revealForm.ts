import {inkBlock} from '../app-bridge';
import type {RevealCardForm} from '../tools/reveal/buildPreviewCard';

/** The first number of Ruby's block: taken from the season's constants, so the fixture stays valid every season. */
export const RUBY_NUMBER = inkBlock('Ruby').first;

/**
 * A complete Ruby character with no card text. With an image name and no
 * existing ids it passes validateRevealCardForm, so each test overrides only
 * what it is about.
 */
export function revealForm(overrides: Partial<RevealCardForm> = {}): RevealCardForm {
  return {
    collectorNumber: String(RUBY_NUMBER),
    name: 'Mei',
    version: 'Red Panda',
    rarity: 'Rare',
    franchise: '',
    cost: '4',
    ink: 'Ruby',
    ink2: '',
    inkwell: true,
    type: 'Character',
    strength: '3',
    willpower: '5',
    lore: '2',
    moveCost: '',
    subtypes: '',
    keywords: '',
    fullText: '',
    scanLanguage: 'en',
    ...overrides,
  };
}
