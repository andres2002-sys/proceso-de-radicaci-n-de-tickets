// API Configuration - Auto-detect environment
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:4000/api'
  : '/api';

// State
let currentClassification = null;
let clients = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadClients();
    setupEventListeners();
});

// Load clients from API
async function loadClients() {
    // First, try the API endpoint. If it fails or returns non-JSON (HTML 404 page), fall back to the static JSON in /public
    const clientSelect = document.getElementById('client-select');
    clientSelect.innerHTML = '<option value="">Seleccione un cliente...</option>';

    async function populateClients(list) {
        clients = list || [];
        clients.forEach(client => {
            const option = document.createElement('option');
            // Use existing field names: some sources use "cliente" or "nombre"; normalize
            const name = client.nombre || client.cliente || client.id || 'Cliente';
            const mrr = client.mrr || client.mrr_usd || 0;
            option.value = name;
            option.textContent = `${name} (MRR: $${Number(mrr).toLocaleString()})`;
            clientSelect.appendChild(option);
        });
    }

    try {
        const response = await fetch(`${API_BASE_URL}/clients`);
        // If response is OK but not JSON, response.json() will throw — handle that below
        if (response.ok) {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const data = await response.json();
                await populateClients(data.clients || []);
                return;
            } else {
                console.warn('API returned non-JSON content, falling back to static file. content-type=', contentType);
            }
        } else {
            console.warn('API returned status', response.status, 'falling back to static file');
        }
    } catch (error) {
        console.warn('Error fetching /api/clients, falling back to static file:', error && error.message ? error.message : error);
    }

    // Fallback to static file served from /public
    try {
        const fallback = await fetch('/support_clients.json');
        if (fallback.ok) {
            const data = await fallback.json();
            await populateClients(data.clients || []);
            return;
        } else {
            console.error('Fallback static file returned status', fallback.status);
        }
    } catch (err) {
        console.error('Fallback loadClients error:', err);
    }
}

// Setup event listeners
function setupEventListeners() {
    const ticketForm = document.getElementById('ticket-form');
    ticketForm.addEventListener('submit', handleTicketSubmit);
    
    const clientSelect = document.getElementById('client-select');
    clientSelect.addEventListener('change', handleClientChange);
    
    const confirmBtn = document.getElementById('confirm-btn');
    confirmBtn.addEventListener('click', handleConfirm);
    
    const correctBtn = document.getElementById('correct-btn');
    correctBtn.addEventListener('click', handleCorrect);
    
    const modalClose = document.getElementById('modal-close');
    modalClose.addEventListener('click', closeModal);
    
    const cancelCorrection = document.getElementById('cancel-correction');
    cancelCorrection.addEventListener('click', closeModal);
    
    const correctionForm = document.getElementById('correction-form');
    correctionForm.addEventListener('submit', handleCorrectionSubmit);
}

// Handle client selection
function handleClientChange(e) {
    const clientName = e.target.value;
    const clientInfo = document.getElementById('client-info');
    
    if (!clientName) {
        clientInfo.classList.add('hidden');
        return;
    }
    // The client objects may use either `nombre` or `cliente` as the name field
    const client = clients.find(c => (c.nombre || c.cliente || c.id) === clientName);
    if (client) {
        const name = client.nombre || client.cliente || client.id || 'Cliente';
        const mrr = client.mrr || client.mrr_usd || 0;
        clientInfo.classList.remove('hidden');
        clientInfo.innerHTML = `
            <strong>Cliente:</strong> ${name}<br>
            <strong>MRR:</strong> $${Number(mrr).toLocaleString()} | 
            <strong>Estado:</strong> ${client.estado_servicio || '-'} | 
            <strong>% Usuarios Afectados:</strong> ${client.porcentaje_usuarios_afectados || 0}%
        `;
    } else {
        clientInfo.classList.add('hidden');
    }
}

// Handle ticket submission
async function handleTicketSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    
    const formData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        client: document.getElementById('client-select').value || null,
        channel: document.getElementById('channel').value
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            // good path: parse JSON
            const data = await response.json();
            currentClassification = data;
            displayResults(data);
        } else {
            // server returned non-OK (404/500). Fall back to client-side heuristic classification
            console.warn('API /tickets returned', response.status, '- using client-side fallback');
            const fallback = createFallbackClassification(formData);
            currentClassification = fallback;
            displayResults(fallback);
        }
    } catch (error) {
        // network or CORS or server not found: fallback
        console.warn('Error calling /api/tickets, using client-side fallback:', error && error.message ? error.message : error);
        const fallback = createFallbackClassification(formData);
        currentClassification = fallback;
        displayResults(fallback);
    } finally {
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
    }
}

