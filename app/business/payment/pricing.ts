// The fee snapshot the pricing engine works from. It is declared here, not
// beside the Asaas client, because pricing owns the shape it consumes: rates
// are fractions and money is integer cents, whatever the API happens to send.
export type AsaasFees = {
  pix: { fixed: number; percent: number }
  card: {
    fixed: number
    percentOneInstallment: number
    percentUpToSix: number
  }
  // Asaas charges two monthly anticipation rates: the detached one on a
  // single-installment card charge, the higher one on a plan of two or more.
  anticipation: {
    detachedMonthlyRate: number
    installmentMonthlyRate: number
  }
}
