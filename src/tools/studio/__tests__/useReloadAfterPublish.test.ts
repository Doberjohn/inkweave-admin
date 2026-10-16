import {describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useReloadAfterPublish, type PublishedReload} from '../useReloadAfterPublish';

// Two publishes that landed, as RevealAdminController's result holds them.
const FIRST = {commitUrl: 'https://github.com/Doberjohn/inkweave/commit/a1'};
const SECOND = {commitUrl: 'https://github.com/Doberjohn/inkweave/commit/b2'};

describe('useReloadAfterPublish (R-66)', () => {
  it('reads the file once per publish that lands, and never before one', () => {
    const reload = vi.fn();
    const {rerender} = renderHook((published: PublishedReload['published']) => useReloadAfterPublish({published, reload}), {
      initialProps: null as PublishedReload['published'],
    });
    expect(reload).not.toHaveBeenCalled();

    rerender(FIRST);
    expect(reload).toHaveBeenCalledOnce();
    // The same commit in a new object on a later render, and the next publish clearing it as it starts, read nothing.
    rerender({...FIRST});
    rerender(null);
    expect(reload).toHaveBeenCalledOnce();

    rerender(SECOND);
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
