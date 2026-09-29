import {useRef, useState} from 'react';

/** Read an uploaded image File as a base64 data URL (preview + GitHub blob). */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface ImageUpload {
  /** The chosen file, or null. */
  file: File | null;
  /** The chosen file's bytes as a data URL; null until they are read. */
  dataUrl: string | null;
  /** Why the chosen file could not be read, or null. */
  error: string | null;
  /** Choose a file (or null to clear). Resolves once its bytes are read. */
  choose: (file: File | null) => Promise<void>;
}

/**
 * The image an operator chose for a publish, and its bytes. A publish must
 * never pair one file's name with another file's bytes, so choosing or clearing
 * drops the previous bytes at once, and a read that finishes after a newer
 * choice is discarded.
 */
export function useImageUpload(): ImageUpload {
  const [file, setFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<File | null>(null);

  async function choose(next: File | null) {
    latest.current = next;
    setFile(next);
    setDataUrl(null);
    setError(null);
    if (!next) return;
    try {
      const url = await readAsDataUrl(next);
      if (latest.current === next) setDataUrl(url);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      if (latest.current === next) setError(`Could not read the image: ${reason}`);
    }
  }

  return {file, dataUrl, error, choose};
}
