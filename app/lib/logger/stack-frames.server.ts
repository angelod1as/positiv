// The frames in the app's own code say where an error came from; the frames in
// node_modules and node: internals around them do not.
export function appFrames(stack: string): string[] {
  const cwd = `${process.cwd()}/`
  const frames: string[] = []
  for (const line of stack.split("\n")) {
    const match = /^\s*at (?:.*? \()?(.+?):(\d+):\d+\)?$/.exec(line)
    if (!match) continue
    const file = match[1].replace(/^file:\/\//, "")
    if (file.startsWith("node:") || file.includes("/node_modules/")) continue
    frames.push(`${file.startsWith(cwd) ? file.slice(cwd.length) : file}:${match[2]}`)
  }
  return frames
}
