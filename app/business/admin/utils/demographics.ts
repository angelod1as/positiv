import type { Genders, Orientations } from "~types/entities.types"
import {
  calculateAge,
  calculateAverage,
  classifySingleGender,
  classifySingleOrientation,
} from "./demographics-utils"

type DemographicRow = {
  date_of_birth: string | null
  gender: Array<Genders | string> | null // Can include custom strings
  is_veteran: boolean | null
  orientation: Array<Orientations | string> | null // Can include custom strings
  where_lives?: string | null
}

type OtherCategoryData = {
  percentage: number
  values?: string[]
}

type VeteranCounts = {
  yes: number
  no: number
}

type GenderCounts = {
  cis: number
  trans: number
  agender: number
  other: { count: number; others: string[] }
}

type OrientationCounts = {
  straight: number
  homo: number
  biPan: number
  aceDemi: number
  other: { count: number; others: string[] }
}

export type Demographics = {
  total: number
  veteran: { yes: number; no: number }
  gender: {
    cis: number
    trans: number
    agender: number
    other: OtherCategoryData
  }
  orientation: {
    straight: number
    homo: number
    biPan: number
    aceDemi: number
    other: OtherCategoryData
  }
  age: { average: number | null; min: number | null; max: number | null }
}

type CategoryCount = {
  count: number
  others?: string[]
}

type CountsObjectWithOthers = {
  [key: string]: number | CategoryCount
}

type PercentagesObjectWithOthers<T extends CountsObjectWithOthers> = {
  [K in keyof T]: T[K] extends number
    ? number
    : {
        percentage: number
        values?: string[]
      }
}

const calculateAllPercentages = <T extends CountsObjectWithOthers>(
  counts: T,
  totalRows: number,
): PercentagesObjectWithOthers<T> => {
  const result = {} as PercentagesObjectWithOthers<T>

  for (const [key, value] of Object.entries(counts)) {
    if (typeof value === "number") {
      const percentage =
        totalRows !== 0 ? parseFloat(((value / totalRows) * 100).toFixed(2)) : 0
      result[key as keyof T] =
        percentage as PercentagesObjectWithOthers<T>[typeof key]
    } else if (
      typeof value === "object" &&
      value !== null &&
      "count" in value
    ) {
      const categoryValue = value as CategoryCount

      const percentage =
        totalRows !== 0
          ? parseFloat(((categoryValue.count / totalRows) * 100).toFixed(2))
          : 0

      result[key as keyof T] = {
        percentage: percentage,
        values: categoryValue.others,
      } as PercentagesObjectWithOthers<T>[typeof key]
    }
  }

  return result
}

const getInitialVeteranCounts = (): VeteranCounts => ({ yes: 0, no: 0 })

const getInitialGenderCounts = (): GenderCounts => ({
  cis: 0,
  trans: 0,
  agender: 0,
  other: { count: 0, others: [] },
})

const getInitialOrientationCounts = (): OrientationCounts => ({
  straight: 0,
  homo: 0,
  biPan: 0,
  aceDemi: 0,
  other: { count: 0, others: [] },
})

const aggregateVeteranCounts = (acc: VeteranCounts, row: DemographicRow) => {
  if (row.is_veteran) {
    acc.yes++
  } else {
    acc.no++
  }
  return acc
}

const aggregateGenderCounts = (acc: GenderCounts, row: DemographicRow) => {
  if (row.gender && row.gender.length > 0) {
    const genderValue = row.gender[0]
    const primaryGenderClassification = classifySingleGender(genderValue)

    if (primaryGenderClassification === "other") {
      acc.other.count++
      acc.other.others.push(genderValue)
    } else {
      acc[primaryGenderClassification]++
    }
  } else {
    acc.other.count++
    acc.other.others.push("Not Provided")
  }
  return acc
}

const aggregateOrientationCounts = (
  acc: OrientationCounts,
  row: DemographicRow,
) => {
  if (row.orientation && row.orientation.length > 0) {
    let hasPrimaryClassification = false
    const collectedOtherOriginals: string[] = []

    for (const o of row.orientation) {
      const classifications = classifySingleOrientation(o)

      for (const c of classifications) {
        if (c === "biPan") {
          acc.biPan++
          hasPrimaryClassification = true
        } else if (c === "homo") {
          acc.homo++
          hasPrimaryClassification = true
        } else if (c === "straight") {
          acc.straight++
          hasPrimaryClassification = true
        } else if (c === "aceDemi") {
          acc.aceDemi++
        } else if (c === "other") {
          collectedOtherOriginals.push(o)
        }
      }
    }

    if (!hasPrimaryClassification && collectedOtherOriginals.length > 0) {
      acc.other.count++
      acc.other.others.push(...collectedOtherOriginals)
    } else if (
      !hasPrimaryClassification &&
      acc.aceDemi === 0 &&
      collectedOtherOriginals.length === 0
    ) {
      acc.other.count++
      acc.other.others.push("Unclassified/Multiple Not Primary")
    }
  } else {
    acc.other.count++
    acc.other.others.push("Not Provided")
  }
  return acc
}

const extractAges = (rows: DemographicRow[]): number[] => {
  return rows.flatMap((row) => {
    if (row.date_of_birth) {
      const age = calculateAge(row.date_of_birth)
      return age !== null ? [age] : []
    }
    return []
  })
}

export function calculateDemographics(rows: DemographicRow[]): Demographics {
  const totalRows = rows.length

  const veteranCounts = rows.reduce(
    aggregateVeteranCounts,
    getInitialVeteranCounts(),
  )
  const genderCounts = rows.reduce(
    aggregateGenderCounts,
    getInitialGenderCounts(),
  )
  const orientationCounts = rows.reduce(
    aggregateOrientationCounts,
    getInitialOrientationCounts(),
  )

  const ages = extractAges(rows)

  const veteranPercentages = calculateAllPercentages(veteranCounts, totalRows)
  const genderPercentages = calculateAllPercentages(genderCounts, totalRows)
  const orientationPercentages = calculateAllPercentages(
    orientationCounts,
    totalRows,
  )

  const avgAge = calculateAverage(ages)
  const minAge = ages.length ? Math.min(...ages) : null
  const maxAge = ages.length ? Math.max(...ages) : null

  return {
    total: totalRows,
    veteran: veteranPercentages,
    gender: genderPercentages,
    orientation: orientationPercentages,
    age: {
      average: avgAge,
      min: minAge,
      max: maxAge,
    },
  }
}
