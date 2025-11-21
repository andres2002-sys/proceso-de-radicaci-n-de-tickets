## Ticket Triage Copilot – Arquitectura basada en Knowledge Base + PDF

### 1. Fuentes de conocimiento y preparación RAG
- `Knowledge_base.json`: 50 tickets históricos con campos (prioridad, urgencia, SLA, categoría, solución).  
- `data/support_clients.json`: tabla derivada del PDF con 10 clientes clave, su MRR, estado del servicio, % de usuarios afectados e incidentes críticos, más la matriz ANS/SLAs oficial.

Pipeline de ingesta:
1. `scripts/ingest_data.mjs` combina ambos datasets.
2. Cada registro se transforma en un documento semiestructurado (`content`, `metadata` con `familia_producto`, `impacto`, `cliente`, `mrr`, etc.).
3. Se generan embeddings (`text-embedding-3-large` o `text-embedding-004`) y se almacenan en un vector store (Chromadb local para demo o Pinecone/Supabase pgvector en producción).

### 2. Flujo API (FastAPI/Fastify)
```
POST /api/tickets
  ├─ Enriquecimiento: si `cliente` coincide con la tabla del PDF → agrega MRR, estado, % afectados
  ├─ Heurísticas:
       - if mrr ≥ 20000 or porcentaje ≥ 70% ⇒ prioridad mínima P2 y urgencia ≥ Alta
       - if estado == "En riesgo de churn" ⇒ incrementar impacto en un nivel
  ├─ Retrieval: consulta vector store (k=5) filtrando por categoría/vertical
  ├─ Prompt LLM:
       * Instrucciones de rol (Soporte Senior)
       * Bloque “Contexto Histórico” con los documentos recuperados
       * Bloque “Políticas ANS” con la tabla del PDF
       * Bloque “Clientes estratégicos” con el registro del cliente objetivo (si existe)
       * Solicita JSON: prioridad (P1–P4), urgencia, impacto, SLA detallado, justificación, confianza (0–1), recomendaciones
  ├─ Post-procesado: valida contra `ans_matrix` del PDF; si el modelo entrega un SLA inconsistente, se corrige con la tabla oficial.
  └─ Respuesta hacia el frontend.
```

Endpoints adicionales:
- `POST /api/feedback`: recibe correcciones del ingeniero (prioridad, SLA, comentario) y las registra en memoria/log para ajustar prompts futuros o alimentar analítica.
- `GET /api/clients`: expone la tabla del PDF para precargar selectores en el frontend.

### 3. Frontend (Lovable/React)
- Formulario de radicación: título, descripción, cliente (autocomplete usando `GET /api/clients`), canal, adjuntos.
- Card de resultado con:
  - Priorización propuesta (chips P1–P4, urgencia, impacto).
  - Tabla SLA según ANS (primer respuesta, asistencia, solución) derivada directamente del PDF.
  - Lista de “Incidentes similares” (muestra campos `ticket_id`, `categoria`, `tiempo_resolucion`).
  - Alertas contextualizadas: “Cliente en riesgo de churn”, “MRR alto”, “% usuarios afectados ≥ 70%”.
- Feedback loop visible: botones Confirmar/Corregir + slider de confianza (ej. barra verde/amarilla/roja). Cualquier corrección muestra badge “Corregido por agente” y se envía al endpoint de feedback.

### 4. Prompting (borrador)
```
System: Eres un Ingeniero de Soporte Senior...
Contexto_histórico: {{docs}}
Politicas_ANS: {{ans_matrix}}
Cliente_contexto: {{registro_pdf_del_cliente}}
Usuario:
- Ticket_nuevo: {{titulo}} – {{descripcion}}
- Campos obligatorios: prioridad, urgencia, impacto, sla {primer_respuesta, asistencia, solucion}, confianza (0-1), justificacion breve, recomendaciones
Reglas:
- respeta los tiempos del ANS según el impacto calculado
- si cliente no existe en tabla, infiere impacto según alcance descrito
- responde en JSON válido
```

### 5. Aplicación del PDF
- La tabla de clientes alimenta directamente los metadatos del ticket y ajusta la prioridad basada en MRR/estado/% afectados.
- La matriz ANS establece los SLAs oficiales que el modelo debe respetar; se usan tanto en el prompt como en la validación de salida.
- Las definiciones de métricas (Tiempo de 1ª respuesta, Asistencia, Objetivo) se emplean para mostrar tooltips en la UI y como descripción en el documento técnico.

### 6. Próximos pasos técnicos
1. Implementar `scripts/ingest_data.mjs`.
2. Crear backend (FastAPI o Fastify) con endpoints indicados y cliente RAG (langchain-js, llamaindex, semantic-kernel).
3. Construir frontend (Lovable/React) siguiendo la maqueta descrita.
4. Redactar documento técnico y grabar demo.

