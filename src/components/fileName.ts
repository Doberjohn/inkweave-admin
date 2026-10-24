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
