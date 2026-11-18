export function buildDetailsId(id: string, repository?: string): string {
  return !process.env.TMC_SERVER_URL && repository ? `${repository}/${id}` : id;
}

// "/" cannot live in a single exported path segment, and "~" is not used in TM IDs
const SEGMENT_SEPARATOR = '~';

export function encodeDetailsId(id: string): string {
  return encodeURIComponent(id.replaceAll('/', SEGMENT_SEPARATOR));
}

export function decodeDetailsId(id: string): string {
  return decodeURIComponent(id).replaceAll(SEGMENT_SEPARATOR, '/');
}

export function buildDetailsPath(id: string, image = false, repository?: string): string {
  return `/details/${encodeDetailsId(buildDetailsId(id, repository))}${image ? '/image' : ''}`;
}
