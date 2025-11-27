// Serverless function for /api/tickets — accepts POST and delegates to classifier (lazy-loaded)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { title, description, client, channel } = req.body || {};
  if (!title || !description) {
    return res.status(400).json({ error: 'title y description son obligatorios' });
  }

  try {
    let classifyTicket = null;
    try {
      const classifier = await import('../src/services/classifier.mjs');
      classifyTicket = classifier.classifyTicket;
    } catch (e) {
      console.warn('[api/tickets] classifier import failed:', e?.message || e);
    }

    if (!classifyTicket) {
      // If classifier missing, return a 501 to indicate not implemented on server
      return res.status(501).json({
        error: 'Classifier not available on server',
        fallback: true
      });
    }

    const classification = await classifyTicket({ title, description, client, channel });
    const result = classification.result || {};

    const sla = result.sla || result.sla_objetivo || {};
    const sla_objetivo = {
      tiempo_primer_respuesta: sla.tiempo_primer_respuesta || 'N/D',
      tiempo_asistencia: sla.tiempo_asistencia || 'N/D',
      tiempo_objetivo_solucion: sla.tiempo_objetivo_solucion || 'N/D'
    };

    return res.json({
      ticket_id: `TEMP-${Date.now()}`,
      prioridad: result.prioridad || 'P3',
      urgencia: result.urgencia || 'Media',
      impacto: result.impacto || 'Medio',
      sla_objetivo,
      justificacion: result.justificacion || result.explicacion || 'Clasificación automática.',
      confianza: typeof result.confianza === 'number' ? result.confianza : 0.7,
      recomendaciones: Array.isArray(result.recomendaciones) ? result.recomendaciones : [],
      tickets_similares: (classification.matches || []).map(m => ({ id: m.id, titulo: m.categoria || 'Ticket similar' })),
      model: classification.model || 'heuristic',
      clientContext: classification.clientContext
    });
  } catch (err) {
    console.error('[api/tickets] error', err?.message || err);
    return res.status(500).json({ error: 'Error classifying ticket', details: String(err) });
  }
}
