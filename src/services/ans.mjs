import { ansMatrix } from '../lib/rag.mjs';

const DEFAULT_MATRIX = {
  Crítico: {
    prioridad: 'P1',
    urgencia: 'Crítica'
  },
  Alto: {
    prioridad: 'P2',
    urgencia: 'Alta'
  },
  Medio: {
    prioridad: 'P3',
    urgencia: 'Media'
  },
  Bajo: {
    prioridad: 'P4',
    urgencia: 'Baja'
  }
};

export function resolveSlaByImpact(impacto) {
  const fallback = ansMatrix.find((row) => row.impacto === impacto);
  return fallback || {
    impacto,
    tiempo_primer_respuesta: 'N/D',
    tiempo_asistencia: 'N/D',
    tiempo_objetivo_solucion: 'N/D'
  };
}

export function defaultPriorityMapping(impacto) {
  return DEFAULT_MATRIX[impacto] || DEFAULT_MATRIX.Medio;
}

