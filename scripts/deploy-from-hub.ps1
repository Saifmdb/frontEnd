# Script PowerShell pour déployer les images depuis Docker Hub
# Compte: saifmed

Write-Host "🚀 Déploiement de projChat depuis Docker Hub (saifmed)..." -ForegroundColor Green

# Variables
$DOCKER_HUB_USER = "saifmed"
$TAG = if ($args.Count -gt 0) { $args[0] } else { "latest" }

Write-Host "👤 Utilisateur Docker Hub: $DOCKER_HUB_USER" -ForegroundColor Cyan
Write-Host "🏷️  Tag: $TAG" -ForegroundColor Cyan

# Arrêter les conteneurs existants
Write-Host "🛑 Arrêt des conteneurs existants..." -ForegroundColor Yellow
docker-compose -f docker-compose.hub.yml down --remove-orphans

# Télécharger les dernières images
Write-Host "📥 Téléchargement des images depuis Docker Hub..." -ForegroundColor Yellow
docker pull "$DOCKER_HUB_USER/projchat-backend:$TAG"
docker pull "$DOCKER_HUB_USER/projchat-frontend:$TAG"
docker pull "$DOCKER_HUB_USER/projchat-nginx:$TAG"

# Démarrer les services
Write-Host "🚀 Démarrage des services..." -ForegroundColor Yellow
docker-compose -f docker-compose.hub.yml up -d

# Attendre que la base de données soit prête
Write-Host "⏳ Attente de la base de données..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Appliquer les migrations Django
Write-Host "📊 Application des migrations Django..." -ForegroundColor Blue
docker-compose -f docker-compose.hub.yml exec backend python manage.py migrate

# Créer un superutilisateur si nécessaire
Write-Host "👤 Vérification du superutilisateur..." -ForegroundColor Blue
$createUserScript = @"
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@honoris.com', 'admin123')
    print('✅ Superutilisateur créé: admin/admin123')
else:
    print('ℹ️  Superutilisateur admin existe déjà')
"@
docker-compose -f docker-compose.hub.yml exec backend python manage.py shell -c "$createUserScript"

# Installer le modèle Ollama
Write-Host "🤖 Installation du modèle Ollama..." -ForegroundColor Blue
docker-compose -f docker-compose.hub.yml exec ollama ollama pull qwen2.5:7b

# Afficher les statuts
Write-Host "📊 Statut des conteneurs:" -ForegroundColor Cyan
docker-compose -f docker-compose.hub.yml ps

# Vérifier les services
Write-Host "🔍 Vérification des services..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "✅ Déploiement terminé avec succès !" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Accès à l'application:" -ForegroundColor Cyan
Write-Host "- Frontend React: http://localhost:3000"
Write-Host "- Backend API: http://localhost:8000"
Write-Host "- Admin Django: http://localhost:8000/admin (admin/admin123)"
Write-Host "- Nginx Production: http://localhost:80"
Write-Host "- Ollama LLM: http://localhost:11434"
Write-Host ""
Write-Host "📝 Logs en temps réel:" -ForegroundColor Yellow
Write-Host "docker-compose -f docker-compose.hub.yml logs -f"
Write-Host ""
Write-Host "🛑 Arrêter les services:" -ForegroundColor Red
Write-Host "docker-compose -f docker-compose.hub.yml down"
