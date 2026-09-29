import {describe, it, expect, vi} from 'vitest';
import type {ChangeEvent} from 'react';
import {renderHook, act} from '@testing-library/react';
import {useHiddenFileInput} from './useHiddenFileInput';

describe('useHiddenFileInput', () => {
  it('hands over the picked file and empties the input, so the same file can be picked again', () => {
    const onFile = vi.fn();
    const {result} = renderHook(() => useHiddenFileInput(onFile));
    const file = new File(['x'], 'art.png', {type: 'image/png'});
    const target = {files: [file], value: 'C:\\fakepath\\art.png'};

    act(() => result.current.inputProps.onChange({target} as unknown as ChangeEvent<HTMLInputElement>));

    expect(onFile).toHaveBeenCalledWith(file);
    expect(target.value).toBe('');
  });

  it('reports focus, for the tile to show the focus ring', () => {
    const {result} = renderHook(() => useHiddenFileInput(vi.fn()));
    act(() => result.current.inputProps.onFocus());
    expect(result.current.focused).toBe(true);
    act(() => result.current.inputProps.onBlur());
    expect(result.current.focused).toBe(false);
  });
});
