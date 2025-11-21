#!/bin/bash
# Script de despliegue rápido a Vercel

echo "🚀 Desplegando Ticket Triage Copilot a producción..."

# Verificar que Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI no está instalado."
    echo "📦 Instalando Vercel CLI..."
    npm i -g vercel
fi

# Verificar que el corpus RAG existe
if [ ! -f "data/rag_corpus.json" ]; then
    echo "📊 Generando corpus RAG..."
    npm run ingest
fi

# Desplegar
echo "🌐 Desplegando a Vercel..."
vercel --prod

echo "✅ ¡Despliegue completado!"
echo "📝 Recuerda configurar variables de entorno en el dashboard de Vercel:"
echo "   - OPENAI_API_KEY (opcional)"
echo "   - OPENAI_MODEL=gpt-4o-mini"
echo "   - FRONTEND_ORIGIN=*"

