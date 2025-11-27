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
    
    const client = clients.find(c => c.nombre === clientName);
    if (client) {
        clientInfo.classList.remove('hidden');
        clientInfo.innerHTML = `
            <strong>Cliente:</strong> ${client.nombre}<br>
            <strong>MRR:</strong> $${client.mrr.toLocaleString()} | 
            <strong>Estado:</strong> ${client.estado_servicio} | 
            <strong>% Usuarios Afectados:</strong> ${client.porcentaje_usuarios_afectados}%
        `;
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
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        currentClassification = data;
        displayResults(data);
        
    } catch (error) {
        console.error('Error classifying ticket:', error);
        alert('Error al clasificar el ticket. Por favor, intente nuevamente.');
    } finally {
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
    }
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

