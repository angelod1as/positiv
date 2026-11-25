import { describe, expect, it, vi } from "vitest"
import { getAdminContext } from "~/business/auth/admin-context.server"
import { PERMISSIONS } from "~/business/auth/permissions"
import { loader } from "./dataviz-page"

const { ENV } = vi.hoisted(() => ({ ENV: {} as Record<string, unknown> }))
vi.mock("varlock/env", () => ({ ENV }))

vi.mock("~/business/auth/admin-context.server", async () => {
  const { PERMISSIONS } = await import("~/business/auth/permissions")
  return {
    getAdminContext: vi.fn(async () => ({
      currentProfile: {
        permissions: [PERMISSIONS.ADMIN_PANEL, PERMISSIONS.PAYMENTS_MANAGE],
      },
    })),
  }
})

// Mock the data layer functions
vi.mock("~/business/reporting/dataviz/kpi-scores.server", () => ({
  getKpiScores: vi.fn(),
}))

vi.mock("~/business/reporting/dataviz/event-metrics.server", () => ({
  getEventAttendanceData: vi.fn(),
  getEventRevenueData: vi.fn(),
  getConversionFunnelData: vi.fn(),
  getOccupancyData: vi.fn(),
  getTimingData: vi.fn(),
}))

vi.mock("~/business/reporting/dataviz/party-summary.server", () => ({
  getPartySummary: vi.fn(),
}))

vi.mock("~/business/reporting/dataviz/demographics-dataviz.server", () => ({
  getVeteranRookieData: vi.fn(),
  getDemographicsData: vi.fn(),
}))

vi.mock("~/business/reporting/dataviz/growth-retention.server", () => ({
  getGrowthData: vi.fn(),
  getRetentionData: vi.fn(),
  getSeasonalityData: vi.fn(),
}))

function makeRequest(url = "http://localhost/admin/numeros") {
  return {
    request: new Request(url),
    url: new URL(url),
    pattern: "/admin/numeros",
    params: {},
    context: {},
  }
}

