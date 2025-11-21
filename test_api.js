// Script de prueba rápida de la API
const API_BASE = 'http://localhost:4000/api';

async function testAPI() {
  console.log('🧪 Probando API de Ticket Triage Copilot...\n');

  // Test 1: Health check
  try {
    const health = await fetch(`${API_BASE.replace('/api', '')}/health`);
    const healthData = await health.json();
    console.log('✅ Health check:', healthData);
  } catch (error) {
    console.error('❌ Health check falló:', error.message);
    return;
  }

  // Test 2: Obtener clientes
  try {
    const clients = await fetch(`${API_BASE}/clients`);
    const clientsData = await clients.json();
    console.log(`\n✅ Clientes cargados: ${clientsData.clients?.length || 0}`);
    if (clientsData.clients?.length > 0) {
      console.log('   Primer cliente:', clientsData.clients[0].nombre);
    }
  } catch (error) {
    console.error('❌ Error cargando clientes:', error.message);
  }

  // Test 3: Clasificar ticket
  try {
    const ticket = {
      title: 'API de validación no responde - Error 500',
      description: 'Clientes reportan que el endpoint /api/v2/identity/validate retorna error 500. Afecta a todos los usuarios en producción desde las 14:30.',
      client: 'TechFin Solutions',
      channel: 'email'
    };

    console.log('\n📝 Clasificando ticket de prueba...');
    const response = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket)
    });

    const result = await response.json();
    console.log('\n✅ Clasificación exitosa:');
    console.log('   Prioridad:', result.prioridad);
    console.log('   Urgencia:', result.urgencia);
    console.log('   Impacto:', result.impacto);
    console.log('   Confianza:', (result.confianza * 100).toFixed(0) + '%');
    console.log('   SLA Primera Respuesta:', result.sla_objetivo?.tiempo_primer_respuesta);
  } catch (error) {
    console.error('❌ Error clasificando ticket:', error.message);
  }

  console.log('\n✨ Pruebas completadas!\n');
  console.log('🌐 Abre http://localhost:4000 en tu navegador para usar la interfaz web.');
}

testAPI().catch(console.error);

