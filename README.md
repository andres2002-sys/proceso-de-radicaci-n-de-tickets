# 🎫 Ticket Triage Copilot

Sistema de clasificación automática de tickets de soporte utilizando Inteligencia Artificial y arquitectura RAG (Retrieval-Augmented Generation).

## 📋 Descripción

Este sistema analiza tickets entrantes y asigna automáticamente atributos como:
- **Nivel de prioridad** (P1-P4)
- **Nivel de urgencia** (Crítica, Alta, Media, Baja)
- **Tiempo estimado de resolución (SLA)** basado en la matriz ANS del documento de soporte
- **Categoría** del ticket
- **Justificación** de la clasificación
- **Nivel de confianza** del modelo

## 🏗️ Arquitectura

- **Backend**: Node.js + Express
- **Frontend**: HTML/CSS/JavaScript (vanilla)
- **IA**: OpenAI GPT-4o-mini (con fallback heurístico)
- **RAG**: Retrieval semántico sobre base de conocimiento histórica
- **Datos**: Knowledge_base.json + tabla de clientes estratégicos del PDF

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+ 
- npm o yarn

### Pasos

1. **Clonar/descargar el proyecto**

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno** (opcional)
   
   Crea un archivo `.env` en la raíz del proyecto:
   ```env
   OPENAI_API_KEY=sk-tu-api-key-aqui
   OPENAI_MODEL=gpt-4o-mini
   PORT=3000
   FRONTEND_ORIGIN=*
   ```
   
   **Nota**: Si no proporcionas `OPENAI_API_KEY`, el sistema usará clasificación heurística basada en reglas del documento PDF.

4. **Generar corpus RAG**
   ```bash
   npm run ingest
   ```
   
   Esto combina `Knowledge_base.json` y los datos del PDF en `data/rag_corpus.json`.

5. **Iniciar el servidor**
   ```bash
   npm start
   ```
   
   O en modo desarrollo con recarga automática:
   ```bash
   npm run dev
   ```

6. **Abrir en el navegador**
   
   Navega a: `http://localhost:3000`

## 📁 Estructura del Proyecto

```
.
├── public/                 # Frontend (HTML/CSS/JS)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src/                    # Backend
│   ├── config/            # Configuración
│   ├── lib/               # Utilidades RAG
│   ├── services/          # Lógica de negocio
│   └── server.mjs         # Servidor Express
├── data/                   # Datos
│   ├── support_clients.json    # Clientes del PDF
│   └── rag_corpus.json         # Corpus combinado
├── scripts/               # Scripts de utilidad
│   └── ingest_data.mjs    # Genera corpus RAG
├── docs/                  # Documentación
│   └── architecture.md   # Arquitectura detallada
└── package.json
```

## 🔌 API Endpoints

### `GET /health`
Health check del servidor.

### `GET /api/clients`
Obtiene lista de clientes estratégicos con MRR, estado, etc.

### `GET /api/ans`
Obtiene la matriz ANS (Acuerdo de Nivel de Servicio) del documento PDF.

### `POST /api/tickets`
Clasifica un ticket nuevo.

**Request:**
```json
{
  "title": "API de validación no responde - Error 500",
  "description": "Clientes reportan que el endpoint /api/v2/identity/validate retorna error 500...",
  "client": "TechFin Solutions",
  "channel": "email"
}
```

**Response:**
```json
{
  "ticket_id": "TEMP-123",
  "prioridad": "P1",
  "urgencia": "Crítica",
  "impacto": "Crítico",
  "sla_objetivo": {
    "tiempo_primer_respuesta": "15 minutos",
    "tiempo_asistencia": "30 minutos",
    "tiempo_objetivo_solucion": "4 horas"
  },
  "justificacion": "...",
  "confianza": 0.85,
  "recomendaciones": [...],
  "tickets_similares": [...]
}
```

### `POST /api/feedback`
Registra feedback del agente (confirmación o corrección).

**Request:**
```json
{
  "ticket_id": "TEMP-123",
  "action": "confirmed" | "corrected",
  "original_classification": {...},
  "corrected_classification": {...}  // Solo si action = "corrected"
}
```

## 🎯 Características Principales

### 1. Clasificación Automática
- Análisis del título y descripción del ticket
- Enriquecimiento con datos del cliente (MRR, estado, % afectados)
- Aplicación de reglas heurísticas del documento PDF
- Uso de IA (OpenAI) cuando está disponible

### 2. RAG (Retrieval-Augmented Generation)
- Búsqueda semántica sobre tickets históricos
- Recuperación de casos similares para contexto
- Mejora de precisión mediante conocimiento histórico

### 3. Matriz ANS
- SLAs basados en el documento oficial
- Tiempos diferenciados por nivel de impacto
- Consideración de horario laboral

### 4. Feedback Loop
- Confirmación de clasificaciones correctas
- Corrección manual cuando es necesario
- Visualización del estado de feedback

## 📊 Datos Utilizados

### Knowledge_base.json
50 tickets históricos resueltos con:
- Prioridad, urgencia, SLA
- Categoría y tiempo de resolución
- Soluciones aplicadas

### Documento PDF
- 10 clientes estratégicos con MRR y estado
- Matriz ANS oficial
- Definiciones de métricas

## 🔧 Scripts Disponibles

- `npm start` - Inicia el servidor
- `npm run dev` - Inicia con nodemon (recarga automática)
- `npm run ingest` - Regenera el corpus RAG

## 🚀 Despliegue a Producción

El sistema está listo para desplegarse en múltiples plataformas:

### Opción 1: Vercel (Recomendado - Más rápido)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login y desplegar
vercel login
vercel --prod
```

O desde la web: conecta tu repositorio en [vercel.com](https://vercel.com)

### Opción 2: Render

1. Conecta tu repositorio en [render.com](https://render.com)
2. Render detectará automáticamente `render.yaml`
3. Configura variables de entorno (ver `docs/DEPLOY.md`)

### Variables de Entorno (Opcionales)

```
OPENAI_API_KEY=sk-... (opcional - sin esto usa heurísticas)
OPENAI_MODEL=gpt-4o-mini
FRONTEND_ORIGIN=*
```

**📖 Guía completa de despliegue**: Ver `docs/DEPLOY.md`

## 📝 Documentación Técnica

- `docs/TECNICO.md` - Documento técnico completo con decisiones y justificaciones
- `docs/architecture.md` - Arquitectura detallada
- `docs/DEPLOY.md` - Guía completa de despliegue

## 🎥 Video Demostrativo

[Pendiente: Grabar video de 2-5 minutos mostrando el flujo completo]

## 📄 Licencia

ISC

## 👤 Autor

Sistema desarrollado como prueba técnica para Ingeniero de Soporte (Tech Support Engineer).