describe("Numeros Page - Loader", () => {
  it("should fetch all required data in parallel", async () => {
    const { getKpiScores } = await import(
      "~/business/reporting/dataviz/kpi-scores.server"
    )
    const {
      getEventAttendanceData,
      getEventRevenueData,
      getConversionFunnelData,
      getOccupancyData,
    } = await import("~/business/reporting/dataviz/event-metrics.server")
    const { getVeteranRookieData, getDemographicsData } = await import(
      "~/business/reporting/dataviz/demographics-dataviz.server"
    )
    const { getGrowthData, getRetentionData, getSeasonalityData } =
      await import("~/business/reporting/dataviz/growth-retention.server")

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

    const result = await loader(makeRequest())

    // Verify all functions were called
    expect(getKpiScores).toHaveBeenCalledTimes(1)
    expect(getEventAttendanceData).toHaveBeenCalledTimes(1)
    expect(getEventRevenueData).toHaveBeenCalledTimes(1)
    expect(getConversionFunnelData).toHaveBeenCalledTimes(1)
    expect(getOccupancyData).toHaveBeenCalledTimes(1)
    expect(getVeteranRookieData).toHaveBeenCalledTimes(1)
    expect(getDemographicsData).toHaveBeenCalledWith("all", expect.anything())
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
      "~/business/reporting/dataviz/kpi-scores.server"
    )
    const { getDemographicsData } = await import(
      "~/business/reporting/dataviz/demographics-dataviz.server"
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

    const result = await loader(makeRequest())

    expect(result.kpiScores).toEqual(mockKpiScores)
    expect(result.demographics).toEqual(mockDemographics)
  })

  it("should handle empty data gracefully", async () => {
    const result = await loader(makeRequest())

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

  it("should fetch demographics with 'attended' mode when ?mode=attended is set", async () => {
    const { getDemographicsData } = await import(
      "~/business/reporting/dataviz/demographics-dataviz.server"
    )

    const mockAttendedDemographics = {
      gender: [{ category: "Mulher cis", count: 25, percentage: 50 }],
      orientation: [{ category: "Bi", count: 20, percentage: 40 }],
      age: [{ category: "30-34", count: 15, percentage: 30 }],
      race: [{ category: "Branca", count: 10, percentage: 20 }],
    }

    vi.mocked(getDemographicsData).mockResolvedValue(mockAttendedDemographics)

    const result = await loader(
      makeRequest("http://localhost/admin/numeros?mode=attended")
    )

    expect(getDemographicsData).toHaveBeenCalledWith("attended", expect.anything())
    expect(result.demographics).toEqual(mockAttendedDemographics)
  })

  it("should default to 'all' mode when no mode param is provided", async () => {
    const { getDemographicsData } = await import(
      "~/business/reporting/dataviz/demographics-dataviz.server"
    )

    await loader(makeRequest())

    expect(getDemographicsData).toHaveBeenCalledWith("all", expect.anything())
  })

  it("should default to 'all' mode when invalid mode param is provided", async () => {
    const { getDemographicsData } = await import(
      "~/business/reporting/dataviz/demographics-dataviz.server"
    )

    await loader(makeRequest("http://localhost/admin/numeros?mode=invalid"))

    expect(getDemographicsData).toHaveBeenCalledWith("all", expect.anything())
  })

  it("measures every query over the party range in the URL", async () => {
    const { getKpiScores } = await import(
      "~/business/reporting/dataviz/kpi-scores.server"
    )
    const { getEventRevenueData } = await import(
      "~/business/reporting/dataviz/event-metrics.server"
    )
    const { getDemographicsData, getVeteranRookieData } = await import(
      "~/business/reporting/dataviz/demographics-dataviz.server"
    )
    const { getRetentionData } = await import(
      "~/business/reporting/dataviz/growth-retention.server"
    )
    const range = {
      from: "2025-09-01T22:00:00.000Z",
      to: "2026-03-01T22:00:00.000Z",
    }

    await loader(
      makeRequest(
        `http://localhost/admin/numeros?from=${range.from}&to=${range.to}&mode=attended`
      )
    )

    expect(getKpiScores).toHaveBeenCalledWith(range)
    expect(getEventRevenueData).toHaveBeenCalledWith(range)
    expect(getVeteranRookieData).toHaveBeenCalledWith(range)
    expect(getRetentionData).toHaveBeenCalledWith(range)
    expect(getDemographicsData).toHaveBeenCalledWith("attended", range)
  })

  it("lists every party since 21/06/2025 for the selector, and only the range's for the charts", async () => {
    const { getEventAttendanceData } = await import(
      "~/business/reporting/dataviz/event-metrics.server"
    )
    const party = (title: string, date: string) => ({
      title,
      emoji: "🎉",
      date,
      inscritos: 1,
      compareceram: 1,
      nao_foram: 0,
      withdrew: 0,
      not_selected: 0,
      skipped: 0,
      rodizio: 0,
      vagas_sociais: 0,
      staff: 0,
    })
    vi.mocked(getEventAttendanceData).mockResolvedValue([
      party("Junho", "2025-06-21T22:00:00.000Z"),
      party("Setembro", "2025-09-20T22:00:00.000Z"),
    ])

    const result = await loader(
      makeRequest(
        "http://localhost/admin/numeros?from=2025-09-20T22:00:00.000Z"
      )
    )

    expect(result.parties.map((p) => p.title)).toEqual(["Junho", "Setembro"])
    expect(result.eventAttendance.map((p) => p.title)).toEqual(["Setembro"])
    expect(result.range.from).toBe("2025-09-20T22:00:00.000Z")
  })

  it("reads the report's party numbers and the timing over the range", async () => {
    const { getPartySummary } = await import(
      "~/business/reporting/dataviz/party-summary.server"
    )
    const { getTimingData } = await import(
      "~/business/reporting/dataviz/event-metrics.server"
    )

    const result = await loader(
      makeRequest("http://localhost/admin/numeros?from=2025-09-20T22:00:00.000Z")
    )

    expect(getPartySummary).toHaveBeenCalledWith(result.range)
    expect(getTimingData).toHaveBeenCalledWith(result.range)
    expect(result).toHaveProperty("partySummary")
    expect(result).toHaveProperty("timing")
  })

  it("links out to the website's Umami dashboard for behaviour", async () => {
    ENV.VITE_UMAMI_URL = "https://umami.example.com"
    ENV.VITE_UMAMI_WEBSITE_ID = "site-123"

    const result = await loader(makeRequest())

    expect(result.umamiUrl).toBe("https://umami.example.com/websites/site-123")
  })

  it("sends no revenue to a person without payments.manage", async () => {
    const { getKpiScores } = await import(
      "~/business/reporting/dataviz/kpi-scores.server"
    )
    const { getEventRevenueData } = await import(
      "~/business/reporting/dataviz/event-metrics.server"
    )
    vi.mocked(getAdminContext).mockResolvedValueOnce({
      currentProfile: { permissions: [PERMISSIONS.ADMIN_PANEL] },
    } as unknown as Awaited<ReturnType<typeof getAdminContext>>)
    vi.mocked(getKpiScores).mockResolvedValue({
      total_profiles: 100,
      total_revenue: 50000,
      avg_revenue_per_event: 5000,
    } as unknown as Awaited<ReturnType<typeof getKpiScores>>)
    vi.mocked(getEventRevenueData).mockClear()

    const result = await loader(makeRequest())

    expect(getEventRevenueData).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      canManagePayments: false,
      eventRevenue: [],
      kpiScores: {
        total_profiles: 100,
        total_revenue: 0,
        avg_revenue_per_event: 0,
      },
    })
  })
})
