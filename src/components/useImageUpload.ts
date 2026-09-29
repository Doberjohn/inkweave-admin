import {useRef, useState} from 'react';

// How the formats the tools accept begin; WebP is a RIFF file whose type is WEBP.
const JPEG = '\xFF\xD8\xFF';
const PNG = '\x89PNG\r\n\x1A\n';

/**
 * Whether a data URL's bytes are a JPEG, PNG or WebP image. A file's name and
 * type come from its extension, so a renamed file needs its first bytes read.
 */
export function isAcceptedImage(dataUrl: string): boolean {
  const start = dataUrl.indexOf(',') + 1;
  try {
    // 16 base64 characters are the first 12 bytes.
    const head = atob(dataUrl.slice(start, start + 16));
    return head.startsWith(JPEG) || head.startsWith(PNG) || (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP');
  } catch {
    return false;
  }
}

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
  /** Clear the upload if it still holds `file`, reporting whether it did. */
  clearIf: (file: File) => boolean;
}

/**
 * The image an operator chose for a publish, and its bytes. A publish must
 * never pair one file's name with another file's bytes, so choosing or clearing
 * drops the previous bytes at once, and a read that finishes after a newer
 * choice is discarded. Bytes that are not a JPEG, PNG or WebP image are an
 * error, never a dataUrl.
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
      if (latest.current !== next) return;
      if (isAcceptedImage(url)) setDataUrl(url);
      else setError(`${next.name} is not a JPEG, PNG or WebP image.`);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      if (latest.current === next) setError(`Could not read the image: ${reason}`);
    }
  }

  function clearIf(held: File): boolean {
    if (latest.current !== held) return false;
    void choose(null);
    return true;
  }

  return {file, dataUrl, error, choose, clearIf};
}
