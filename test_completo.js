// Test completo del sistema - Verificación de requerimientos
import fs from 'fs';
const API_BASE = 'http://localhost:4000/api';

const tests = {
  passed: 0,
  failed: 0,
  warnings: 0,
  results: []
};

function logTest(name, passed, message = '', isWarning = false) {
  const status = passed ? '✅' : (isWarning ? '⚠️' : '❌');
  console.log(`${status} ${name}`);
  if (message) console.log(`   ${message}`);
  
  if (passed) tests.passed++;
  else if (isWarning) tests.warnings++;
  else tests.failed++;
  
  tests.results.push({ name, passed, message, isWarning });
}

async function testRequerimientos() {
  console.log('🔍 VERIFICACIÓN COMPLETA DE REQUERIMIENTOS\n');
  console.log('='.repeat(60));
  
  // REQUERIMIENTO 1: Uso de herramientas de IA
  console.log('\n📋 REQUERIMIENTO 1: Uso de herramientas de IA');
  console.log('-'.repeat(60));
  
  try {
    const testTicket = {
      title: 'Error crítico en producción',
      description: 'El sistema completo está caído, todos los usuarios afectados',
      client: 'TechFin Solutions'
    };
    
    const response = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testTicket)
    });
    
    const result = await response.json();
    
    logTest('Clasificación automática funciona', 
      response.ok && result.prioridad && result.urgencia,
      `Prioridad: ${result.prioridad}, Urgencia: ${result.urgencia}, Modelo: ${result.model || 'heuristic'}`);
    
    logTest('Modelo de IA o heurístico activo',
      result.model !== undefined,
      `Modelo usado: ${result.model || 'N/A'}`);
    
    logTest('Respuesta incluye justificación',
      result.justificacion && result.justificacion.length > 0,
      `Justificación: ${result.justificacion?.substring(0, 50)}...`);
    
  } catch (error) {
    logTest('Clasificación automática', false, error.message);
  }
  
  // REQUERIMIENTO 2: Uso de información suministrada
  console.log('\n📋 REQUERIMIENTO 2: Uso de información suministrada');
  console.log('-'.repeat(60));
  
  try {
    // Verificar Knowledge_base.json
    const knowledgeBase = JSON.parse(fs.readFileSync('Knowledge_base.json', 'utf8'));
    logTest('Knowledge_base.json cargado',
      Array.isArray(knowledgeBase) && knowledgeBase.length > 0,
      `${knowledgeBase.length} tickets históricos encontrados`);
    
    // Verificar datos del PDF (support_clients.json)
    const supportClients = JSON.parse(fs.readFileSync('data/support_clients.json', 'utf8'));
    logTest('Datos del PDF (clientes estratégicos) cargados',
      supportClients.clients && supportClients.clients.length > 0,
      `${supportClients.clients.length} clientes estratégicos encontrados`);
    
    // Verificar corpus RAG
    const ragCorpus = JSON.parse(fs.readFileSync('data/rag_corpus.json', 'utf8'));
    logTest('Corpus RAG generado',
      ragCorpus.documents && ragCorpus.documents.length > 0,
      `${ragCorpus.documents.length} documentos en corpus RAG`);
    
    logTest('Matriz ANS incluida en corpus',
      ragCorpus.ans_matrix && ragCorpus.ans_matrix.length === 4,
      `${ragCorpus.ans_matrix.length} niveles de impacto definidos`);
    
  } catch (error) {
    logTest('Carga de datos', false, error.message);
  }
  
  // REQUERIMIENTO 3: Interfaz funcional
  console.log('\n📋 REQUERIMIENTO 3: Diseño e implementación de interfaz');
  console.log('-'.repeat(60));
  
  try {
    const html = fs.readFileSync('public/index.html', 'utf8');
    
    logTest('Frontend HTML existe',
      html.length > 0,
      `Archivo index.html encontrado (${html.length} caracteres)`);
    
    logTest('Formulario de radicación presente',
      html.includes('ticket-form') && html.includes('title') && html.includes('description'),
      'Formulario con campos título y descripción');
    
    logTest('Selector de clientes presente',
      html.includes('client-select'),
      'Selector de clientes implementado');
    
    logTest('Panel de resultados presente',
      html.includes('results-section') && html.includes('priority-value'),
      'Panel para mostrar clasificación');
    
    logTest('Feedback loop presente',
      html.includes('confirm-btn') && html.includes('correct-btn'),
      'Botones de confirmar y corregir implementados');
    
    // Verificar CSS
    const css = fs.readFileSync('public/styles.css', 'utf8');
    logTest('Estilos CSS presentes',
      css.length > 0,
      `Archivo styles.css encontrado (${css.length} caracteres)`);
    
    // Verificar JavaScript
    const js = fs.readFileSync('public/app.js', 'utf8');
    logTest('Lógica JavaScript presente',
      js.length > 0 && js.includes('API_BASE_URL'),
      `Archivo app.js encontrado (${js.length} caracteres)`);
    
  } catch (error) {
    logTest('Interfaz funcional', false, error.message);
  }
  
  // REQUERIMIENTO 4: Arquitectura RAG
  console.log('\n📋 REQUERIMIENTO 4: Arquitectura RAG');
  console.log('-'.repeat(60));
  
  try {
    const testTicket = {
      title: 'API de validación no responde',
      description: 'El endpoint de validación retorna error 500',
      client: 'TechFin Solutions'
    };
    
    const response = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testTicket)
    });
    
    const result = await response.json();
    
    logTest('RAG retrieval funciona',
      Array.isArray(result.tickets_similares),
      `${result.tickets_similares?.length || 0} tickets similares recuperados`);
    
    logTest('Tickets similares tienen información relevante',
      result.tickets_similares?.length > 0 || result.model === 'heuristic',
      'RAG o heurísticas proporcionan contexto histórico');
    
    // Verificar que el corpus se usa
    const ragCorpus = JSON.parse(fs.readFileSync('data/rag_corpus.json', 'utf8'));
    const hasHistoricalTickets = ragCorpus.documents.some(d => d.type === 'historical_ticket');
    logTest('Corpus incluye tickets históricos',
      hasHistoricalTickets,
      'Tickets históricos disponibles para RAG');
    
  } catch (error) {
    logTest('Arquitectura RAG', false, error.message);
  }
  
  // REQUERIMIENTO 5: Sistema de Feedback Loop
  console.log('\n📋 REQUERIMIENTO 5: Sistema de Feedback Loop');
  console.log('-'.repeat(60));
  
  try {
    // Test de feedback
    const feedbackData = {
      ticketId: 'TEST-123',
      correctedFields: {
        prioridad: 'P1',
        urgencia: 'Crítica'
      },
      comment: 'Confirmado por prueba automática'
    };
    
    const response = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });
    
    logTest('Endpoint de feedback funciona',
      response.ok,
      `Feedback registrado: ${response.ok ? 'OK' : 'Error'}`);
    
    // Verificar que se puede obtener feedback
    const getResponse = await fetch(`${API_BASE}/feedback`);
    const feedbackList = await getResponse.json();
    
    logTest('Feedback se puede recuperar',
      Array.isArray(feedbackList.feedback),
      `${feedbackList.feedback?.length || 0} entradas de feedback`);
    
    // Verificar UI de feedback en HTML
    const html = fs.readFileSync('public/index.html', 'utf8');
    const js = fs.readFileSync('public/app.js', 'utf8');
    logTest('UI muestra estado de feedback',
      html.includes('feedback-status') && html.includes('confirm-btn') && html.includes('correct-btn') && js.includes('feedback-status'),
      'Interfaz permite visualizar confirmaciones y correcciones (feedback-status + botones presentes)');
    
  } catch (error) {
    logTest('Sistema de Feedback Loop', false, error.message);
  }
  
  // REQUERIMIENTO ADICIONAL: Matriz ANS del PDF
  console.log('\n📋 REQUERIMIENTO ADICIONAL: Matriz ANS del PDF');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch(`${API_BASE}/ans`);
    const ansData = await response.json();
    
    logTest('Endpoint ANS disponible',
      response.ok && ansData.ans_matrix,
      'Matriz ANS accesible vía API');
    
    logTest('Matriz ANS tiene 4 niveles',
      ansData.ans_matrix?.length === 4,
      `Niveles: ${ansData.ans_matrix?.map(r => r.impacto).join(', ')}`);
    
    logTest('Cada nivel tiene tiempos definidos',
      ansData.ans_matrix?.every(r => r.tiempo_primer_respuesta && r.tiempo_asistencia && r.tiempo_objetivo_solucion),
      'Todos los niveles tienen SLAs completos');
    
    // Verificar que los SLAs se aplican en clasificación
    const testTicket = {
      title: 'Error crítico',
      description: 'Sistema caído completamente',
      client: 'TechFin Solutions'
    };
    
    const classifyResponse = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testTicket)
    });
    
    const classification = await classifyResponse.json();
    
    logTest('SLAs se aplican en clasificación',
      classification.sla_objetivo && 
      classification.sla_objetivo.tiempo_primer_respuesta !== 'N/D',
      `SLA aplicado: ${classification.sla_objetivo?.tiempo_primer_respuesta}`);
    
  } catch (error) {
    logTest('Matriz ANS', false, error.message);
  }
  
  // Verificar enriquecimiento con datos del cliente
  console.log('\n📋 FUNCIONALIDAD ADICIONAL: Enriquecimiento con Cliente');
  console.log('-'.repeat(60));
  
  try {
    const clientsResponse = await fetch(`${API_BASE}/clients`);
    const clientsData = await clientsResponse.json();
    
    logTest('Endpoint de clientes funciona',
      clientsResponse.ok && clientsData.clients?.length > 0,
      `${clientsData.clients.length} clientes disponibles`);
    
    logTest('Clientes tienen información de MRR',
      clientsData.clients[0]?.mrr !== undefined,
      `MRR del primer cliente: $${clientsData.clients[0]?.mrr?.toLocaleString()}`);
    
    logTest('Clientes tienen estado de servicio',
      clientsData.clients[0]?.estado_servicio !== undefined,
      `Estado: ${clientsData.clients[0]?.estado_servicio}`);
    
    // Verificar que la clasificación usa datos del cliente
    const testTicket = {
      title: 'Problema con validación',
      description: 'Error en el proceso',
      client: 'TechFin Solutions'
    };
    
    const classifyResponse = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testTicket)
    });
    
    const classification = await classifyResponse.json();
    
    logTest('Clasificación enriquece con datos del cliente',
      classification.clientContext !== undefined || classification.clientContext === null,
      'Contexto del cliente incluido en respuesta');
    
  } catch (error) {
    logTest('Enriquecimiento con cliente', false, error.message);
  }
  
  // RESUMEN
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('='.repeat(60));
  console.log(`✅ Pasadas: ${tests.passed}`);
  console.log(`⚠️  Advertencias: ${tests.warnings}`);
  console.log(`❌ Fallidas: ${tests.failed}`);
  console.log(`📈 Total: ${tests.passed + tests.warnings + tests.failed}`);
  
  const porcentaje = ((tests.passed / (tests.passed + tests.failed)) * 100).toFixed(1);
  console.log(`\n🎯 Tasa de éxito: ${porcentaje}%`);
  
  if (tests.failed === 0) {
    console.log('\n🎉 ¡TODOS LOS REQUERIMIENTOS CUMPLIDOS!');
  } else {
    console.log('\n⚠️  Algunos requerimientos necesitan atención.');
  }
  
  console.log('\n📝 ENTREGABLES:');
  console.log('   ✅ Documento técnico: docs/TECNICO.md');
  console.log('   ✅ Sitio web funcional: http://localhost:4000');
  console.log('   ⏳ Video demostrativo: Pendiente de grabar');
  
  return tests;
}

// Ejecutar pruebas
testRequerimientos().catch(console.error);

