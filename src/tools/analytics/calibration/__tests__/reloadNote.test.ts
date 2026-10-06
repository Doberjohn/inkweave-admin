import {describe, expect, it} from 'vitest';
import {reloadNote} from '../reloadNote';

describe('reloadNote', () => {
  it('says every pending edit still applies when none was dropped', () => {
    expect(reloadNote(0)).toBe('Reloaded tuning.json. Every pending edit still applies.');
  });

  it('asks for one dropped edit to be made again', () => {
    expect(reloadNote(1)).toBe('Reloaded tuning.json. Dropped 1 edit whose value had changed: make it again.');
  });

  it('counts several dropped edits', () => {
    expect(reloadNote(3)).toBe('Reloaded tuning.json. Dropped 3 edits whose values had changed: make them again.');
  });
});
