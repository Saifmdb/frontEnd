# 🐳 ProjChat Docker Configuration

Configuration complète pour déployer le chatbot Honoris avec Docker et Docker Compose.

## 📋 Prérequis

- Docker Desktop (Windows/Mac) ou Docker Engine (Linux)
- Docker Compose
- Git
- Au moins 4GB de RAM disponible

## 🚀 Démarrage Rapide

### 1. Cloner le projet
```bash
git clone <repository-url>
cd projChat
```

### 2. Configuration de l'environnement
```bash
# Copier les fichiers d'environnement
cp .env.example .env

# Éditer les variables d'environnement
notepad .env
```

### 3. Lancer le build
```bash
# Rendre le script exécutable (Linux/Mac)
chmod +x scripts/build.sh

# Lancer le build complet
./scripts/build.sh
```

### 4. Accéder à l'application
- 🌐 **Frontend**: http://localhost:3000
- 🔧 **Backend API**: http://localhost:8000
- 👤 **Admin Django**: http://localhost:8000/admin (admin/admin123)
- 🐳 **Production Nginx**: http://localhost:80

## 📁 Structure des Fichiers

```
projChat/
├── backend/                 # Backend Django
│   ├── chatbot/            # Application chatbot
│   ├── requirements.txt    # Dépendances Python
│   └── manage.py          # Gestion Django
├── frontend/               # Frontend React
│   ├── src/               # Source React
│   ├── package.json      # Dépendances Node
│   └── public/           # Fichiers publics
├── scripts/               # Scripts Docker
│   ├── build.sh          # Build de développement
│   └── deploy.sh         # Déploiement production
├── nginx.conf            # Configuration Nginx
├── docker-compose.yml    # Environnement de dev
├── docker-compose.prod.yml # Environnement de prod
├── Dockerfile            # Build multi-stage
└── .dockerignore         # Fichiers à exclure
```

## 🐋 Services Docker

### Services de Développement
- **db**: PostgreSQL 15 (port 5432)
- **backend**: Django API (port 8000)
- **frontend**: React Dev Server (port 3000)
- **nginx**: Reverse Proxy (port 80)
- **ollama**: LLM Server (port 11434)
- **redis**: Cache (port 6379)

### Services de Production
- **db**: PostgreSQL avec persistance
- **backend**: Django en mode production
- **nginx**: Frontend statique + reverse proxy
- **ollama**: LLM Server
- **redis**: Cache et sessions
- **celery**: Tâches de fond
- **celery-beat**: Tâches planifiées
- **prometheus**: Monitoring (port 9090)
- **grafana**: Dashboards (port 3001)

## 🔧 Configuration

### Variables d'Environnement
```bash
# .env
POSTGRES_PASSWORD=votre_mot_de_passe
SECRET_KEY=votre_secret_key_django
ALLOWED_HOSTS=localhost,votre-domaine.com
OLLAMA_MODEL=qwen2.5:7b
REDIS_URL=redis://redis:6379/0
```

### Configuration Ollama
```bash
# Installer le modèle LLM
docker-compose exec ollama ollama pull qwen2.5:7b

# Vérifier les modèles disponibles
docker-compose exec ollama ollama list
```

## 📊 Commandes Utiles

### Gestion des Conteneurs
```bash
# Démarrer tous les services
docker-compose up -d

# Arrêter tous les services
docker-compose down

# Voir les logs en temps réel
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f backend

# Exécuter une commande dans un conteneur
docker-compose exec backend python manage.py shell

# Redémarrer un service
docker-compose restart backend
```

### Maintenance Base de Données
```bash
# Appliquer les migrations
docker-compose exec backend python manage.py migrate

# Créer un superutilisateur
docker-compose exec backend python manage.py createsuperuser

# Sauvegarder la base de données
docker-compose exec db pg_dump -U postgres honoris_chatbot > backup.sql

# Restaurer la base de données
docker-compose exec -T db psql -U postgres honoris_chatbot < backup.sql
```

### Monitoring
```bash
# Voir l'utilisation des ressources
docker stats

# Voir l'espace disque utilisé
docker system df

# Nettoyer les images non utilisées
docker system prune -a
```

## 🚀 Déploiement en Production

### 1. Préparation
```bash
# Configurer les variables de production
cp .env.prod.example .env.prod

# Éditer la configuration
notepad .env.prod
```

### 2. Build Production
```bash
# Lancer le déploiement
./scripts/deploy.sh production latest
```

### 3. Configuration SSL
```bash
# Créer le répertoire SSL
mkdir -p nginx/ssl

# Générer un certificat auto-signé (développement)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem

# Ou utiliser Let's Encrypt (production)
certbot --nginx -d votre-domaine.com
```

## 🔍 Dépannage

### Problèmes Communs

#### Backend ne démarre pas
```bash
# Vérifier les logs
docker-compose logs backend

# Vérifier la connexion à la base de données
docker-compose exec backend python manage.py dbshell
```

#### Frontend inaccessible
```bash
# Vérifier Nginx
docker-compose logs nginx

# Recharger Nginx
docker-compose exec nginx nginx -s reload
```

#### Ollama lent
```bash
# Vérifier le modèle installé
docker-compose exec ollama ollama list

# Changer de modèle
docker-compose exec ollama ollama pull llama2:7b
```

### Performance
```bash
# Optimiser Docker
docker system prune -a

# Augmenter la mémoire allouée à Docker
# Dans Docker Desktop: Settings > Resources > Memory
```

## 📈 Monitoring

### Prometheus & Grafana
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin123)

### Métriques disponibles
- Requêtes API par minute
- Temps de réponse du LLM
- Utilisation de la base de données
- Mémoire et CPU des conteneurs

## 🔒 Sécurité

### Bonnes Pratiques
- Changer les mots de passe par défaut
- Utiliser HTTPS en production
- Limiter l'accès à l'admin Django
- Mettre à jour régulièrement les images Docker
- Utiliser des secrets Docker pour les données sensibles

### Configuration Sécurité
```bash
# Scanner les vulnérabilités
docker scan projchat-backend:latest

# Utiliser des images non-root
# Déjà configuré dans le Dockerfile
```

## 📚 Documentation Supplémentaire

- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Django Docker Deployment](https://docs.docker.com/compose/django/)
- [React Docker Deployment](https://docs.docker.com/compose/react/)
- [Ollama Docker Guide](https://github.com/ollama/ollama/blob/main/docs/docker.md)

## 🆘 Support

En cas de problème :
1. Vérifier les logs : `docker-compose logs`
2. Consulter la documentation
3. Créer une issue sur le repository

---

**Développé avec ❤️ pour Honoris United Universities**
