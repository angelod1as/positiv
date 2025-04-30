export default function pwLog(...messages: string[]) {
  process.stdout.write(messages.join(" "))
}
