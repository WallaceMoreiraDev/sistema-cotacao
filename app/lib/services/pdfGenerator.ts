export async function generateProposalPdf(_protocol: unknown) {
  return new Blob(['PDF de proposta simulado'], { type: 'application/pdf' });
}

export async function generateMissingItemsPdf(_protocol: unknown) {
  return new Blob(['PDF de lista faltante simulado'], { type: 'application/pdf' });
}
