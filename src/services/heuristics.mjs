import { resolveSlaByImpact, defaultPriorityMapping } from './ans.mjs';

function detectImpact({ description = '', porcentaje = 0, estado = '' }) {
  const text = description.toLowerCase();

  if (porcentaje >= 80 || /error\s+(500|502|503|504)/.test(text) || text.includes('producción')) {
    return 'Crítico';
  }
  if (porcentaje >= 50 || estado.toLowerCase().includes('riesgo')) {
    return 'Alto';
  }
  if (text.includes('lento') || text.includes('consulta')) {
    return 'Medio';
  }
  return 'Bajo';
}

export function classifyWithHeuristics(payload) {
  const impact = detectImpact({
    description: `${payload.title} ${payload.description}`,
    porcentaje: payload.clientContext?.porcentaje_usuarios_afectados || 0,
    estado: payload.clientContext?.estado_servicio || ''
  });

  const sla = resolveSlaByImpact(impact);
  const priorityInfo = defaultPriorityMapping(impact);

  return {
    prioridad: priorityInfo.prioridad,
    urgencia: priorityInfo.urgencia,
    impacto: impact,
    sla,
    confianza: 0.62,
    justificacion:
      'Clasificación basada en heurísticas locales (porcentaje de usuarios afectados, estado del cliente e indicadores de severidad en la descripción).',
    recomendaciones: ['Validar clasificación con un ingeniero antes de asignar.']
  };
}

