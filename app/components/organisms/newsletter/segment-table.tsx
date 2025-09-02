import type { SegmentDescription } from "~/business/admin/newsletter/newsletter-segments.server"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"

interface SegmentTableProps {
  segments: SegmentDescription[]
}

export function SegmentTable({ segments }: SegmentTableProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Segmentos de Público</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Descrição e quantidade de pessoas em cada segmento (atualizado diariamente)
        </p>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Segmento</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Pessoas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhum segmento encontrado
                </TableCell>
              </TableRow>
            ) : (
              segments.map((segment) => (
                <TableRow key={segment.segment_key}>
                  <TableCell className="font-medium">
                    {segment.segment_name}
                  </TableCell>
                  <TableCell>{segment.description}</TableCell>
                  <TableCell className="text-right">{segment.count.toLocaleString('pt-BR')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}