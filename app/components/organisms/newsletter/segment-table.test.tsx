import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SegmentTable } from "./segment-table"
import type { SegmentDescription } from "~/business/admin/newsletter/newsletter-segments.server"

describe("SegmentTable", () => {
  it("should render segment descriptions table", () => {
    const segments: SegmentDescription[] = [
      {
        segment_key: "all",
        segment_name: "Todos os inscritos",
        description: "Todos que permitiram receber emails de marketing",
        count: 150,
        updated_at: new Date().toISOString()
      },
      {
        segment_key: "admins",
        segment_name: "Administradores",
        description: "Apenas administradores do sistema",
        count: 3,
        updated_at: new Date().toISOString()
      },
      {
        segment_key: "veterans",
        segment_name: "Veteranos",
        description: "Já participou de algum evento",
        count: 75,
        updated_at: new Date().toISOString()
      },
      {
        segment_key: "newbies",
        segment_name: "Novatos",
        description: "Nunca participou de um evento",
        count: 75,
        updated_at: new Date().toISOString()
      },
      {
        segment_key: "new_registrations_30d",
        segment_name: "Novos cadastros",
        description: "Cadastrados nos últimos 30 dias",
        count: 20,
        updated_at: new Date().toISOString()
      },
      {
        segment_key: "applied_never_attended",
        segment_name: "Novatos (nunca participou)",
        description: "Se inscreveu mas nunca participou",
        count: 10,
        updated_at: new Date().toISOString()
      }
    ]

    render(<SegmentTable segments={segments} />)

    // Check table headers
    expect(screen.getByText("Segmento")).toBeInTheDocument()
    expect(screen.getByText("Descrição")).toBeInTheDocument()
    expect(screen.getByText("Pessoas")).toBeInTheDocument()

    // Check segment names
    expect(screen.getByText("Todos os inscritos")).toBeInTheDocument()
    expect(screen.getByText("Administradores")).toBeInTheDocument()
    expect(screen.getByText("Veteranos")).toBeInTheDocument()
    expect(screen.getByText("Novatos")).toBeInTheDocument()
    expect(screen.getByText("Novos cadastros")).toBeInTheDocument()
    expect(screen.getByText("Novatos (nunca participou)")).toBeInTheDocument()

    // Check descriptions
    expect(screen.getByText("Todos que permitiram receber emails de marketing")).toBeInTheDocument()
    expect(screen.getByText("Apenas administradores do sistema")).toBeInTheDocument()
    expect(screen.getByText("Já participou de algum evento")).toBeInTheDocument()
    expect(screen.getByText("Nunca participou de um evento")).toBeInTheDocument()
    expect(screen.getByText("Cadastrados nos últimos 30 dias")).toBeInTheDocument()
    expect(screen.getByText("Se inscreveu mas nunca participou")).toBeInTheDocument()

    // Check counts
    expect(screen.getByText("150")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getAllByText("75")).toHaveLength(2) // Veterans and Newbies both have 75
    expect(screen.getByText("20")).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
  })

  it("should display empty state when no segments", () => {
    render(<SegmentTable segments={[]} />)

    expect(screen.getByText("Segmento")).toBeInTheDocument()
    expect(screen.getByText("Descrição")).toBeInTheDocument()
    expect(screen.getByText("Pessoas")).toBeInTheDocument()
    expect(screen.getByText("Nenhum segmento encontrado")).toBeInTheDocument()
  })
})