import OpenAI from 'openai';
import { OPENAI_API_KEY, OPENAI_MODEL } from '../config/env.mjs';
import {
  documents,
  ansMatrix,
  metricasDefiniciones,
  findClientByName
} from '../lib/rag.mjs';
import { scoreDocuments } from '../lib/similarity.mjs';
import { classifyWithHeuristics } from './heuristics.mjs';

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const DEBUG_PROMPT = process.env.DEBUG_PROMPT === 'true';

const OUTPUT_SCHEMA = `{
  "prioridad": "P1|P2|P3|P4",
  "urgencia": "Crítica|Alta|Media|Baja",
  "impacto": "Crítico|Alto|Medio|Bajo",
  "sla": {
    "tiempo_primer_respuesta": "string",
    "tiempo_asistencia": "string",
    "tiempo_objetivo_solucion": "string"
  },
  "justificacion": "string breve (<80 palabras)",
  "confianza": "valor decimal entre 0 y 1",
  "recomendaciones": ["string", "..."]
}`;

function buildContextBlock(matches) {
  if (!matches.length) return 'No hay contexto histórico disponible.';
  return matches
    .map(
      ({ doc, rating }, idx) =>
        `[#${idx + 1}] ID=${doc.id} (${doc.type})\nRelevancia: ${rating.toFixed(
          2
        )}\n${doc.content}\n`
    )
    .join('\n');
}

function buildAnsBlock() {
  const rows = ansMatrix
    .map(
      (row) =>
        `- Impacto ${row.impacto}: 1ª respuesta ${row.tiempo_primer_respuesta}, asistencia ${row.tiempo_asistencia}, solución ${row.tiempo_objetivo_solucion}`
    )
    .join('\n');
  return `Tabla ANS oficial:\n${rows}`;
}

function buildMetricsBlock() {
  return Object.entries(metricasDefiniciones || {})
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');
}

function buildPrompt({ ticket, matches, clientContext }) {
  const ansBlock = buildAnsBlock();
  const metricsBlock = buildMetricsBlock();
  const contextBlock = buildContextBlock(matches);

  const clientBlock = clientContext
    ? `Cliente estratégico:\n${JSON.stringify(clientContext, null, 2)}`
    : 'El cliente no se encuentra en la tabla estratégica.';

  return `Eres un Ingeniero de Soporte Senior responsable de clasificar tickets entrantes y asignar SLAs.

Debes utilizar la tabla ANS y las definiciones oficiales para garantizar coherencia. Respeta siempre los límites del ANS.

${ansBlock}

Definiciones clave:
${metricsBlock}

Contexto histórico (tickets y cuentas similares):
${contextBlock}

${clientBlock}

Ticket nuevo:
Título: ${ticket.title}
Descripción: ${ticket.description}
Canal: ${ticket.channel || 'no especificado'}

Entrega ÚNICAMENTE un JSON con el siguiente formato:
${OUTPUT_SCHEMA}

Requisitos adicionales:
- Si el ticket impacta a clientes en riesgo de churn o con MRR alto, eleva la prioridad al menos un nivel.
- Usa la tabla ANS para definir los tiempos exactos del campo "sla".
- El campo "confianza" debe estar entre 0 y 1.
- No agregues texto fuera del JSON.
`;
}

function safeParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch (err) {
        throw new Error(`No se pudo interpretar la respuesta del modelo: ${err.message}`);
      }
    }
    throw new Error('El modelo no devolvió JSON válido.');
  }
}

export async function classifyTicket(ticketPayload) {
  const matches = scoreDocuments(`${ticketPayload.title} ${ticketPayload.description}`, documents, 6);
  const clientContext = ticketPayload.client
    ? findClientByName(ticketPayload.client)
    : null;

  if (!openai) {
    const heuristics = classifyWithHeuristics({
      title: ticketPayload.title,
      description: ticketPayload.description,
      clientContext
    });
    return {
      model: 'heuristic',
      matches: matches.map(({ doc, rating }) => ({
        id: doc.id,
        type: doc.type,
        categoria: doc.metadata?.categoria,
        rating
      })),
      clientContext,
      result: heuristics
    };
  }

  const prompt = buildPrompt({ ticket: ticketPayload, matches, clientContext });

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'Eres un experto en clasificación de tickets de soporte. Siempre respondes en formato JSON válido.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const rawOutput = completion.choices?.[0]?.message?.content || '';

  const parsed = safeParseJson(rawOutput);

  return {
    model: OPENAI_MODEL,
    matches: matches.map(({ doc, rating }) => ({
      id: doc.id,
      type: doc.type,
      categoria: doc.metadata?.categoria,
      rating
    })),
    clientContext,
    result: parsed,
    debug: DEBUG_PROMPT ? { prompt } : undefined
  };
}

