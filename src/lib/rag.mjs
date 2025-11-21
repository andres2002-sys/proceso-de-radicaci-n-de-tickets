import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const CORPUS_PATH = path.join(ROOT, 'data', 'rag_corpus.json');
const CLIENTS_PATH = path.join(ROOT, 'data', 'support_clients.json');

function safeReadJson(filePath, fallback = {}) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[rag] No se pudo leer ${filePath}: ${err.message}`);
    return fallback;
  }
}

const corpus = safeReadJson(CORPUS_PATH, { documents: [], ans_matrix: [] });
const clientTable = safeReadJson(CLIENTS_PATH, { clients: [], ans_matrix: [], metricas_definiciones: {} });

export const documents = corpus.documents || [];
export const ansMatrix = corpus.ans_matrix || clientTable.ans_matrix || [];
export const metricasDefiniciones = corpus.metricas_definiciones || clientTable.metricas_definiciones || {};
export const strategicClients = clientTable.clients || [];

export function findClientByName(name = '') {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  return strategicClients.find((client) => client.cliente.trim().toLowerCase() === normalized) || null;
}

export function getAnsByImpact(impacto) {
  return ansMatrix.find((row) => row.impacto.toLowerCase() === impacto.toLowerCase());
}

