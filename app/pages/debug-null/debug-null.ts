/**
 * This route exists because of a Chrome DevTools error with RR7
 * https://github.com/remix-run/react-router/issues/13516
 */
export async function loader() {
  return null
}
