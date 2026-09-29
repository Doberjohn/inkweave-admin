import {act, renderHook} from '@testing-library/react';
import {DeferredReader} from '../test/DeferredReader';
import {pngDataUrl, pngFile} from '../test/images';
import {isAcceptedImage, useImageUpload} from './useImageUpload';

afterEach(() => vi.unstubAllGlobals());

describe('useImageUpload', () => {
  beforeEach(() => {
    DeferredReader.reset();
    vi.stubGlobal('FileReader', DeferredReader);
  });

  it('drops the previous bytes the moment another file is chosen', async () => {
    const {result} = renderHook(() => useImageUpload());
    act(() => void result.current.choose(pngFile('a.png')));
    await DeferredReader.finish(0);
    expect(result.current.dataUrl).toBe(pngDataUrl('a.png'));

    act(() => void result.current.choose(pngFile('b.png')));
    expect(result.current.file?.name).toBe('b.png');
    expect(result.current.dataUrl).toBeNull();

    await DeferredReader.finish(1);
    expect(result.current.dataUrl).toBe(pngDataUrl('b.png'));
  });

  it('discards a read that finishes after a newer choice', async () => {
    const {result} = renderHook(() => useImageUpload());
    act(() => void result.current.choose(pngFile('a.png')));
    act(() => void result.current.choose(pngFile('b.png')));

    await DeferredReader.finish(1);
    await DeferredReader.finish(0);
    expect(result.current.file?.name).toBe('b.png');
    expect(result.current.dataUrl).toBe(pngDataUrl('b.png'));
  });

  it('clearing the choice also drops a read still in flight', async () => {
    const {result} = renderHook(() => useImageUpload());
    act(() => void result.current.choose(pngFile('a.png')));
    act(() => void result.current.choose(null));

    await DeferredReader.finish(0);
    expect(result.current.file).toBeNull();
    expect(result.current.dataUrl).toBeNull();
  });

  it('reports a file that cannot be read, with no bytes to publish', async () => {
    const {result} = renderHook(() => useImageUpload());
    act(() => void result.current.choose(pngFile('a.png')));
    await act(async () => DeferredReader.reads[0].fail());
    expect(result.current.dataUrl).toBeNull();
    expect(result.current.error).toBe('Could not read the image: read failed');
  });

  it('clears only a file it still holds', async () => {
    const {result} = renderHook(() => useImageUpload());
    const a = pngFile('a.png');
    act(() => void result.current.choose(a));
    act(() => void result.current.choose(pngFile('b.png')));

    expect(result.current.clearIf(a)).toBe(false);
    expect(result.current.file?.name).toBe('b.png');
  });
});

describe('useImageUpload with real reads', () => {
  it('refuses a file whose bytes are not an image, whatever its name', async () => {
    const {result} = renderHook(() => useImageUpload());
    await act(async () => {
      await result.current.choose(new File(['just some text'], 'card.png', {type: 'image/png'}));
    });
    expect(result.current.dataUrl).toBeNull();
    expect(result.current.error).toBe('card.png is not a JPEG, PNG or WebP image.');
  });

  it('accepts a file whose bytes start like a PNG', async () => {
    const {result} = renderHook(() => useImageUpload());
    await act(async () => {
      await result.current.choose(pngFile('card.png'));
    });
    expect(result.current.error).toBeNull();
    expect(result.current.dataUrl).toMatch(/^data:image\/png;base64,/);
  });
});

describe('isAcceptedImage', () => {
  const dataUrl = (bytes: string) => `data:application/octet-stream;base64,${btoa(bytes)}`;

  it('knows JPEG, PNG and WebP by their first bytes', () => {
    expect(isAcceptedImage(dataUrl('\xFF\xD8\xFF\xE0\x00\x10JFIF'))).toBe(true);
    expect(isAcceptedImage(dataUrl('\x89PNG\r\n\x1A\n\x00\x00\x00\x0D'))).toBe(true);
    expect(isAcceptedImage(dataUrl('RIFF\x24\x00\x00\x00WEBPVP8 '))).toBe(true);
  });

  it('refuses other bytes, and anything that is not base64', () => {
    expect(isAcceptedImage(dataUrl('GIF89a\x01\x00\x01\x00'))).toBe(false);
    expect(isAcceptedImage(dataUrl('RIFF\x24\x00\x00\x00WAVEfmt '))).toBe(false);
    expect(isAcceptedImage('data:a.png')).toBe(false);
  });
});
