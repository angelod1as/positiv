import type {
  Genders,
  Orientations,
  RaceColor,
} from "~types/database/entities.types"
import {
  calculateAge,
  calculateAverage,
  classifySingleGender,
  classifySingleOrientation,
  classifySingleRaceColor,
} from "./demographics-utils"

type DemographicRow = {
  date_of_birth: string | null
  gender: Array<Genders | string> | null
  is_veteran: boolean | null
  orientation: Array<Orientations | string> | null
  where_lives?: string | null
  race_color: Array<RaceColor | string> | null
}

type OtherCategoryData = {
  percentage: number
  values?: string[]
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
  race_color: {
    white: number
    yellow: number
    indigenous: number
    black: number
    brown: number
    other: OtherCategoryData
  }
  age: { average: number | null; min: number | null; max: number | null }
}

function countVeterans(rows: DemographicRow[]) {
  return rows.reduce(
    (acc, row) => {
      if (row.is_veteran) acc.yes++
      else acc.no++
      return acc
    },
    { yes: 0, no: 0 },
  )
}

function countGenders(rows: DemographicRow[]) {
  const result = rows.reduce<{
    cis: number
    trans: number
    agender: number
    other: { count: number; othersSet: Set<string> }
  }>(
    (acc, row) => {
      const gender = row.gender?.[0] ?? "Not Provided"
      const type = classifySingleGender(gender)

      if (type === "other") {
        acc.other.count++
        acc.other.othersSet.add(gender)
      } else {
        acc[type]++
      }
      return acc
    },
    { cis: 0, trans: 0, agender: 0, other: { count: 0, othersSet: new Set<string>() } },
  )

  return {
    ...result,
    other: {
      count: result.other.count,
      others: Array.from(result.other.othersSet),
    },
  }
}

function countOrientations(rows: DemographicRow[]) {
  const ORIENTATION_PRIORITY = {
    biPan: 1,
    homo: 2,
    aceDemi: 3,
    straight: 4,
    other: 5,
  } as const

  const result = rows.reduce<{
    straight: number
    homo: number
    biPan: number
    aceDemi: number
    other: { count: number; othersSet: Set<string> }
  }>(
    (acc, row) => {
      const personOrientationTypes = new Set<
        "straight" | "homo" | "biPan" | "aceDemi" | "other"
      >()
      const personOtherOrientationsValues: string[] = []

      if (row.orientation?.length) {
        for (const o of row.orientation) {
          const classifiedTypes = classifySingleOrientation(o)
          for (const t of classifiedTypes) {
            if (
              t === "biPan" ||
              t === "homo" ||
              t === "straight" ||
              t === "aceDemi"
            ) {
              personOrientationTypes.add(t)
            } else if (t === "other") {
              personOtherOrientationsValues.push(o)
            }
          }
        }

        if (personOrientationTypes.size === 0) {
          if (personOtherOrientationsValues.length > 0) {
            acc.other.count++
            for (const value of personOtherOrientationsValues) {
              acc.other.othersSet.add(value)
            }
          } else {
            acc.other.count++
            acc.other.othersSet.add("Not Provided")
          }
        } else {
          let highestPriorityType: keyof typeof ORIENTATION_PRIORITY | null =
            null
          let lowestPriorityValue = Infinity

          for (const type of personOrientationTypes) {
            const priority = ORIENTATION_PRIORITY[type]
            if (priority < lowestPriorityValue) {
              lowestPriorityValue = priority
              highestPriorityType = type
            }
          }

          if (highestPriorityType) {
            if (highestPriorityType === "straight") acc.straight++
            else if (highestPriorityType === "homo") acc.homo++
            else if (highestPriorityType === "biPan") acc.biPan++
            else if (highestPriorityType === "aceDemi") acc.aceDemi++
          }
        }
      } else {
        acc.other.count++
        acc.other.othersSet.add("Not Provided")
      }

      return acc
    },
    {
      straight: 0,
      homo: 0,
      biPan: 0,
      aceDemi: 0,
      other: { count: 0, othersSet: new Set<string>() },
    },
  )

  return {
    ...result,
    other: {
      count: result.other.count,
      others: Array.from(result.other.othersSet),
    },
  }
}

