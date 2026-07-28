#!/bin/bash

# Script de build Docker pour projChat
echo "🐳 Construction des images Docker pour projChat..."

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
docker-compose down --remove-orphans

# Nettoyer les images anciennes
echo "🧹 Nettoyage des images anciennes..."
docker system prune -f

# Construire les images
echo "🔨 Construction des images..."
docker-compose build --no-cache

# Démarrer les services
echo "🚀 Démarrage des services..."
docker-compose up -d

# Attendre que la base de données soit prête
echo "⏳ Attente de la base de données..."
sleep 10

# Appliquer les migrations Django
echo "📊 Application des migrations Django..."
docker-compose exec backend python manage.py migrate

# Créer un superutilisateur
echo "👤 Création du superutilisateur..."
docker-compose exec backend python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@honoris.com', 'admin123')
    print('Superutilisateur créé: admin/admin123')
else:
    print('Superutilisateur admin existe déjà')
EOF

# Charger les données initiales
echo "📚 Chargement des données initiales..."
docker-compose exec backend python manage.py loaddata fixtures/initial_data.json 2>/dev/null || echo "Pas de fixtures à charger"

# Afficher les statuts
echo "📊 Statut des conteneurs:"
docker-compose ps

echo ""
echo "✅ Build terminé !"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "👤 Admin Django: http://localhost:8000/admin (admin/admin123)"
echo "🐳 Nginx Production: http://localhost:80"
echo ""
echo "📝 Logs en temps réel: docker-compose logs -f"
echo "🛑 Arrêter: docker-compose down"
