export function encodeDetailsId(id: string): string {
  if (process.env.IS_STATIC !== 'true') return encodeURIComponent(id);

  const bytes = new TextEncoder().encode(id);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeDetailsId(id: string): string {
  if (process.env.IS_STATIC !== 'true') return decodeURIComponent(id);

  const binary = atob(id.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

export function buildDetailsPath(id: string, image = false): string {
  return `/details/${encodeDetailsId(id)}${image ? '/image' : ''}`;
}
