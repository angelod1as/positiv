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
  return rows.reduce<{
    cis: number
    trans: number
    agender: number
    other: { count: number; others: string[] }
  }>(
    (acc, row) => {
      const gender = row.gender?.[0]
      if (gender) {
        const type = classifySingleGender(gender)
        if (type === "other") {
          acc.other.count++
          acc.other.others.push(gender)
        } else {
          acc[type]++
        }
      } else {
        acc.other.count++
        acc.other.others.push("Not Provided")
      }
      return acc
    },
    { cis: 0, trans: 0, agender: 0, other: { count: 0, others: [] } },
  )
}

function countOrientations(rows: DemographicRow[]) {
  return rows.reduce<{
    straight: number
    homo: number
    biPan: number
    aceDemi: number
    other: { count: number; others: string[] }
  }>(
    (acc, row) => {
      // Use a Set to store unique orientation types for the current person
      // This prevents double-counting if a person lists multiple orientations that
      // fall under the same primary category (e.g., "Bi" and "Pan" for "biPan").
      const personOrientationTypes = new Set<
        "straight" | "homo" | "biPan" | "aceDemi" | "other"
      >()
      const personOtherOrientationsValues: string[] = []

      if (row.orientation?.length) {
        let hasPrimaryClassification = false
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
              // Mark that we found at least one primary classification.
              // Ace/Demi is not considered a primary orientation in the context of excluding others.
              if (t !== "aceDemi") {
                hasPrimaryClassification = true
              }
            } else if (t === "other") {
              personOtherOrientationsValues.push(o)
            }
          }
        }

        // If the person has no primary classifications (straight, homo, biPan)
        // but has other orientations that fell into 'other' or 'aceDemi' alone
        if (
          !hasPrimaryClassification &&
          personOtherOrientationsValues.length > 0
        ) {
          acc.other.count++
          // Add only unique 'other' orientation values to avoid repetitions
          acc.other.others.push(
            ...Array.from(new Set(personOtherOrientationsValues)),
          )
        } else if (
          !hasPrimaryClassification &&
          personOrientationTypes.has("aceDemi") &&
          personOrientationTypes.size === 1
        ) {
          // If the only primary classification is aceDemi and there are no other classifications,
          // the original logic treated it as 'other' as well.
          acc.other.count++
          acc.other.others.push("Ace/Demi Unaccompanied (Treated as Other)")
        } else if (
          !hasPrimaryClassification &&
          personOtherOrientationsValues.length === 0
        ) {
          // If no primary orientation was found and no specific 'other' values were listed
          acc.other.count++
          acc.other.others.push("Unclassified/Multiple Not Primary")
        }
      } else {
        // If orientation was not provided
        acc.other.count++
        acc.other.others.push("Not Provided")
      }

      // Now, increment the overall counters based on the unique types identified for this person.
      // This is crucial to prevent double-counting individuals in the same category.
      for (const type of personOrientationTypes) {
        if (type === "straight") acc.straight++
        else if (type === "homo") acc.homo++
        else if (type === "biPan") acc.biPan++
        else if (type === "aceDemi") acc.aceDemi++
      }

      return acc
    },
    {
      straight: 0,
      homo: 0,
      biPan: 0,
      aceDemi: 0,
      other: { count: 0, others: [] },
    },
  )
}

function countRaceColor(rows: DemographicRow[]) {
  return rows.reduce<{
    white: number
    yellow: number
    indigenous: number
    black: number
    brown: number
    other: { count: number; others: string[] }
  }>(
    (acc, row) => {
      const raceColor = row.race_color?.[0]
      if (raceColor) {
        const type = classifySingleRaceColor(raceColor)
        if (type === "other") {
          acc.other.count++
          acc.other.others.push(raceColor)
        } else {
          acc[type]++
        }
      } else {
        acc.other.count++
        acc.other.others.push("Not Provided")
      }
      return acc
    },
    {
      white: 0,
      yellow: 0,
      indigenous: 0,
      black: 0,
      brown: 0,
      other: { count: 0, others: [] },
    },
  )
}

function extractAges(rows: DemographicRow[]): number[] {
  return rows.flatMap((row) => {
    if (row.date_of_birth) {
      const age = calculateAge(row.date_of_birth)
      return age !== null ? [age] : []
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