// Simple client-side fallback classifier so app works when server API is unavailable
function createFallbackClassification({ title = '', description = '', client = null, channel = '' } = {}) {
    const text = `${title} ${description}`.toLowerCase();
    let prioridad = 'P3';
    let urgencia = 'Media';
    let impacto = 'Medio';

    if (/critico|crítico|pérdida|caída|down|data breach|breach|fraud/.test(text)) {
        prioridad = 'P1'; urgencia = 'Alta'; impacto = 'Crítico';
    } else if (/error grave|bloquea|falla|no funciona|incidente/.test(text)) {
        prioridad = 'P2'; urgencia = 'Alta'; impacto = 'Alto';
    } else if (/no carga|lentitud|error|timeout/.test(text)) {
        prioridad = 'P3'; urgencia = 'Media'; impacto = 'Medio';
    } else {
        prioridad = 'P4'; urgencia = 'Baja'; impacto = 'Bajo';
    }

    const confianza = 0.6; // conservative
    const justificacion = 'Clasificación provisional (modo offline). Verificar con backend.';
    const sla_objetivo = {
        tiempo_primer_respuesta: impacto === 'Crítico' ? '15 minutos' : '1 hora',
        tiempo_asistencia: impacto === 'Crítico' ? '30 minutos' : '4 horas',
        tiempo_objetivo_solucion: impacto === 'Crítico' ? '4 horas' : '5 días hábiles'
    };

    return {
        ticket_id: `LOCAL-${Date.now()}`,
        prioridad,
        urgencia,
        impacto,
        sla_objetivo,
        justificacion,
        confianza,
        recomendaciones: [],
        tickets_similares: [],
        model: 'fallback-local',
        clientContext: client || null
    };
}

// Display classification results
function displayResults(data) {
    const resultsSection = document.getElementById('results-section');
    resultsSection.classList.remove('hidden');
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Priority
    document.getElementById('priority-value').textContent = data.prioridad || '-';
    const priorityBadge = document.getElementById('priority-badge');
    priorityBadge.textContent = getPriorityLabel(data.prioridad);
    priorityBadge.className = `card-badge badge-${data.prioridad?.toLowerCase() || ''}`;
    
    // Urgency
    document.getElementById('urgency-value').textContent = data.urgencia || '-';
    const urgencyBadge = document.getElementById('urgency-badge');
    urgencyBadge.textContent = data.urgencia || '-';
    urgencyBadge.className = `card-badge badge-${data.urgencia?.toLowerCase().replace('í', 'i') || ''}`;
    
    // Impact
    document.getElementById('impact-value').textContent = data.impacto || '-';
    const impactBadge = document.getElementById('impact-badge');
    impactBadge.textContent = data.impacto || '-';
    impactBadge.className = `card-badge badge-${data.impacto?.toLowerCase().replace('í', 'i') || ''}`;
    
    // Confidence
    const confidence = data.confianza || 0;
    const confidenceBadge = document.getElementById('confidence-badge');
    confidenceBadge.textContent = `Confianza: ${(confidence * 100).toFixed(0)}%`;
    if (confidence >= 0.7) {
        confidenceBadge.className = 'confidence-badge confidence-high';
    } else if (confidence >= 0.4) {
        confidenceBadge.className = 'confidence-badge confidence-medium';
    } else {
        confidenceBadge.className = 'confidence-badge confidence-low';
    }
    
    // SLA
    if (data.sla_objetivo) {
        document.getElementById('sla-first-response').textContent = data.sla_objetivo.tiempo_primer_respuesta || '-';
        document.getElementById('sla-assistance').textContent = data.sla_objetivo.tiempo_asistencia || '-';
        document.getElementById('sla-resolution').textContent = data.sla_objetivo.tiempo_objetivo_solucion || '-';
    }
    
    // Justification
    document.getElementById('justification-text').textContent = data.justificacion || 'No disponible';
    
    // Recommendations
    if (data.recomendaciones && data.recomendaciones.length > 0) {
        const recommendationsSection = document.getElementById('recommendations-section');
        recommendationsSection.classList.remove('hidden');
        const list = document.getElementById('recommendations-list');
        list.innerHTML = '';
        data.recomendaciones.forEach(rec => {
            const li = document.createElement('li');
            li.textContent = rec;
            list.appendChild(li);
        });
    } else {
        document.getElementById('recommendations-section').classList.add('hidden');
    }
    
    // Similar tickets (RAG)
    if (data.tickets_similares && data.tickets_similares.length > 0) {
        const similarSection = document.getElementById('similar-tickets-section');
        similarSection.classList.remove('hidden');
        const list = document.getElementById('similar-tickets-list');
        list.innerHTML = '';
        data.tickets_similares.slice(0, 3).forEach(ticket => {
            const div = document.createElement('div');
            div.className = 'similar-ticket-item';
            div.innerHTML = `
                <strong>${ticket.id || 'Ticket'}</strong>: ${ticket.titulo || ticket.content?.substring(0, 100) || 'N/A'}<br>
                <small>Prioridad: ${ticket.metadata?.prioridad || 'N/A'} | Categoría: ${ticket.metadata?.categoria || 'N/A'}</small>
            `;
            list.appendChild(div);
        });
    } else {
        document.getElementById('similar-tickets-section').classList.add('hidden');
    }
    
    // Reset feedback status
    const feedbackStatus = document.getElementById('feedback-status');
    feedbackStatus.classList.add('hidden');
    feedbackStatus.textContent = '';
}

