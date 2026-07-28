#!/bin/bash

# Script de déploiement en production pour projChat
echo "🚀 Déploiement en production de projChat..."

# Variables d'environnement
ENVIRONMENT=${1:-production}
TAG=${2:-latest}

echo "📦 Environnement: $ENVIRONMENT"
echo "🏷️  Tag: $TAG"

# Build des images de production
echo "🔨 Construction des images de production..."
docker build -t projchat-backend:$TAG --target backend .
docker build -t projchat-frontend:$TAG --target frontend .
docker build -t projchat-nginx:$TAG --target production .

# Tag pour le registre
if [ "$ENVIRONMENT" = "production" ]; then
    echo "📤 Tag pour le registre de production..."
    docker tag projchat-backend:$TAG registry.honoris.com/projchat-backend:$TAG
    docker tag projchat-frontend:$TAG registry.honoris.com/projchat-frontend:$TAG
    docker tag projchat-nginx:$TAG registry.honoris.com/projchat-nginx:$TAG
    
    # Push vers le registre
    echo "📤 Push vers le registre..."
    docker push registry.honoris.com/projchat-backend:$TAG
    docker push registry.honoris.com/projchat-frontend:$TAG
    docker push registry.honoris.com/projchat-nginx:$TAG
fi

# Déploiement avec docker-compose
echo "🚀 Déploiement des services..."
ENVIRONMENT=$ENVIRONMENT docker-compose -f docker-compose.prod.yml up -d

# Vérification du déploiement
echo "🔍 Vérification du déploiement..."
sleep 30

# Test des services
echo "🧪 Test des services..."
curl -f http://localhost/api/health/ || echo "❌ Backend non disponible"
curl -f http://localhost/ || echo "❌ Frontend non disponible"

# Afficher les statuts
echo "📊 Statut des conteneurs:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Déploiement terminé !"
echo "🌐 Application: http://localhost"
echo "📊 Monitoring: docker-compose -f docker-compose.prod.yml logs -f"
