# Kubernetes manifests

Deploys the built SPA behind nginx, which reverse-proxies API/admin/static/
media/WebSocket traffic to the backend on the same origin — the browser only
ever talks to one host (see `ingress.yaml`), so there's no CORS and no
cross-site cookie handling to worry about for the Django session-based login
flows.

The image itself is built **in-cluster, directly from this repo's GitHub URL**
by `build-job.yaml` (Kaniko) — no Docker Hub, no local `docker build`.

## Prerequisites

1. **The Backend repo's manifests must be applied first**, in the same
   `honoris` namespace — this deployment references things it doesn't own:
   - the in-cluster registry from `../../Backend/k8s/registry/` (where
     `build-job.yaml` pushes the built image, and where
     `deployment.yaml` pulls it from)
   - the `honoris-backend` Service (`configmap-nginx.yaml`'s proxy target)
   - the `honoris-media` PVC (mounted read-only here to serve `/media/`
     directly, since Django doesn't serve uploaded files itself once
     `DEBUG=False`)

   See `../../Backend/k8s/README.md` — including the node-level "insecure
   registry" trust step, which this repo's image build depends on just as
   much as the backend's does.
2. ingress-nginx installed in the cluster.
3. Update `honoris.example.com` in `ingress.yaml` to your real domain.
4. **Before building the image**, copy `secret.example.yaml` to `secret.yaml`
   and fill in the real `VITE_MSAL_CLIENT_ID` (and, if your Azure AD tenant
   isn't `common`, `VITE_MSAL_AUTHORITY`) — `build-job.yaml` reads these from
   that Secret. This is the one thing here that's baked in at image **build**
   time, not configurable from the running container:

   > Vite replaces every `import.meta.env.VITE_*` reference with its actual
   > value at `npm run build` time (which Kaniko runs during `build-job.yaml`,
   > not later). A Kubernetes ConfigMap/Secret on the running nginx container
   > has no effect on the already-built JS bundle — if `VITE_MSAL_CLIENT_ID`
   > is missing when the image is built, Microsoft login is broken in that
   > image, full stop, and the only fix is rebuilding it with the value set.
   >
   > Everything else (`VITE_API_BASE_URL`, `VITE_WS_BASE_URL`, etc.) is left
   > at the Dockerfile's own relative-path defaults (`/api`, empty, ...) —
   > those work on **any** domain through the reverse proxy above, so unlike
   > the MSAL values they don't need to be domain-specific or set per
   > environment, and `build-job.yaml` doesn't pass them.

## Deploy

```bash
# after the Backend manifests (registry included) are applied and healthy:
kubectl apply -f 00-namespace.yaml

cp secret.example.yaml secret.yaml   # edit with real MSAL values, then:
kubectl apply -f secret.yaml

kubectl apply -f build-job.yaml
kubectl wait --for=condition=complete job/frontend-image-build -n honoris --timeout=900s

kubectl apply -f configmap-nginx.yaml
kubectl apply -f deployment.yaml -f service.yaml -f ingress.yaml
```

## New frontend release (new commit pushed to GitHub)

```bash
kubectl delete job frontend-image-build -n honoris --ignore-not-found
kubectl apply -f build-job.yaml
kubectl wait --for=condition=complete job/frontend-image-build -n honoris --timeout=900s
kubectl rollout restart deployment/honoris-frontend -n honoris
```

No migrate-job equivalent needed for the app itself — nginx serving static
files has no schema/state to migrate.
