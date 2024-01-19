import LZString from 'lz-string';

export const compress = (string: string) =>
  LZString.compressToBase64(string)
    .replace(/\+/g, '-') // Convert '+' to '-'.
    .replace(/\//g, '_') // Convert '/' to '_'.
    .replace(/=+$/, ''); // Remove ending '='.

const decompress = (string: string) =>
  LZString.decompressFromBase64(string.replace(/-/g, '+').replace(/_/g, '/'));

export function updateQuery(value: string) {
  try {
    const serialized = JSON.stringify(value);
    const compressed = compress(serialized);
    const encoded = encodeURIComponent(compressed);
    const hash = '?' + encoded;
    window.location.hash = hash;
  } catch (_) {
    // It's alright.
    console.warn('Failed to update query.');
  }
}

export function parseQuery() {
  try {
    const hash = document.location.hash.replace(/^#\?/, '');
    const decoded = decodeURIComponent(hash);
    const decompressed = decompress(decoded);
    return JSON.parse(decompressed ?? '');
  } catch (_) {
    return null;
  }
}
