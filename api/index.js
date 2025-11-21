// Vercel serverless function handler
import express from 'express';
import cors from 'cors';
import {
  strategicClients,
  ansMatrix,
  metricasDefiniciones
} from '../src/lib/rag.mjs';
import { classifyTicket } from '../src/services/classifier.mjs';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const feedbackBuffer = [];

app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/api/clients', (_req, res) => {
  const clients = strategicClients.map(c => ({
    id: c.id,
    nombre: c.cliente || c.nombre,
    mrr: c.mrr_usd || c.mrr
  }));
  res.json({ clients });
});

app.get('/api/ans', (_req, res) => {
  res.json({ ans_matrix: ansMatrix, metricas: metricasDefiniciones });
});

app.post('/api/tickets', async (req, res) => {
  const { title, description, client, channel } = req.body || {};
  if (!title || !description) {
    return res.status(400).json({ error: 'title y description son obligatorios' });
  }

  try {
    const classification = await classifyTicket({ title, description, client, channel });
    const result = classification.result || {};

    const sla = result.sla || result.sla_objetivo || {};
    const sla_objetivo = {
      tiempo_primer_respuesta: sla.tiempo_primer_respuesta || 'N/D',
      tiempo_asistencia: sla.tiempo_asistencia || 'N/D',
      tiempo_objetivo_solucion: sla.tiempo_objetivo_solucion || 'N/D'
    };

    res.json({
      ticket_id: `TEMP-${Date.now()}`,
      prioridad: result.prioridad || 'P3',
      urgencia: result.urgencia || 'Media',
      impacto: result.impacto || 'Medio',
      sla_objetivo,
      justificacion: result.justificacion || result.explicacion || 'Clasificación automática.',
      confianza: typeof result.confianza === 'number' ? result.confianza : 0.7,
      recomendaciones: Array.isArray(result.recomendaciones) ? result.recomendaciones : [],
      tickets_similares: (classification.matches || []).map(m => ({
        id: m.id,
        titulo: m.categoria || 'Ticket similar'
      })),
      model: classification.model || 'heuristic',
      clientContext: classification.clientContext
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al clasificar el ticket', details: err.message });
  }
});

app.post('/api/feedback', (req, res) => {
  const { ticketId, correctedFields, comment } = req.body || {};
  if (!ticketId || !correctedFields) {
    return res.status(400).json({ error: 'ticketId y correctedFields son obligatorios' });
  }
  const entry = { ticketId, correctedFields, comment: comment || '', createdAt: new Date().toISOString() };
  feedbackBuffer.push(entry);
  res.json({ ok: true, entry });
});

app.get('/api/feedback', (_req, res) => {
  res.json({ feedback: feedbackBuffer.slice(-20) });
});

export default app;

