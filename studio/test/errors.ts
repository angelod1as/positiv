export function pathsOf(errors: { path: string }[]) {
  return errors.map((error) => error.path)
}
