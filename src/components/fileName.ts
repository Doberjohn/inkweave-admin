/**
 * The extension of a file name: the text after its last dot, lowercased. A name
 * with no dot, or one that ends in it, has none (''), so "png" is not a .png.
 * The tools commit a picked image under the name its extension claims, and
 * check its bytes against it (useImageUpload's imageProblem).
 */
export function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * The last part of a slash-separated path, its file or folder name:
 * "apps/web/public/card-images-raw" is "card-images-raw". New card names the
 * files its commit writes by the paths the commit itself uses.
 */
export function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}