// Get priority label
function getPriorityLabel(priority) {
    const labels = {
        'P1': 'Crítica',
        'P2': 'Alta',
        'P3': 'Media',
        'P4': 'Baja'
    };
    return labels[priority] || priority;
}

// Handle confirm
async function handleConfirm() {
    if (!currentClassification) return;
    
    try {
        await fetch(`${API_BASE_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ticket_id: currentClassification.ticket_id || 'temp',
                action: 'confirmed',
                original_classification: currentClassification
            })
        });
        
        const feedbackStatus = document.getElementById('feedback-status');
        feedbackStatus.classList.remove('hidden');
        feedbackStatus.className = 'feedback-status success';
        feedbackStatus.textContent = '✓ Clasificación confirmada exitosamente';
        
    } catch (error) {
        console.error('Error confirming:', error);
        alert('Error al confirmar. Por favor, intente nuevamente.');
    }
}

// Handle correct
function handleCorrect() {
    if (!currentClassification) return;
    
    const modal = document.getElementById('correction-modal');
    modal.classList.remove('hidden');
    
    // Pre-fill form with current values
    document.getElementById('correct-priority').value = currentClassification.prioridad || 'P3';
    document.getElementById('correct-urgency').value = currentClassification.urgencia || 'Media';
}

// Close modal
function closeModal() {
    const modal = document.getElementById('correction-modal');
    modal.classList.add('hidden');
}

// Handle correction submit
async function handleCorrectionSubmit(e) {
    e.preventDefault();
    
    if (!currentClassification) return;
    
    const formData = {
        priority: document.getElementById('correct-priority').value,
        urgency: document.getElementById('correct-urgency').value,
        note: document.getElementById('correction-note').value
    };
    
    try {
        await fetch(`${API_BASE_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ticket_id: currentClassification.ticket_id || 'temp',
                action: 'corrected',
                original_classification: currentClassification,
                corrected_classification: formData
            })
        });
        
        // Update displayed values
        currentClassification.prioridad = formData.priority;
        currentClassification.urgencia = formData.urgency;
        displayResults(currentClassification);
        
        const feedbackStatus = document.getElementById('feedback-status');
        feedbackStatus.classList.remove('hidden');
        feedbackStatus.className = 'feedback-status corrected';
        feedbackStatus.textContent = `✏️ Clasificación corregida: ${formData.priority} - ${formData.urgency}${formData.note ? ' | Nota: ' + formData.note : ''}`;
        
        closeModal();
        
    } catch (error) {
        console.error('Error correcting:', error);
        alert('Error al guardar corrección. Por favor, intente nuevamente.');
    }
}

