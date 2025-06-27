import type { Genders, Orientations } from "~types/entities.types"
import {
  calculateAge,
  calculateAverage,
  classifySingleGender,
  classifySingleOrientation,
} from "./demographics-utils"

type DemographicRow = {
  date_of_birth: string | null
  gender: Array<Genders | string> | null
  is_veteran: boolean | null
  orientation: Array<Orientations | string> | null
  where_lives?: string | null
}

type OtherCategoryData = {
  percentage: number
  values?: string[]
}

type Demographics = {
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
      if (row.orientation?.length) {
        let hasPrimary = false
        const others: string[] = []
        for (const o of row.orientation) {
          const types = classifySingleOrientation(o)
          for (const t of types) {
            if (t === "biPan" || t === "homo" || t === "straight") {
              acc[t]++
              hasPrimary = true
            } else if (t === "aceDemi") {
              acc.aceDemi++
            } else if (t === "other") {
              others.push(o)
            }
          }
        }
        if (!hasPrimary && others.length > 0) {
          acc.other.count++
          acc.other.others.push(...others)
        } else if (!hasPrimary && acc.aceDemi === 0 && others.length === 0) {
          acc.other.count++
          acc.other.others.push("Unclassified/Multiple Not Primary")
        }
      } else {
        acc.other.count++
        acc.other.others.push("Not Provided")
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

export function calculateDemographics(rows: DemographicRow[]): Demographics {
  const total = rows.length
  const veteranCounts = countVeterans(rows)
  const genderCounts = countGenders(rows)
  const orientationCounts = countOrientations(rows)
  const ages = extractAges(rows)

  return {
    total,
    veteran: calculateVeteranPercentages(veteranCounts, total),
    gender: calculateGenderPercentages(genderCounts, total),
    orientation: calculateOrientationPercentages(orientationCounts, total),
    age: {
      average: calculateAverage(ages),
      min: ages.length ? Math.min(...ages) : null,
      max: ages.length ? Math.max(...ages) : null,
    },
  }
}
