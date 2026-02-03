import { describe, expect, it, vi } from "vitest"
import { loader } from "./dataviz-page"

// Mock the data layer functions
vi.mock("~/business/admin/dataviz/kpi-scores.server", () => ({
  getKpiScores: vi.fn(),
}))

vi.mock("~/business/admin/dataviz/event-metrics.server", () => ({
  getEventAttendanceData: vi.fn(),
  getEventRevenueData: vi.fn(),
  getConversionFunnelData: vi.fn(),
  getOccupancyData: vi.fn(),
}))

vi.mock("~/business/admin/dataviz/demographics-dataviz.server", () => ({
  getVeteranRookieData: vi.fn(),
  getDemographicsData: vi.fn(),
}))

vi.mock("~/business/admin/dataviz/growth-retention.server", () => ({
  getGrowthData: vi.fn(),
  getRetentionData: vi.fn(),
  getSeasonalityData: vi.fn(),
}))

describe("Numeros Page - Loader", () => {
  it("should fetch all required data in parallel", async () => {
    const { getKpiScores } = await import(
      "~/business/admin/dataviz/kpi-scores.server"
    )
    const {
      getEventAttendanceData,
      getEventRevenueData,
      getConversionFunnelData,
      getOccupancyData,
    } = await import("~/business/admin/dataviz/event-metrics.server")
    const { getVeteranRookieData, getDemographicsData } = await import(
      "~/business/admin/dataviz/demographics-dataviz.server"
    )
    const { getGrowthData, getRetentionData, getSeasonalityData } =
      await import("~/business/admin/dataviz/growth-retention.server")

    // Setup mocks with empty data
    vi.mocked(getKpiScores).mockResolvedValue({
      total_profiles: 0,
      total_veterans: 0,
      total_approved: 0,
      total_events_completed: 0,
      total_unique_attendees: 0,
      avg_attendance_per_event: 0,
      avg_occupancy_pct: 0,
      total_revenue: 0,
      avg_revenue_per_event: 0,
      avg_ticket_price: 0,
      total_flagged: 0,
      attended_3_plus: 0,
      attended_5_plus: 0,
      avg_no_show_rate: 0,
    })
    vi.mocked(getEventAttendanceData).mockResolvedValue([])
    vi.mocked(getEventRevenueData).mockResolvedValue([])
    vi.mocked(getConversionFunnelData).mockResolvedValue([])
    vi.mocked(getOccupancyData).mockResolvedValue([])
    vi.mocked(getVeteranRookieData).mockResolvedValue([])
    vi.mocked(getDemographicsData).mockResolvedValue({
      gender: [],
      orientation: [],
      age: [],
      race: [],
    })
    vi.mocked(getGrowthData).mockResolvedValue([])
    vi.mocked(getRetentionData).mockResolvedValue([])
    vi.mocked(getSeasonalityData).mockResolvedValue([])

    const result = await loader()

    // Verify all functions were called
    expect(getKpiScores).toHaveBeenCalledTimes(1)
    expect(getEventAttendanceData).toHaveBeenCalledTimes(1)
    expect(getEventRevenueData).toHaveBeenCalledTimes(1)
    expect(getConversionFunnelData).toHaveBeenCalledTimes(1)
    expect(getOccupancyData).toHaveBeenCalledTimes(1)
    expect(getVeteranRookieData).toHaveBeenCalledTimes(1)
    expect(getDemographicsData).toHaveBeenCalledWith("all")
    expect(getGrowthData).toHaveBeenCalledTimes(1)
    expect(getRetentionData).toHaveBeenCalledTimes(1)
    expect(getSeasonalityData).toHaveBeenCalledTimes(1)

    // Verify result structure
    expect(result).toHaveProperty("kpiScores")
    expect(result).toHaveProperty("eventAttendance")
    expect(result).toHaveProperty("eventRevenue")
    expect(result).toHaveProperty("conversionFunnel")
    expect(result).toHaveProperty("occupancy")
    expect(result).toHaveProperty("veteranRookie")
    expect(result).toHaveProperty("demographics")
    expect(result).toHaveProperty("growth")
    expect(result).toHaveProperty("retention")
    expect(result).toHaveProperty("seasonality")
  })

  it("should return correct data structure", async () => {
    const { getKpiScores } = await import(
      "~/business/admin/dataviz/kpi-scores.server"
    )
    const { getDemographicsData } = await import(
      "~/business/admin/dataviz/demographics-dataviz.server"
    )

    const mockKpiScores = {
      total_profiles: 100,
      total_veterans: 50,
      total_approved: 80,
      total_events_completed: 10,
      total_unique_attendees: 60,
      avg_attendance_per_event: 30,
      avg_occupancy_pct: 85,
      total_revenue: 50000,
      avg_revenue_per_event: 5000,
      avg_ticket_price: 150,
      total_flagged: 5,
      attended_3_plus: 20,
      attended_5_plus: 10,
      avg_no_show_rate: 15,
    }

    const mockDemographics = {
      gender: [{ category: "Mulher cis", count: 50, percentage: 50 }],
      orientation: [{ category: "Bi", count: 40, percentage: 40 }],
      age: [{ category: "30-34", count: 30, percentage: 30 }],
      race: [{ category: "Branca", count: 20, percentage: 20 }],
    }

    vi.mocked(getKpiScores).mockResolvedValue(mockKpiScores)
    vi.mocked(getDemographicsData).mockResolvedValue(mockDemographics)

    const result = await loader()

    expect(result.kpiScores).toEqual(mockKpiScores)
    expect(result.demographics).toEqual(mockDemographics)
  })

  it("should handle empty data gracefully", async () => {
    const result = await loader()

    expect(result.kpiScores).toBeDefined()
    expect(Array.isArray(result.eventAttendance)).toBe(true)
    expect(Array.isArray(result.eventRevenue)).toBe(true)
    expect(Array.isArray(result.conversionFunnel)).toBe(true)
    expect(Array.isArray(result.occupancy)).toBe(true)
    expect(Array.isArray(result.veteranRookie)).toBe(true)
    expect(result.demographics).toBeDefined()
    expect(Array.isArray(result.growth)).toBe(true)
    expect(Array.isArray(result.retention)).toBe(true)
    expect(Array.isArray(result.seasonality)).toBe(true)
  })
})
