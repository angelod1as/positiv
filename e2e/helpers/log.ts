export default function pwLog(...messages: Array<string | undefined>) {
  process.stdout.write(messages.filter(Boolean).join(" "))
}
