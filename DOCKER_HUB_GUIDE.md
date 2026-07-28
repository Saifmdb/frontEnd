# 🐳 Guide Docker Hub - ProjChat

Guide complet pour gérer les images Docker du projet ProjChat sur Docker Hub avec le compte `saifmed`.

## 📋 Images Disponibles

| Image | Description | Tags |
|-------|-------------|------|
| `saifmed/projchat-backend` | Backend Django API | `latest`, `v1.0`, `v1.1` |
| `saifmed/projchat-frontend` | Frontend React | `latest`, `v1.0`, `v1.1` |
| `saifmed/projchat-nginx` | Nginx Reverse Proxy | `latest`, `v1.0`, `v1.1` |

## 🔨 Build & Push

### 1. Préparation
```bash
# Se connecter à Docker Hub
docker login
# Entrer: saifmed + votre mot de passe

# Rendre les scripts exécutables
chmod +x scripts/*.sh
```

### 2. Construire et pousser les images
```bash
# Pousser avec le tag latest
./scripts/push-docker.sh

# Pousser avec un tag spécifique
./scripts/push-docker.sh v1.1.0
```

### 3. Build manuel (optionnel)
```bash
# Backend
docker build -t saifmed/projchat-backend:latest --target backend .
docker push saifmed/projchat-backend:latest

# Frontend
docker build -t saifmed/projchat-frontend:latest --target frontend .
docker push saifmed/projchat-frontend:latest

# Nginx
docker build -t saifmed/projchat-nginx:latest --target production .
docker push saifmed/projchat-nginx:latest
```

## 🚀 Déploiement depuis Docker Hub

### 1. Déploiement complet
```bash
# Utiliser toutes les images depuis Docker Hub
./scripts/deploy-from-hub.sh

# Avec un tag spécifique
./scripts/deploy-from-hub.sh v1.1.0
```

### 2. Déploiement manuel
```bash
# Télécharger les images
docker pull saifmed/projchat-backend:latest
docker pull saifmed/projchat-frontend:latest
docker pull saifmed/projchat-nginx:latest

# Démarrer avec docker-compose
docker-compose -f docker-compose.hub.yml up -d
```

## 📊 Gestion des Images

### Lister les images locales
```bash
docker images | grep saifmed/projchat
```

### Supprimer les images locales
```bash
docker rmi saifmed/projchat-backend:latest
docker rmi saifmed/projchat-frontend:latest
docker rmi saifmed/projchat-nginx:latest
```

### Voir les informations d'une image
```bash
docker inspect saifmed/projchat-backend:latest
```

## 🏷️ Gestion des Tags

### Créer des tags de version
```bash
# Créer un tag de version
docker tag saifmed/projchat-backend:latest saifmed/projchat-backend:v1.1.0

# Pousser le tag
docker push saifmed/projchat-backend:v1.1.0
```

### Lister les tags disponibles
```bash
# Via l'API Docker Hub
curl "https://registry.hub.docker.com/v2/repositories/saifmed/projchat-backend/tags/"

# Ou visiter: https://hub.docker.com/r/saifmed/projchat-backend/tags
```

## 🔍 Monitoring

### Vérifier les images sur Docker Hub
- Backend: https://hub.docker.com/r/saifmed/projchat-backend
- Frontend: https://hub.docker.com/r/saifmed/projchat-frontend
- Nginx: https://hub.docker.com/r/saifmed/projchat-nginx

### Statistiques de téléchargement
```bash
# Via Docker Hub CLI (nécessite docker-hub-stats)
docker-hub-stats saifmed/projchat-backend
```

## 🛠️ Configuration Avancée

### Multi-architecture (AMD64 + ARM64)
```bash
# Buildx pour multi-architecture
docker buildx build --platform linux/amd64,linux/arm64 \
  -t saifmed/projchat-backend:latest \
  --target backend \
  --push .
```

### Webhooks Automatiques
Configurer dans les paramètres du repository Docker Hub:
- **Build Triggers**: Déclencher le build sur push Git
- **Webhooks**: Notifier les déploiements automatiques

### Private Registry
```bash
# Si vous voulez un repository privé
docker tag saifmed/projchat-backend:latest saifmed/projchat-backend:private
docker push saifmed/projchat-backend:private
```

## 📝 Bonnes Pratiques

### Sécurité
- 🔐 Utiliser des secrets pour les mots de passe
- 🏷️ Ne jamais pousser de données sensibles
- 🔒 Scanner les images pour vulnérabilités

```bash
# Scanner les images
docker scan saifmed/projchat-backend:latest
```

### Performance
- 📦 Optimiser la taille des images
- 🏃‍♂️ Utiliser des layers efficaces
- 🗜️ Compresser les images

```bash
# Voir la taille des images
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep projchat
```

### Versioning
- 📅 Utiliser des tags sémantiques (v1.0.0)
- 🔄 Maintenir le tag `latest` à jour
- 📚 Documenter les changements

## 🚨 Dépannage

### Problèmes de push
```bash
# Erreur: denied: requested access to the resource is denied
# Solution: Se reconnecter à Docker Hub
docker logout
docker login

# Erreur: no basic auth credentials
# Solution: Vérifier les identifiants Docker Hub
```

### Images corrompues
```bash
# Nettoyer et re-télécharger
docker system prune -a
docker pull saifmed/projchat-backend:latest
```

### Problèmes de réseau
```bash
# Configurer le proxy si nécessaire
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
```

## 📚 Documentation Complémentaire

- [Docker Hub Documentation](https://docs.docker.com/docker-hub/)
- [Docker Build Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Reference](https://docs.docker.com/compose/)

## 🆘 Support

En cas de problème avec les images Docker Hub:
1. Vérifier la connexion: `docker login`
2. Vérifier les tags: `docker images`
3. Consulter les logs: `docker logs <container>`
4. Créer une issue sur le repository

---

**Maintenu par: saifmed**  
**Dernière mise à jour: $(date)**
