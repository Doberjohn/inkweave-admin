import {useEffect, useRef, useState, type DragEvent} from 'react';

/**
 * The drag carries files, as one dragged in from the desktop does; text and a
 * link carry none. A drag shows only its types until it drops: its files are
 * readable on the drop alone.
 */
function carriesFiles(data: DataTransfer | null): boolean {
  return data !== null && Array.from(data.types).includes('Files');
}

/**
 * Props for a file control that also takes a dropped file, and whether a file
 * is dragged over it, so it can show the drop target (data-dragging, as
 * useHiddenFileInput's `focused` drives data-focused). A drop hands onFile its
 * first file, as the picker does, so the same checks run. A drag that carries
 * no file is left to the browser. The target clears once the pointer leaves
 * the control, on the drop, and on a drag that ends anywhere: dragleave fires
 * as the pointer crosses into a child (the pill), after that child's
 * dragenter, so a count of the dragenters still open keeps it lit through one.
 * A page that uses it mounts useFileDropGuard too: without it, a file dropped
 * beside the control opens in the tab, leaving the page and dropping its
 * drafts.
 */
export function useFileDrop(onFile: (file: File) => void) {
  const [dragging, setDragging] = useState(false);
  const entered = useRef(0);
  const clear = () => {
    entered.current = 0;
    setDragging(false);
  };

  // A drop elsewhere, or a dragend, ends the drag without a dragleave here in some browsers.
  useEffect(() => {
    if (!dragging) return;
    const end = () => {
      entered.current = 0;
      setDragging(false);
    };
    window.addEventListener('drop', end);
    window.addEventListener('dragend', end);
    return () => {
      window.removeEventListener('drop', end);
      window.removeEventListener('dragend', end);
    };
  }, [dragging]);

  return {
    dragging,
    dropProps: {
      onDragEnter: (e: DragEvent) => {
        if (!carriesFiles(e.dataTransfer)) return;
        entered.current += 1;
        setDragging(true);
      },
      // Cancelled, the drag may drop here, under a copy cursor.
      onDragOver: (e: DragEvent) => {
        if (!carriesFiles(e.dataTransfer)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      },
      onDragLeave: (e: DragEvent) => {
        if (!carriesFiles(e.dataTransfer)) return;
        entered.current = Math.max(0, entered.current - 1);
        if (entered.current === 0) setDragging(false);
      },
      onDrop: (e: DragEvent) => {
        if (!carriesFiles(e.dataTransfer)) return;
        e.preventDefault();
        clear();
        const [file] = Array.from(e.dataTransfer.files);
        if (file) onFile(file);
      },
    },
  };
}

/**
 * While mounted, a file dragged over the page outside every control that
 * takes one can't drop there: the browser's own drop would open the file in
 * the tab, leaving the page. A control's own handler (useFileDrop) has run by
 * the time the event reaches the window, and cancelled it, so the guard
 * leaves that drag alone. A drag that carries no file is the browser's.
 */
export function useFileDropGuard(): void {
  useEffect(() => {
    const refuse = (e: globalThis.DragEvent) => {
      if (e.defaultPrevented || !carriesFiles(e.dataTransfer)) return;
      e.preventDefault();
      // A no-drop cursor, so the page doesn't look as if it takes the file.
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
    };
    window.addEventListener('dragover', refuse);
    window.addEventListener('drop', refuse);
    return () => {
      window.removeEventListener('dragover', refuse);
      window.removeEventListener('drop', refuse);
    };
  }, []);
}
