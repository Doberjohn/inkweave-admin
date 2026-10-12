import {useEffect, useEffectEvent} from 'react';

/** New reveal's last publish, and Edit card's read of previewCards.json. */
export interface PublishedReload {
  /** The last publish that landed, or null (RevealAdminController's result; a publish clears it as it starts). */
  published: {commitUrl: string} | null;
  /** Reads previewCards.json from the target branch again (CardEditorController's reloadFile). */
  reload: () => void;
}

/**
 * R-66: once a New reveal publish lands, Edit card reads previewCards.json
 * again, so the card just published opens at once, 15 to 20 minutes before
 * inkweave.ink serves it. Each commit reads once: the effect follows the
 * commit's link. The read is an effect event, so the new reload function each
 * render brings starts no read of its own.
 */
export function useReloadAfterPublish({published, reload}: PublishedReload): void {
  const commitUrl = published?.commitUrl ?? null;
  const onPublished = useEffectEvent(reload);
  useEffect(() => {
    if (commitUrl !== null) onPublished();
  }, [commitUrl]);
}
