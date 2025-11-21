import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const kbPath = path.join(ROOT, 'Knowledge_base.json');
const clientsPath = path.join(ROOT, 'data', 'support_clients.json');
const outputPath = path.join(ROOT, 'data', 'rag_corpus.json');

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No existe el archivo requerido: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function normalizeTicket(ticket) {
  const content = [
    `Ticket ${ticket.ticket_id}: ${ticket.titulo}`,
    ticket.descripcion,
    `Categoría: ${ticket.categoria}`,
    `Solución histórica: ${ticket.solucion}`
  ].join('\n');

  return {
    id: ticket.ticket_id,
    type: 'historical_ticket',
    content,
    metadata: {
      prioridad: ticket.prioridad,
      urgencia: ticket.urgencia,
      sla: ticket.sla,
      categoria: ticket.categoria,
      tiempo_resolucion: ticket.tiempo_resolucion
    }
  };
}

function normalizeClient(client) {
  const content = [
    `Cliente: ${client.cliente}`,
    `Caso de uso: ${client.caso_uso}`,
    `Estado del servicio: ${client.estado_servicio}`,
    `Incidente crítico: ${client.incidente_pdf}`,
    `Impacto negocio: ${client.impacto_negocio}`
  ].join('\n');

  return {
    id: client.id,
    type: 'strategic_account',
    content,
    metadata: {
      cliente: client.cliente,
      mrr_usd: client.mrr_usd,
      estado_servicio: client.estado_servicio,
      porcentaje_usuarios_afectados: client.porcentaje_usuarios_afectados
    }
  };
}

function main() {
  const kb = loadJson(kbPath);
  const supportData = loadJson(clientsPath);

  const documents = [
    ...kb.map(normalizeTicket),
    ...(supportData.clients || []).map(normalizeClient)
  ];

  const payload = {
    generated_at: new Date().toISOString(),
    total_documents: documents.length,
    ans_matrix: supportData.ans_matrix,
    metricas_definiciones: supportData.metricas_definiciones,
    documents
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Corpus RAG generado en ${outputPath} (${documents.length} documentos).`);
}

main();

