# Script PowerShell pour pousser les images Docker sur Docker Hub
# Compte: saifmed

Write-Host "🐳 Préparation des images Docker Hub pour saifmed/projChat..." -ForegroundColor Green

# Variables
$DOCKER_HUB_USER = "saifmed"
$TAG = if ($args.Count -gt 0) { $args[0] } else { "latest" }

Write-Host "👤 Utilisateur Docker Hub: $DOCKER_HUB_USER" -ForegroundColor Cyan
Write-Host "🏷️  Tag: $TAG" -ForegroundColor Cyan

# Se connecter à Docker Hub
Write-Host "🔐 Connexion à Docker Hub..." -ForegroundColor Yellow
docker login

# Construire les images avec le bon tag
Write-Host "🔨 Construction des images..." -ForegroundColor Yellow

# Backend
Write-Host "📦 Construction de l'image backend..." -ForegroundColor Blue
docker build -t "$DOCKER_HUB_USER/projchat-backend:$TAG" --target backend .
docker tag "$DOCKER_HUB_USER/projchat-backend:$TAG" "$DOCKER_HUB_USER/projchat-backend:latest"

# Frontend
Write-Host "📦 Construction de l'image frontend..." -ForegroundColor Blue
docker build -t "$DOCKER_HUB_USER/projchat-frontend:$TAG" --target frontend .
docker tag "$DOCKER_HUB_USER/projchat-frontend:$TAG" "$DOCKER_HUB_USER/projchat-frontend:latest"

# Nginx (production)
Write-Host "📦 Construction de l'image nginx..." -ForegroundColor Blue
docker build -t "$DOCKER_HUB_USER/projchat-nginx:$TAG" --target production .
docker tag "$DOCKER_HUB_USER/projchat-nginx:$TAG" "$DOCKER_HUB_USER/projchat-nginx:latest"

# Pousser les images
Write-Host "📤 Push des images sur Docker Hub..." -ForegroundColor Yellow

# Backend
Write-Host "📤 Push backend..." -ForegroundColor Magenta
docker push "$DOCKER_HUB_USER/projchat-backend:$TAG"
docker push "$DOCKER_HUB_USER/projchat-backend:latest"

# Frontend
Write-Host "📤 Push frontend..." -ForegroundColor Magenta
docker push "$DOCKER_HUB_USER/projchat-frontend:$TAG"
docker push "$DOCKER_HUB_USER/projchat-frontend:latest"

# Nginx
Write-Host "📤 Push nginx..." -ForegroundColor Magenta
docker push "$DOCKER_HUB_USER/projchat-nginx:$TAG"
docker push "$DOCKER_HUB_USER/projchat-nginx:latest"

Write-Host ""
Write-Host "✅ Images poussées avec succès sur Docker Hub !" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Images disponibles:" -ForegroundColor Cyan
Write-Host "- $DOCKER_HUB_USER/projchat-backend:$TAG"
Write-Host "- $DOCKER_HUB_USER/projchat-frontend:$TAG"
Write-Host "- $DOCKER_HUB_USER/projchat-nginx:$TAG"
Write-Host ""
Write-Host "🚀 Pour déployer:" -ForegroundColor Yellow
Write-Host "docker pull $DOCKER_HUB_USER/projchat-backend:$TAG"
Write-Host "docker pull $DOCKER_HUB_USER/projchat-frontend:$TAG"
Write-Host "docker pull $DOCKER_HUB_USER/projchat-nginx:$TAG"
