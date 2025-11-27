// Serverless function for /api/clients — lazy-loads the RAG data
export default async function handler(req, res) {
  try {
    const { strategicClients } = await import('../src/lib/rag.mjs');
    const clients = (strategicClients || []).map(client => ({
      id: client.id,
      nombre: client.cliente || client.nombre,
      mrr: client.mrr_usd || client.mrr,
      caso_uso: client.caso_uso,
      estado_servicio: client.estado_servicio,
      porcentaje_usuarios_afectados: client.porcentaje_usuarios_afectados,
      incidente_critico: client.incidente_pdf,
      impacto_negocio: client.impacto_negocio
    }));

    return res.status(200).json({ clients });
  } catch (err) {
    console.error('[api/clients] error loading clients:', err?.message || err);
    return res.status(500).json({ error: 'Error loading clients', details: String(err) });
  }
}
