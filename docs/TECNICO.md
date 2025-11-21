# Documento Técnico - Ticket Triage Copilot

## 1. Resumen Ejecutivo

Este documento describe las decisiones técnicas, arquitectónicas y de diseño tomadas para implementar el sistema de clasificación automática de tickets de soporte utilizando Inteligencia Artificial y arquitectura RAG (Retrieval-Augmented Generation).

### Objetivo
Automatizar la clasificación de tickets entrantes asignando automáticamente:
- Nivel de prioridad (P1-P4)
- Nivel de urgencia (Crítica, Alta, Media, Baja)
- Tiempo estimado de resolución (SLA) basado en matriz ANS
- Categoría y justificación

### Alcance
- Sistema funcional con frontend y backend
- Integración con OpenAI (con fallback heurístico)
- Arquitectura RAG sobre base de conocimiento histórica
- Sistema de feedback loop para correcciones manuales

---

## 2. Arquitectura General

### 2.1 Diagrama de Flujo

```
┌─────────────┐
│   Cliente   │
│  (Frontend) │
└──────┬──────┘
       │ POST /api/tickets
       │ { title, description, client }
       ▼
┌─────────────────────────────────────┐
│         Backend Express              │
│  ┌───────────────────────────────┐  │
│  │  1. Enriquecimiento Cliente   │  │
│  │     (MRR, Estado, % Afectados)│  │
│  └──────────────┬────────────────┘  │
│                 ▼                     │
│  ┌───────────────────────────────┐  │
│  │  2. RAG Retrieval            │  │
│  │     (Búsqueda Semántica)      │  │
│  └──────────────┬────────────────┘  │
│                 ▼                     │
│  ┌───────────────────────────────┐  │
│  │  3. Heurísticas (PDF)         │  │
│  │     (Ajuste por MRR/Estado)   │  │
│  └──────────────┬────────────────┘  │
│                 ▼                     │
│  ┌───────────────────────────────┐  │
│  │  4. Clasificación IA          │  │
│  │     (OpenAI o Fallback)       │  │
│  └──────────────┬────────────────┘  │
│                 ▼                     │
│  ┌───────────────────────────────┐  │
│  │  5. Aplicación Matriz ANS     │  │
│  │     (SLAs del PDF)            │  │
│  └──────────────┬────────────────┘  │
│                 ▼                     │
└─────────────────┼─────────────────────┘
                  │ JSON Response
                  ▼
         ┌─────────────────┐
         │  Frontend UI    │
         │  (Visualización)│
         └─────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Feedback Loop   │
         │  (Confirm/Correct)│
         └─────────────────┘
```

### 2.2 Componentes Principales

#### Frontend (`public/`)
- **HTML/CSS/JS vanilla**: Decisión tomada para simplicidad y fácil despliegue
- **Sin frameworks pesados**: Reduce complejidad y tiempo de carga
- **Responsive**: Adaptado para móviles y desktop

#### Backend (`src/`)
- **Express.js**: Framework ligero y rápido para APIs REST
- **Modular**: Separación clara de responsabilidades
  - `config/`: Configuración y variables de entorno
  - `lib/`: Utilidades RAG y similitud semántica
  - `services/`: Lógica de negocio (clasificación, heurísticas, ANS)

#### Datos (`data/`)
- **Knowledge_base.json**: 50 tickets históricos
- **support_clients.json**: 10 clientes estratégicos del PDF
- **rag_corpus.json**: Corpus combinado generado por script

---

## 3. Arquitectura RAG

### 3.1 Fuentes de Conocimiento

#### 3.1.1 Knowledge_base.json
- **50 tickets históricos** con campos estructurados:
  - `ticket_id`, `titulo`, `descripcion`
  - `prioridad`, `urgencia`, `sla`, `categoria`
  - `tiempo_resolucion`, `solucion`

#### 3.1.2 Documento PDF (support_clients.json)
- **10 clientes estratégicos** con:
  - `nombre`, `mrr`, `caso_uso_principal`
  - `estado_servicio` (Producción/Integración/En Riesgo)
  - `porcentaje_usuarios_afectados`
  - `incidente_critico`

#### 3.1.3 Matriz ANS
- **4 niveles de impacto** (Crítico, Alto, Medio, Bajo)
- **3 métricas de tiempo**:
  - Tiempo de Primera Respuesta
  - Tiempo de Asistencia
  - Tiempo Objetivo de Solución

### 3.2 Pipeline de Ingesta

**Script**: `scripts/ingest_data.mjs`

1. **Lectura de fuentes**:
   - Carga `Knowledge_base.json`
   - Carga `data/support_clients.json` (derivado del PDF)

2. **Normalización**:
   - Cada ticket se convierte en documento con:
     - `id`, `type`, `content` (texto descriptivo)
     - `metadata` (prioridad, categoría, etc.)

3. **Generación de corpus**:
   - Combina tickets históricos + clientes estratégicos
   - Incluye matriz ANS y definiciones
   - Guarda en `data/rag_corpus.json`

### 3.3 Retrieval Semántico

