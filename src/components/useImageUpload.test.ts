import {act, renderHook} from '@testing-library/react';
import {DeferredReader} from '../test/DeferredReader';
import {useImageUpload} from './useImageUpload';

const png = (name: string) => new File(['x'], name, {type: 'image/png'});

beforeEach(() => {
  DeferredReader.reset();
  vi.stubGlobal('FileReader', DeferredReader);
});

afterEach(() => vi.unstubAllGlobals());

describe('useImageUpload', () => {
  it('drops the previous bytes the moment another file is chosen', async () => {
    const {result} = renderHook(() => useImageUpload());
    act(() => void result.current.choose(png('a.png')));
    await DeferredReader.finish(0);
    expect(result.current.dataUrl).toBe('data:a.png');

    act(() => void result.current.choose(png('b.png')));
    expect(result.current.file?.name).toBe('b.png');
    expect(result.current.dataUrl).toBeNull();

    await DeferredReader.finish(1);
    expect(result.current.dataUrl).toBe('data:b.png');
  });

  it('discards a read that finishes after a newer choice', async () => {
    const {result} = renderHook(() => useImageUpload());
    act(() => void result.current.choose(png('a.png')));
    act(() => void result.current.choose(png('b.png')));

    await DeferredReader.finish(1);
    await DeferredReader.finish(0);
    expect(result.current.file?.name).toBe('b.png');
    expect(result.current.dataUrl).toBe('data:b.png');
  });

  it('clearing the choice also drops a read still in flight', async () => {
    const {result} = renderHook(() => useImageUpload());
    act(() => void result.current.choose(png('a.png')));
    act(() => void result.current.choose(null));

    await DeferredReader.finish(0);
    expect(result.current.file).toBeNull();
    expect(result.current.dataUrl).toBeNull();
  });

  it('reports a file that cannot be read, with no bytes to publish', async () => {
    const {result} = renderHook(() => useImageUpload());
    act(() => void result.current.choose(png('a.png')));
    await act(async () => DeferredReader.reads[0].fail());
    expect(result.current.dataUrl).toBeNull();
    expect(result.current.error).toBe('Could not read the image: read failed');
  });
});
