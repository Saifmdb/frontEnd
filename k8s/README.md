# Kubernetes manifests

Deploys the built SPA behind nginx, which reverse-proxies API/admin/static/
media/WebSocket traffic to the backend on the same origin — the browser only
ever talks to one host (see `ingress.yaml`), so there's no CORS and no
cross-site cookie handling to worry about for the Django session-based login
flows.

The image itself is built **in-cluster, directly from this repo's GitHub URL**
by `build-job.yaml` (Kaniko) — no Docker Hub, no local `docker build`.

**`./deploy.sh`** runs the whole sequence below in one command with a live
progress bar, checks the Backend prerequisites first, and is safe to re-run
(e.g. after a new push). Requires the Backend repo's own `k8s/deploy.sh` to
have been run first — see below.

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
4. **TLS is required for Microsoft login to work at all, not just nice-to-have**:
   `msal-browser` needs `window.crypto.subtle` (Web Crypto API) for PKCE, which
   browsers only expose in a secure context (HTTPS, or `localhost`) — over
   plain HTTP the "Sign in with Microsoft" button initializes and then fails
   with `BrowserAuthError: crypto_nonexistent`, silently staying disabled.
   `ingress.yaml`'s `tls:` block expects a `honoris-frontend-tls` Secret; for
   this fake/local domain a self-signed cert is enough (the browser will show
   a one-time "not secure" warning to click through). **`./deploy.sh` now
   generates this automatically** (matching whatever host is set in
   `ingress.yaml`) if the secret doesn't already exist, so this no longer
   blocks the deploy flow — to do it yourself instead:
   ```bash
   openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
     -keyout /tmp/tls.key -out /tmp/tls.crt \
     -subj "/CN=honoris.example.com" \
     -addext "subjectAltName=DNS:honoris.example.com"
   kubectl create secret tls honoris-frontend-tls -n honoris \
     --cert=/tmp/tls.crt --key=/tmp/tls.key
   rm /tmp/tls.key /tmp/tls.crt
   ```
   For a real domain, use cert-manager + a real CA instead (Let's Encrypt
   can't verify a domain like `honoris.example.com` that only resolves via
   `/etc/hosts`) — swap the commented-out `cert-manager.io/cluster-issuer`
   annotation back in.
   > Also add the exact origin you're serving from (`https://honoris.example.com`,
   > or whatever real domain you use) as a **Redirect URI (SPA platform)** on
   > the Azure AD app registration — MSAL rejects a mismatched redirect URI.
5. **Before building the image**, copy `secret.example.yaml` to `secret.yaml`
   and fill in the real `VITE_MSAL_CLIENT_ID` (and, if your Azure AD tenant
   isn't `common`, `VITE_MSAL_AUTHORITY`), plus `VITE_MSAL_REDIRECT_URI` and
   `VITE_BACKEND_URL` for the domain you're serving from — `build-job.yaml`
   reads all four from that Secret. This is the one thing here that's baked
   in at image **build** time, not configurable from the running container:

   > Vite replaces every `import.meta.env.VITE_*` reference with its actual
   > value at `npm run build` time (which Kaniko runs during `build-job.yaml`,
   > not later). A Kubernetes ConfigMap/Secret on the running nginx container
   > has no effect on the already-built JS bundle — if `VITE_MSAL_CLIENT_ID`
   > is missing when the image is built, Microsoft login is broken in that
   > image, full stop, and the only fix is rebuilding it with the value set.
   > Same for `VITE_MSAL_REDIRECT_URI`: it must exactly match a Redirect URI
   > (SPA platform) registered on the Azure AD app behind `VITE_MSAL_CLIENT_ID`,
   > or sign-in fails with `AADSTS50011`.
   >
   > `VITE_API_BASE_URL` is left at the Dockerfile's relative-path default
   > (`/api`) since it works on **any** domain through the reverse proxy
   > above. `VITE_BACKEND_URL` can't be relative the same way — the
   > notifications socket in `chatbot.jsx`/`SignIn.jsx` builds a `ws(s)://` URL
   > off of it — so it's set explicitly to the full origin in `secret.yaml`
   > and passed as a build-arg alongside the MSAL values.

## Deploy

```bash
# after the Backend manifests (registry included) are applied and healthy:
kubectl apply -f 00-namespace.yaml

cp secret.example.yaml secret.yaml   # edit with real MSAL values, then:
kubectl apply -f secret.yaml

# TLS secret for MSAL (see step 4 above) — must exist before applying ingress.yaml;
# ./deploy.sh generates this for you automatically if it's missing:
kubectl create secret tls honoris-frontend-tls -n honoris --cert=... --key=...

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
