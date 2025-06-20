export const chunkArray = <T>(array: T[], chunkNum = 50): T[][] => {
  return array.reduce<T[][]>((resultArr, item, index) => {
    const chunkIndex = Math.floor(index / chunkNum)

    if (!resultArr[chunkIndex]) {
      resultArr[chunkIndex] = []
    }

    resultArr[chunkIndex].push(item)

    return resultArr
  }, [])
}
