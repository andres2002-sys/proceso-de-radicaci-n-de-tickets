// Vercel serverless function handler
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  strategicClients,
  ansMatrix,
  metricasDefiniciones
} from '../src/lib/rag.mjs';
import { classifyTicket } from '../src/services/classifier.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicPath = join(__dirname, '..', 'public');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(publicPath));

const feedbackBuffer = [];

app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/api/clients', (_req, res) => {
  const normalizedClients = strategicClients.map(client => ({
    id: client.id,
    nombre: client.cliente || client.nombre,
    mrr: client.mrr_usd || client.mrr,
    caso_uso: client.caso_uso,
    estado_servicio: client.estado_servicio,
    porcentaje_usuarios_afectados: client.porcentaje_usuarios_afectados,
    incidente_critico: client.incidente_pdf,
    impacto_negocio: client.impacto_negocio
  }));
  res.json({ clients: normalizedClients });
});

app.get('/api/ans', (_req, res) => {
  res.json({
    ans_matrix: ansMatrix,
    metricas: metricasDefiniciones
  });
});

app.post('/api/tickets', async (req, res) => {
  const { title, description, client, channel } = req.body || {};
  if (!title || !description) {
    return res.status(400).json({
      error: 'title y description son obligatorios'
    });
  }

  try {
    const classification = await classifyTicket({ title, description, client, channel });
    
    const result = classification.result || {};
    const ansSla = result.sla || result.sla_objetivo || {};
    
    const slaObjetivo = {
      tiempo_primer_respuesta: ansSla.tiempo_primer_respuesta || 'N/D',
      tiempo_asistencia: ansSla.tiempo_asistencia || 'N/D',
      tiempo_objetivo_solucion: ansSla.tiempo_objetivo_solucion || 'N/D'
    };
    
    res.json({
      ticket_id: `TEMP-${Date.now()}`,
      prioridad: result.prioridad || 'P3',
      urgencia: result.urgencia || 'Media',
      impacto: result.impacto || 'Medio',
      sla_objetivo: slaObjetivo,
      justificacion: result.justificacion || result.explicacion || 'Clasificación automática basada en heurísticas y contexto histórico.',
      confianza: typeof result.confianza === 'number' ? result.confianza : 0.7,
      recomendaciones: Array.isArray(result.recomendaciones) ? result.recomendaciones : [],
      tickets_similares: (classification.matches || []).map(m => ({
        id: m.id,
        titulo: m.categoria || 'Ticket similar',
        metadata: { prioridad: m.categoria ? undefined : 'N/A', categoria: m.categoria },
        content: `Ticket ${m.id} - ${m.categoria || 'Similar'}`
      })),
      model: classification.model || 'heuristic',
      clientContext: classification.clientContext
    });
  } catch (error) {
    console.error('[POST /api/tickets] error', error);
    res.status(500).json({
      error: 'Error al clasificar el ticket',
      details: error.message
    });
  }
});

app.post('/api/feedback', (req, res) => {
  const { ticketId, correctedFields, comment } = req.body || {};
  if (!ticketId || !correctedFields) {
    return res.status(400).json({
      error: 'ticketId y correctedFields son obligatorios'
    });
  }

  const entry = {
    ticketId,
    correctedFields,
    comment: comment || '',
    createdAt: new Date().toISOString()
  };
  feedbackBuffer.push(entry);

  res.json({ ok: true, entry });
});

app.get('/api/feedback', (_req, res) => {
  res.json({ feedback: feedbackBuffer.slice(-20) });
});

// Export a handler function so the serverless runtime receives a proper (req,res) entrypoint
export default function handler(req, res) {
  // Diagnostic: ayuda a comprobar en los logs de Vercel si los datos están disponibles
  try {
    console.log('strategicClients length =', Array.isArray(strategicClients) ? strategicClients.length : 'no-array');
  } catch (e) {
    console.log('error reading strategicClients for diagnostic:', e?.message || e);
  }

  return app(req, res);
}

