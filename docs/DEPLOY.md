# 🚀 Guía de Despliegue a Producción

Esta guía explica cómo desplegar **Ticket Triage Copilot** a producción usando diferentes plataformas.

---

## 📋 Prerrequisitos

1. **Cuenta en plataforma de despliegue** (Vercel, Render, etc.)
2. **Repositorio Git** (GitHub, GitLab, Bitbucket)
3. **OpenAI API Key** (opcional, pero recomendado)

---

## 🌐 Opción 1: Vercel (Recomendado)

### Pasos:

1. **Instalar Vercel CLI** (opcional, también puedes usar la web):
   ```bash
   npm i -g vercel
   ```

2. **Login en Vercel**:
   ```bash
   vercel login
   ```

3. **Desplegar**:
   ```bash
   vercel --prod
   ```

   O desde la web de Vercel:
   - Conecta tu repositorio
   - Vercel detectará automáticamente `vercel.json`
   - Configura variables de entorno (ver abajo)

### Variables de Entorno en Vercel:

Ve a **Settings → Environment Variables** y añade:

```
OPENAI_API_KEY=sk-tu-api-key-aqui (opcional)
OPENAI_MODEL=gpt-4o-mini
FRONTEND_ORIGIN=*
```

### Estructura para Vercel:

- ✅ `vercel.json` configurado
- ✅ `api/index.js` como handler serverless
- ✅ Archivos estáticos en `public/`

### URL después del despliegue:

Vercel te proporcionará una URL como:
```
https://tu-proyecto.vercel.app
```

---

## 🖥️ Opción 2: Render

### Pasos:

1. **Crear cuenta en Render**: https://render.com

2. **Nuevo Web Service**:
   - Conecta tu repositorio
   - Render detectará `render.yaml`
   - O configura manualmente:
     - **Build Command**: `npm install && npm run ingest`
     - **Start Command**: `node src/server.mjs`
     - **Environment**: `Node`

3. **Variables de Entorno**:
   ```
   NODE_ENV=production
   PORT=10000
   OPENAI_API_KEY=sk-tu-api-key (opcional)
   OPENAI_MODEL=gpt-4o-mini
   FRONTEND_ORIGIN=*
   ```

4. **Desplegar**:
   - Render desplegará automáticamente
   - La URL será: `https://tu-proyecto.onrender.com`

---

## 🐳 Opción 3: Docker (Cualquier plataforma)

### Crear Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run ingest

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "src/server.mjs"]
```

### Construir y ejecutar:

```bash
docker build -t ticket-triage-copilot .
docker run -p 4000:4000 -e OPENAI_API_KEY=sk-... ticket-triage-copilot
```

---

## ⚙️ Variables de Entorno

### Requeridas:
- Ninguna (el sistema funciona sin OpenAI API key usando heurísticas)

### Opcionales pero recomendadas:
- `OPENAI_API_KEY`: Tu API key de OpenAI (para usar IA real)
- `OPENAI_MODEL`: Modelo a usar (default: `gpt-4o-mini`)
- `PORT`: Puerto del servidor (default: `4000`)
- `FRONTEND_ORIGIN`: Origen permitido para CORS (default: `*`)

---

## ✅ Verificación Post-Despliegue

### 1. Health Check:
```bash
curl https://tu-url.com/health
```
Debería responder: `{"ok":true,"timestamp":"..."}`

### 2. Probar API de Clientes:
```bash
curl https://tu-url.com/api/clients
```
Debería devolver lista de 10 clientes.

### 3. Probar Clasificación:
```bash
curl -X POST https://tu-url.com/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Error crítico",
    "description": "Sistema caído",
    "client": "TechFin Solutions"
  }'
```

### 4. Probar Frontend:
Abre `https://tu-url.com` en el navegador y verifica:
- ✅ Formulario carga correctamente
- ✅ Selector de clientes funciona
- ✅ Clasificación de tickets funciona
- ✅ Feedback loop funciona

---

## 🔧 Solución de Problemas

### Error: "Cannot find module"
- Verifica que `npm run ingest` se ejecute en el build
- Asegúrate de que `data/rag_corpus.json` existe

### Error: "CORS"
- Verifica `FRONTEND_ORIGIN` en variables de entorno
- Asegúrate de que el frontend use la URL correcta

### Error: "OpenAI API"
- Si no tienes API key, el sistema usará heurísticas (funciona igual)
- Si quieres usar IA, añade `OPENAI_API_KEY` en variables de entorno

### Archivos estáticos no cargan
- Verifica que `public/` esté incluido en el despliegue
- En Vercel, `vercel.json` maneja esto automáticamente

---

## 📊 Monitoreo

### Logs:
- **Vercel**: Dashboard → Logs
- **Render**: Dashboard → Logs
- **Docker**: `docker logs <container-id>`

### Métricas a monitorear:
- Tiempo de respuesta de `/api/tickets`
- Uso de tokens de OpenAI (si aplica)
- Errores 500
- Tasa de éxito de clasificaciones

---

## 🔄 Actualizaciones

### Desplegar cambios:

**Vercel**:
```bash
git push origin main
# Vercel desplegará automáticamente
```

**Render**:
- Push a `main` → Auto-deploy
- O manualmente desde dashboard

**Docker**:
```bash
docker build -t ticket-triage-copilot .
docker push <registry>/ticket-triage-copilot
```

---

## 💰 Costos Estimados

### Vercel:
- **Hobby (Gratis)**: 100GB bandwidth/mes, suficiente para pruebas
- **Pro**: $20/mes (si necesitas más recursos)

### Render:
- **Free Tier**: 750 horas/mes (suficiente para desarrollo)
- **Starter**: $7/mes (para producción)

### OpenAI:
- **gpt-4o-mini**: ~$0.0001 por ticket
- **1000 tickets/mes**: ~$0.10/mes

---

## ✅ Checklist de Despliegue

- [ ] Repositorio en Git
- [ ] Variables de entorno configuradas
- [ ] `npm run ingest` ejecutado (o en build)
- [ ] Health check responde OK
- [ ] API de clientes funciona
- [ ] Clasificación de tickets funciona
- [ ] Frontend carga correctamente
- [ ] Feedback loop funciona
- [ ] CORS configurado correctamente

---

## 🎉 ¡Listo!

Una vez desplegado, tu sistema estará disponible públicamente y podrás:
- Compartir la URL con evaluadores
- Grabar el video demostrativo
- Usar el sistema en producción

**URL de ejemplo**: `https://ticket-triage-copilot.vercel.app`

---

¿Necesitas ayuda? Revisa los logs de la plataforma o consulta la documentación técnica en `docs/TECNICO.md`.

