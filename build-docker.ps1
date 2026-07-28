# Script PowerShell pour construire les images Docker
# Structure: backend dans ../backend, frontend dans .

Write-Host "Construction des images Docker pour projChat..." -ForegroundColor Green

# Variables
$DOCKER_HUB_USER = "saifmed"
$TAG = if ($args.Count -gt 0) { $args[0] } else { "latest" }

Write-Host "Utilisateur Docker Hub: $DOCKER_HUB_USER" -ForegroundColor Cyan
Write-Host "Tag: $TAG" -ForegroundColor Cyan

# Aller dans le repertoire projChat
Set-Location "C:\Users\PS\Desktop\pfe\projChat"

# Construire l'image backend
Write-Host "Construction de l'image backend..." -ForegroundColor Blue
docker build -t "$DOCKER_HUB_USER/projchat-backend:$TAG" --target backend --build-context backend=../backend .

# Construire l'image frontend
Write-Host "Construction de l'image frontend..." -ForegroundColor Blue
docker build -t "$DOCKER_HUB_USER/projchat-frontend:$TAG" --target frontend .

# Construire l'image nginx
Write-Host "Construction de l'image nginx..." -ForegroundColor Blue
docker build -t "$DOCKER_HUB_USER/projchat-nginx:$TAG" --target production .

# Creer les tags latest
docker tag "$DOCKER_HUB_USER/projchat-backend:$TAG" "$DOCKER_HUB_USER/projchat-backend:latest"
docker tag "$DOCKER_HUB_USER/projchat-frontend:$TAG" "$DOCKER_HUB_USER/projchat-frontend:latest"
docker tag "$DOCKER_HUB_USER/projchat-nginx:$TAG" "$DOCKER_HUB_USER/projchat-nginx:latest"

Write-Host ""
Write-Host "Images construites avec succes !" -ForegroundColor Green
Write-Host ""
Write-Host "Images creees:" -ForegroundColor Cyan
Write-Host "- $DOCKER_HUB_USER/projchat-backend:$TAG"
Write-Host "- $DOCKER_HUB_USER/projchat-frontend:$TAG"
Write-Host "- $DOCKER_HUB_USER/projchat-nginx:$TAG"

# Afficher les images
Write-Host ""
Write-Host "Liste des images locales:" -ForegroundColor Yellow
docker images | grep projchat
