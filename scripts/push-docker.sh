#!/bin/bash

# Script pour pousser les images Docker sur Docker Hub
# Compte: saifmed

echo "🐳 Préparation des images Docker Hub pour saifmed/projChat..."

# Variables
DOCKER_HUB_USER="saifmed"
TAG=${1:-latest}

echo "👤 Utilisateur Docker Hub: $DOCKER_HUB_USER"
echo "🏷️  Tag: $TAG"

# Se connecter à Docker Hub
echo "🔐 Connexion à Docker Hub..."
docker login

# Construire les images avec le bon tag
echo "🔨 Construction des images..."

# Backend
echo "📦 Construction de l'image backend..."
docker build -t $DOCKER_HUB_USER/projchat-backend:$TAG --target backend .
docker tag $DOCKER_HUB_USER/projchat-backend:$TAG $DOCKER_HUB_USER/projchat-backend:latest

# Frontend
echo "📦 Construction de l'image frontend..."
docker build -t $DOCKER_HUB_USER/projchat-frontend:$TAG --target frontend .
docker tag $DOCKER_HUB_USER/projchat-frontend:$TAG $DOCKER_HUB_USER/projchat-frontend:latest

# Nginx (production)
echo "📦 Construction de l'image nginx..."
docker build -t $DOCKER_HUB_USER/projchat-nginx:$TAG --target production .
docker tag $DOCKER_HUB_USER/projchat-nginx:$TAG $DOCKER_HUB_USER/projchat-nginx:latest

# Pousser les images
echo "📤 Push des images sur Docker Hub..."

# Backend
echo "📤 Push backend..."
docker push $DOCKER_HUB_USER/projchat-backend:$TAG
docker push $DOCKER_HUB_USER/projchat-backend:latest

# Frontend
echo "📤 Push frontend..."
docker push $DOCKER_HUB_USER/projchat-frontend:$TAG
docker push $DOCKER_HUB_USER/projchat-frontend:latest

# Nginx
echo "📤 Push nginx..."
docker push $DOCKER_HUB_USER/projchat-nginx:$TAG
docker push $DOCKER_HUB_USER/projchat-nginx:latest

echo ""
echo "✅ Images poussées avec succès sur Docker Hub !"
echo ""
echo "📦 Images disponibles:"
echo "- $DOCKER_HUB_USER/projchat-backend:$TAG"
echo "- $DOCKER_HUB_USER/projchat-frontend:$TAG"
echo "- $DOCKER_HUB_USER/projchat-nginx:$TAG"
echo ""
echo "🚀 Pour déployer:"
echo "docker pull $DOCKER_HUB_USER/projchat-backend:$TAG"
echo "docker pull $DOCKER_HUB_USER/projchat-frontend:$TAG"
echo "docker pull $DOCKER_HUB_USER/projchat-nginx:$TAG"
