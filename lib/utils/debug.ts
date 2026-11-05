/* Debugging for development mode */
export function debug(...args: unknown[]) {
  // eslint-disable-next-line no-console
  process.env.DEBUG === 'true' && console.log(...args);
}
