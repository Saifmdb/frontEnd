#!/usr/bin/env bash
# One-command deploy of the frontend, in the order documented in README.md,
# with a live progress bar per step.
#
# Requires the Backend repo's k8s stack already deployed and healthy in the
# same "honoris" namespace (its own ./deploy.sh) — this script checks for
# that and fails clearly rather than limping along half-configured.
#
# Safe to re-run: the image-build Job is deleted and recreated each time so
# it always builds from whatever is currently pushed to GitHub.
set -uo pipefail

NS=honoris
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

STEP=0
TOTAL=7

# ── UI helpers (same as Backend/k8s/deploy.sh, kept in sync) ───────────────
BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; DIM='\033[2m'; NC='\033[0m'
SPIN='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'

step_header() {
  STEP=$((STEP + 1))
  printf "\n${BLUE}[%d/%d]${NC} %s\n" "$STEP" "$TOTAL" "$1"
}

fail() {
  printf "\r\033[K${RED}✗ %s${NC} — %s\n" "$1" "$2"
  echo -e "${DIM}Aborting. Fix the issue above, then just re-run this script — it's safe to re-run.${NC}"
  exit 1
}

wait_for() {
  local desc="$1" cond="$2" timeout="$3"
  local start elapsed pct filled bar i=0
  start=$(date +%s)
  while true; do
    if eval "$cond" >/dev/null 2>&1; then
      elapsed=$(( $(date +%s) - start ))
      printf "\r\033[K${GREEN}✓ %s${NC} ${DIM}(%ds)${NC}\n" "$desc" "$elapsed"
      return 0
    fi
    elapsed=$(( $(date +%s) - start ))
    if [ "$elapsed" -ge "$timeout" ]; then
      printf "\r\033[K"
      return 1
    fi
    pct=$(( elapsed * 100 / timeout )); [ "$pct" -gt 100 ] && pct=100
    filled=$(( pct / 5 ))
    bar=$(printf "%0.s#" $(seq 1 "$filled" 2>/dev/null) 2>/dev/null)
    bar="${bar}$(printf "%0.s-" $(seq 1 $((20 - filled)) 2>/dev/null) 2>/dev/null)"
    printf "\r${DIM}%s${NC} [%s] %3d%% %s (%ds)" "${SPIN:$((i % 10)):1}" "$bar" "$pct" "$desc" "$elapsed"
    i=$((i + 1))
    sleep 1
  done
}

run_or_fail() {
  local desc="$1"; shift
  if ! "$@" >/tmp/deploy-front-step.log 2>&1; then
    fail "$desc" "$(tail -5 /tmp/deploy-front-step.log)"
  fi
}

# ── 0. Backend stack actually up? ─────────────────────────────────────────
step_header "Vérification des dépendances (Backend)"
kubectl get svc registry -n "$NS" >/dev/null 2>&1 \
  || fail "Service 'registry' introuvable dans $NS" "Lance d'abord ../../Backend/k8s/deploy.sh"
kubectl get svc honoris-backend -n "$NS" >/dev/null 2>&1 \
  || fail "Service 'honoris-backend' introuvable dans $NS" "Lance d'abord ../../Backend/k8s/deploy.sh"
kubectl get pvc honoris-media -n "$NS" >/dev/null 2>&1 \
  || fail "PVC 'honoris-media' introuvable dans $NS" "Lance d'abord ../../Backend/k8s/deploy.sh"
if [ ! -f "$DIR/secret.yaml" ]; then
  fail "Secret manquant : secret.yaml" \
    "cp $DIR/secret.example.yaml $DIR/secret.yaml, remplis VITE_MSAL_CLIENT_ID (et AUTHORITY si besoin), puis relance."
fi
kubectl get secret honoris-frontend-tls -n "$NS" >/dev/null 2>&1 \
  || fail "Secret TLS manquant : honoris-frontend-tls" \
    "MSAL a besoin d'un contexte HTTPS pour fonctionner (voir README.md, section 4) — génère un cert auto-signé et crée le secret avant de relancer."
echo -e "${GREEN}✓${NC} registry, honoris-backend, honoris-media, honoris-frontend-tls présents ; secret.yaml présent"

# ── Down: clean slate before redeploying ──────────────────────────────────
# Own resources only — never touches PVCs/Secrets/ConfigMaps or anything
# from the Backend repo.
step_header "Arrêt des ressources existantes (down)"
kubectl delete deployment honoris-frontend -n "$NS" --ignore-not-found >/dev/null 2>&1
kubectl delete job frontend-image-build -n "$NS" --ignore-not-found >/dev/null 2>&1
kubectl delete service honoris-frontend -n "$NS" --ignore-not-found >/dev/null 2>&1
kubectl delete ingress honoris-frontend -n "$NS" --ignore-not-found >/dev/null 2>&1
echo -e "${GREEN}✓${NC} ressources arrêtées"

# ── 1. Namespace + secret ──────────────────────────────────────────────────
step_header "Namespace + secret"
run_or_fail "apply namespace" kubectl apply -f "$DIR/00-namespace.yaml"
run_or_fail "apply secret" kubectl apply -f "$DIR/secret.yaml"
echo -e "${GREEN}✓${NC} namespace + secret appliqués"

# ── 2. Build frontend image (Kaniko, from GitHub) ──────────────────────────
step_header "Build de l'image frontend depuis GitHub (Kaniko)"
kubectl delete job frontend-image-build -n "$NS" --ignore-not-found >/dev/null 2>&1
run_or_fail "apply build job" kubectl apply -f "$DIR/build-job.yaml"
wait_for "Image frontend construite" \
  "kubectl get job frontend-image-build -n $NS -o jsonpath='{.status.succeeded}' | grep -q 1" 1200 \
  || fail "Build frontend échoué/trop long" "$(kubectl logs job/frontend-image-build -n "$NS" 2>&1 | tail -30)"

# ── 3. nginx config ─────────────────────────────────────────────────────────
step_header "Configuration nginx"
run_or_fail "apply nginx configmap" kubectl apply -f "$DIR/configmap-nginx.yaml"
echo -e "${GREEN}✓${NC} configmap nginx appliqué"

# ── 4. App itself ───────────────────────────────────────────────────────────
step_header "Déploiement du frontend"
run_or_fail "apply app" kubectl apply -f "$DIR/deployment.yaml" -f "$DIR/service.yaml" -f "$DIR/ingress.yaml"
kubectl rollout restart deployment/honoris-frontend -n "$NS" >/dev/null 2>&1
wait_for "Frontend disponible" \
  "kubectl get deployment honoris-frontend -n $NS -o jsonpath='{.status.availableReplicas}' | grep -q 2" 180 \
  || fail "Frontend pas prêt à temps" "$(kubectl get pods -n "$NS" -l app=honoris-frontend 2>&1; kubectl logs -n "$NS" -l app=honoris-frontend --tail=30 2>&1)"

# ── Done ──────────────────────────────────────────────────────────────────
step_header "Terminé"
echo -e "${GREEN}Frontend déployé.${NC}\n"
kubectl get pods -n "$NS" -l app=honoris-frontend
echo -e "\n${DIM}URL (nécessite ingress-nginx + 'minikube tunnel' + entrée /etc/hosts — voir README.md) :${NC}"
echo "  https://honoris.example.com  (self-signed cert — see README.md for why TLS is required, not optional, here)"
