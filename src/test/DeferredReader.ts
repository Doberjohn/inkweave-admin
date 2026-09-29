import {act} from '@testing-library/react';
import {imageDataUrl} from './images';

/**
 * A FileReader stand-in whose reads finish only when a test says so, for
 * testing what happens while an image is still being read. Install it with
 * `vi.stubGlobal('FileReader', DeferredReader)` after `DeferredReader.reset()`.
 */
export class DeferredReader {
  static reads: DeferredReader[] = [];
  result: string | null = null;
  error: Error | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  file: File | null = null;

  static reset() {
    DeferredReader.reads = [];
  }

  /** Finish the nth read (0-based) and let its promise settle. */
  static async finish(n: number) {
    await act(async () => DeferredReader.reads[n].finish());
  }

  readAsDataURL(file: File) {
    this.file = file;
    DeferredReader.reads.push(this);
  }

  finish() {
    this.result = imageDataUrl(this.file?.name ?? '');
    this.onload?.();
  }

  fail() {
    this.error = new Error('read failed');
    this.onerror?.();
  }
}
