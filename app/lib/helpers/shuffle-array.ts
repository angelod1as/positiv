/* Randomize array in-place using Durstenfeld shuffle algorithm */
export function shuffleArray<T>(original: Array<T>): Array<T> {
  const array = original.slice(0)
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}
