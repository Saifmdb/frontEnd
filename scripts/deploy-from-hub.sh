#!/bin/bash

# Script pour déployer les images depuis Docker Hub
# Compte: saifmed

echo "🚀 Déploiement de projChat depuis Docker Hub (saifmed)..."

# Variables
DOCKER_HUB_USER="saifmed"
TAG=${1:-latest}

echo "👤 Utilisateur Docker Hub: $DOCKER_HUB_USER"
echo "🏷️  Tag: $TAG"

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
docker-compose -f docker-compose.hub.yml down --remove-orphans

# Télécharger les dernières images
echo "📥 Téléchargement des images depuis Docker Hub..."
docker pull $DOCKER_HUB_USER/projchat-backend:$TAG
docker pull $DOCKER_HUB_USER/projchat-frontend:$TAG
docker pull $DOCKER_HUB_USER/projchat-nginx:$TAG

# Démarrer les services
echo "🚀 Démarrage des services..."
docker-compose -f docker-compose.hub.yml up -d

# Attendre que la base de données soit prête
echo "⏳ Attente de la base de données..."
sleep 10

# Appliquer les migrations Django
echo "📊 Application des migrations Django..."
docker-compose -f docker-compose.hub.yml exec backend python manage.py migrate

# Créer un superutilisateur si nécessaire
echo "👤 Vérification du superutilisateur..."
docker-compose -f docker-compose.hub.yml exec backend python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@honoris.com', 'admin123')
    print('✅ Superutilisateur créé: admin/admin123')
else:
    print('ℹ️  Superutilisateur admin existe déjà')
EOF

# Installer le modèle Ollama
echo "🤖 Installation du modèle Ollama..."
docker-compose -f docker-compose.hub.yml exec ollama ollama pull qwen2.5:7b

# Afficher les statuts
echo "📊 Statut des conteneurs:"
docker-compose -f docker-compose.hub.yml ps

# Vérifier les services
echo "🔍 Vérification des services..."
sleep 5

echo ""
echo "✅ Déploiement terminé avec succès !"
echo ""
echo "🌐 Accès à l'application:"
echo "- Frontend React: http://localhost:3000"
echo "- Backend API: http://localhost:8000"
echo "- Admin Django: http://localhost:8000/admin (admin/admin123)"
echo "- Nginx Production: http://localhost:80"
echo "- Ollama LLM: http://localhost:11434"
echo ""
echo "📝 Logs en temps réel:"
echo "docker-compose -f docker-compose.hub.yml logs -f"
echo ""
echo "🛑 Arrêter les services:"
echo "docker-compose -f docker-compose.hub.yml down"