function countRaceColor(rows: DemographicRow[]) {
  const result = rows.reduce<{
    white: number
    yellow: number
    indigenous: number
    black: number
    brown: number
    other: { count: number; othersSet: Set<string> }
  }>(
    (acc, row) => {
      const raceColor = row.race_color?.[0] ?? "Not Provided"
      const type = classifySingleRaceColor(raceColor)

      if (type === "other") {
        acc.other.count++
        acc.other.othersSet.add(raceColor)
      } else {
        acc[type]++
      }
      return acc
    },
    {
      white: 0,
      yellow: 0,
      indigenous: 0,
      black: 0,
      brown: 0,
      other: { count: 0, othersSet: new Set<string>() },
    },
  )

  return {
    ...result,
    other: {
      count: result.other.count,
      others: Array.from(result.other.othersSet),
    },
  }
}

function extractAges(rows: DemographicRow[]): number[] {
  const MIN_VALID_AGE = 1
  const MAX_VALID_AGE = 120

  return rows.flatMap((row) => {
    if (row.date_of_birth) {
      const age = calculateAge(row.date_of_birth)
      if (age !== null && age >= MIN_VALID_AGE && age <= MAX_VALID_AGE) {
        return [age]
      }
    }
    return []
  })
}

function calculateVeteranPercentages(
  counts: { yes: number; no: number },
  total: number,
): Demographics["veteran"] {
  return {
    yes: total > 0 ? parseFloat(((counts.yes / total) * 100).toFixed(2)) : 0,
    no: total > 0 ? parseFloat(((counts.no / total) * 100).toFixed(2)) : 0,
  }
}

function calculatePercentage(count: number, total: number): number {
  return total > 0 ? parseFloat(((count / total) * 100).toFixed(2)) : 0
}

function calculateGenderPercentages(
  counts: {
    cis: number
    trans: number
    agender: number
    other: { count: number; others: string[] }
  },
  total: number,
): Demographics["gender"] {
  return {
    cis: calculatePercentage(counts.cis, total),
    trans: calculatePercentage(counts.trans, total),
    agender: calculatePercentage(counts.agender, total),
    other: {
      percentage: calculatePercentage(counts.other.count, total),
      values: counts.other.others,
    },
  }
}

function calculateOrientationPercentages(
  counts: {
    straight: number
    homo: number
    biPan: number
    aceDemi: number
    other: { count: number; others: string[] }
  },
  total: number,
): Demographics["orientation"] {
  return {
    straight: calculatePercentage(counts.straight, total),
    homo: calculatePercentage(counts.homo, total),
    biPan: calculatePercentage(counts.biPan, total),
    aceDemi: calculatePercentage(counts.aceDemi, total),
    other: {
      percentage: calculatePercentage(counts.other.count, total),
      values: counts.other.others,
    },
  }
}

function calculateRaceColorPercentages(
  counts: {
    white: number
    yellow: number
    indigenous: number
    black: number
    brown: number
    other: { count: number; others: string[] }
  },
  total: number,
): Demographics["race_color"] {
  return {
    white: calculatePercentage(counts.white, total),
    yellow: calculatePercentage(counts.yellow, total),
    indigenous: calculatePercentage(counts.indigenous, total),
    black: calculatePercentage(counts.black, total),
    brown: calculatePercentage(counts.brown, total),
    other: {
      percentage: calculatePercentage(counts.other.count, total),
      values: counts.other.others,
    },
  }
}

export function calculateDemographics(rows: DemographicRow[]): Demographics {
  const total = rows.length
  const veteranCounts = countVeterans(rows)
  const genderCounts = countGenders(rows)
  const orientationCounts = countOrientations(rows)
  const raceColorCounts = countRaceColor(rows)
  const ages = extractAges(rows)

  return {
    total,
    veteran: calculateVeteranPercentages(veteranCounts, total),
    gender: calculateGenderPercentages(genderCounts, total),
    orientation: calculateOrientationPercentages(orientationCounts, total),
    race_color: calculateRaceColorPercentages(raceColorCounts, total),
    age: {
      average: calculateAverage(ages),
      min: ages.length ? Math.min(...ages) : null,
      max: ages.length ? Math.max(...ages) : null,
    },
  }
}