**Implementación**: `src/lib/similarity.mjs`

- **Algoritmo**: String similarity (Dice coefficient)
- **Razón**: Simplicidad y efectividad para textos cortos
- **Alternativa futura**: Embeddings vectoriales (OpenAI, Cohere)

**Proceso**:
1. Ticket nuevo → query text (título + descripción)
2. Comparación con todos los documentos del corpus
3. Top-K documentos más similares (K=5)
4. Enriquecimiento con metadatos (prioridad, categoría, cliente)

---

## 4. Sistema de Clasificación

### 4.1 Flujo de Clasificación

**Archivo**: `src/services/classifier.mjs`

#### Paso 1: Enriquecimiento de Cliente
- Si se proporciona `client`, busca en `support_clients.json`
- Extrae: `mrr`, `estado_servicio`, `%_usuarios_afectados`
- Estos datos influyen en heurísticas posteriores

#### Paso 2: RAG Retrieval
- Búsqueda semántica sobre corpus
- Recupera top-5 tickets similares
- Extrae patrones: prioridad común, categoría, solución

#### Paso 3: Aplicación de Heurísticas
**Archivo**: `src/services/heuristics.mjs`

**Reglas derivadas del PDF**:

1. **Prioridad mínima por MRR**:
   - MRR ≥ $20,000 → Mínimo P2
   - MRR ≥ $10,000 → Mínimo P3

2. **Ajuste por % usuarios afectados**:
   - ≥ 70% → Subir urgencia un nivel
   - ≥ 100% → Subir prioridad un nivel

3. **Estado de servicio**:
   - "En Riesgo de Churn" → Subir urgencia
   - "Producción" + error crítico → P1

4. **Palabras clave**:
   - "Error 500", "no responde", "caída" → P1/P2
   - "consulta", "documentación" → P4

#### Paso 4: Clasificación con IA

**Si `OPENAI_API_KEY` está disponible**:
- Usa `openai.chat.completions.create()`
- Modelo: `gpt-4o-mini` (balance costo/rendimiento)
- Prompt estructurado (ver sección 5)

**Si NO hay API key**:
- Usa clasificación heurística pura
- Combina resultados de RAG + reglas del PDF
- Calcula confianza basada en coincidencias

#### Paso 5: Aplicación de Matriz ANS
**Archivo**: `src/services/ans.mjs`

- Mapea `impacto` (Crítico/Alto/Medio/Bajo) a SLAs
- Retorna tiempos según matriz del PDF
- Considera horario laboral cuando aplica

### 4.2 Cálculo de Confianza

**Fórmula**:
```
confianza = (
  (coincidencia_heuristica * 0.4) +
  (coincidencia_rag * 0.4) +
  (coincidencia_ia * 0.2)
)
```

- **Alta confianza (≥0.7)**: Heurísticas, RAG e IA coinciden
- **Media confianza (0.4-0.7)**: Algunas discrepancias menores
- **Baja confianza (<0.4)**: Discrepancias significativas → requiere revisión manual

---

## 5. Prompting y Configuración del Modelo

### 5.1 Prompt System

**Estructura del prompt**:

```
Eres un Ingeniero de Soporte Senior especializado en clasificación de tickets.

CONTEXTO HISTÓRICO (RAG):
{{tickets_similares}}

CLIENTES ESTRATÉGICOS:
{{clientes_info}}

POLÍTICAS ANS (del documento PDF):
- Impacto Crítico: 15 min / 30 min / 4 horas
- Impacto Alto: 30 min laboral / 1 h laboral / 2 días hábiles
- Impacto Medio: 1 h laboral / 4 h laboral / 5 días hábiles
- Impacto Bajo: 4 h laboral / 1 día hábil / 10 días hábiles

TICKET NUEVO:
Título: {{title}}
Descripción: {{description}}
Cliente: {{client}} (MRR: ${{mrr}}, Estado: {{estado}}, % Afectados: {{porcentaje}})

INSTRUCCIONES:
1. Analiza el ticket considerando el contexto histórico y las políticas ANS
2. Asigna prioridad (P1-P4), urgencia (Crítica/Baja), impacto (Crítico/Bajo)
3. Justifica tu decisión
4. Proporciona recomendaciones si aplica

RESPUESTA (JSON estricto):
{
  "prioridad": "P1|P2|P3|P4",
  "urgencia": "Crítica|Alta|Media|Baja",
  "impacto": "Crítico|Alto|Medio|Bajo",
  "justificacion": "texto explicativo",
  "recomendaciones": ["rec1", "rec2"]
}
```

### 5.2 Configuración del Modelo

**Modelo elegido**: `gpt-4o-mini`

**Razones**:
- Balance costo/rendimiento
- Suficiente para tareas de clasificación estructurada
- Respuestas rápidas (<2s)
- Soporte para JSON mode

**Parámetros**:
- `temperature`: 0.3 (más determinístico)
- `max_tokens`: 500 (suficiente para respuesta estructurada)
- `response_format`: `{ type: "json_object" }` (si está disponible)

### 5.3 Fallback Heurístico

**Cuando NO hay API key**:

1. **Análisis de palabras clave**:
   - Error crítico → P1/P2
   - Performance → P2/P3
   - Consulta → P4

2. **Aplicación de reglas del PDF**:
   - MRR alto → Ajuste de prioridad
   - % afectados alto → Ajuste de urgencia

3. **Promedio de RAG**:
   - Prioridad más común en tickets similares
   - Urgencia más común

---

## 6. Justificación Tecnológica

### 6.1 Stack Tecnológico

#### Backend: Node.js + Express
**Razones**:
- ✅ Rápido desarrollo
- ✅ Ecosistema rico (OpenAI SDK, etc.)
- ✅ Fácil despliegue (Vercel, Render, etc.)
- ✅ Buen rendimiento para I/O asíncrono

**Alternativas consideradas**:
- Python + FastAPI: Más pesado, mejor para ML puro
- Go: Más complejo para prototipo rápido

#### Frontend: HTML/CSS/JS Vanilla
**Razones**:
- ✅ Sin dependencias pesadas
- ✅ Carga rápida
- ✅ Fácil de entender y modificar
- ✅ Cumple requisito de "low-code"

**Alternativas consideradas**:
- React/Vue: Más complejo para este caso
- Lovable: Requiere cuenta y puede tener limitaciones

#### IA: OpenAI GPT-4o-mini
**Razones**:
- ✅ API estable y documentada
- ✅ Soporte para JSON mode
- ✅ Costo razonable
- ✅ Fallback heurístico si no hay API key

**Alternativas consideradas**:
- Gemini: Similar, pero OpenAI más maduro
- Claude: Más costoso
- Modelos locales: Requieren infraestructura adicional

### 6.2 Arquitectura RAG

#### Retrieval: String Similarity
**Razones**:
- ✅ Implementación simple
- ✅ Sin dependencias externas
- ✅ Efectivo para textos cortos (tickets)

**Mejoras futuras**:
- Embeddings vectoriales (OpenAI text-embedding-3-large)
- Vector store (Pinecone, ChromaDB)
- Re-ranking con modelo cruzado

#### Corpus: JSON estático
**Razones**:
- ✅ Fácil de mantener
- ✅ No requiere base de datos
- ✅ Rápido para prototipo

**Mejoras futuras**:
- Base de datos (PostgreSQL + pgvector)
- Actualización incremental
- Versionado de corpus

### 6.3 Decisiones de Diseño

#### Feedback Loop: En memoria
**Razón**: Requisito indica "no necesita persistirse en BD, pero debe mostrarse visualmente"

**Implementación**: Array en memoria (`feedbackBuffer`)

**Mejora futura**: Persistencia en BD para análisis histórico

#### SLAs: Matriz del PDF
**Razón**: Documento oficial establece tiempos exactos

**Implementación**: Mapeo directo impacto → SLA

---

## 7. Consideraciones de Seguridad y Costos

### 7.1 Seguridad

- **API Keys**: Almacenadas en `.env` (no en código)
- **CORS**: Configurable por origen
- **Validación**: Input sanitizado en backend
- **Rate Limiting**: No implementado (añadir en producción)

### 7.2 Costos

#### OpenAI (estimado):
- `gpt-4o-mini`: ~$0.15/1M tokens input, ~$0.60/1M tokens output
- Por ticket: ~500 tokens input + 200 tokens output = **~$0.0001 por ticket**
- 1000 tickets/mes = **~$0.10/mes**

#### Hosting:
- Vercel/Render: Gratis para tier básico
- Alternativa: VPS ($5-10/mes)

### 7.3 Escalabilidad

**Limitaciones actuales**:
- Corpus en memoria (OK hasta ~10K tickets)
- Sin cache de embeddings
- Sin rate limiting

**Mejoras para producción**:
- Vector store externo
- Cache Redis
- Rate limiting
- Load balancing

---

## 8. Próximos Pasos y Mejoras

### Corto Plazo
1. ✅ Implementar embeddings vectoriales
2. ✅ Añadir rate limiting
3. ✅ Mejorar UI/UX

### Mediano Plazo
1. Persistencia de feedback en BD
2. Dashboard de métricas
3. Re-entrenamiento con feedback histórico

### Largo Plazo
1. Modelo fine-tuned propio
2. Integración con sistemas de tickets (Jira, Zendesk)
3. Análisis predictivo de SLA

---

## 9. Conclusión

El sistema implementado cumple con los requisitos técnicos:
- ✅ Uso de IA (OpenAI con fallback)
- ✅ Arquitectura RAG funcional
- ✅ Frontend operativo
- ✅ Feedback loop visual
- ✅ Integración de datos del PDF

**Fortalezas**:
- Arquitectura modular y extensible
- Fallback heurístico robusto
- Integración completa del documento PDF

**Áreas de mejora**:
- Vector store para mejor retrieval
- Persistencia de feedback
- Métricas y analytics

---

**Fecha**: Noviembre 2025  
**Versión**: 1.0.0

