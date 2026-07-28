// src/pages/SignIn.jsx
import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getMsalInstance, initializeMsal } from "../msalInstance";
import AuthNavbar from "./components/authNavbar.jsx";
import "../frontoffic/frontcss/signIn.css";

const API_BASE_URL = import.meta.env.REACT_APP_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

export default function SignIn() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [formErrors, setFormErrors] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [msalReady, setMsalReady] = useState(false);
  const initRanRef = useRef(false);
  const authRequestInFlightRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  const getRedirectPath = (role) => (role === "ADMIN" ? "/dashboard" : "/welcome");

  // Apply signin-page class to body and root for CSS isolation
  useEffect(() => {
    document.body.classList.add('signin-page');
    const rootElement = document.getElementById('root');
    if (rootElement) rootElement.classList.add('signin-page');
    
    return () => {
      document.body.classList.remove('signin-page');
      if (rootElement) rootElement.classList.remove('signin-page');
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const creationParam = (
      params.get("created") ||
      params.get("registered") ||
      params.get("signup") ||
      ""
    ).toLowerCase();

    const accountCreatedFromQuery = ["1", "true", "success", "ok"].includes(creationParam);
    const accountCreatedFromState = Boolean(location.state?.accountCreated);

    if (accountCreatedFromQuery || accountCreatedFromState) {
      setSuccessMessage("Creation du compte reussie. Vous pouvez maintenant vous connecter.");

      params.delete("created");
      params.delete("registered");
      params.delete("signup");

      const cleanedSearch = params.toString();
      navigate(
        `${location.pathname}${cleanedSearch ? `?${cleanedSearch}` : ""}`,
        { replace: true, state: {} }
      );
    }
  }, [location.pathname, location.search, location.state, navigate]);

  const getCsrfToken = () => {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  useEffect(() => {
    if (initRanRef.current) {
      return;
    }
    initRanRef.current = true;

    const init = async () => {
      try {
        console.log("🔧 Initializing MSAL...");
        const csrfToken = getCsrfToken();
        console.log("🔐 CSRF Token:", csrfToken ? "Found" : "Not found");
        
        let instance = await initializeMsal();
        setMsalReady(true);
        console.log("✅ MSAL initialized");
        
        try {
          // Robust retry loop for handleRedirectPromise to avoid timing/race issues
          const maxAttempts = 5;
          let attempt = 0;
          let response = null;

          while (attempt < maxAttempts && !response) {
            attempt += 1;
            try {
              // ensure instance is initialized before calling
              if (!instance) {
                await initializeMsal();
                instance = getMsalInstance();
              }
              response = await instance.handleRedirectPromise();
              if (response) break;
            } catch (errHandle) {
              const msg = String(errHandle || "");
              const code = errHandle?.errorCode || '';
              console.warn(`⚠️ handleRedirectPromise attempt ${attempt} failed:`, msg || code);

              if (msg.includes('uninitialized_public_client_application') || code === 'uninitialized_public_client_application') {
                const delayMs = 200 * attempt; // backoff
                console.log(`⏳ Waiting ${delayMs}ms before retrying MSAL initialization...`);
                await new Promise((res) => setTimeout(res, delayMs));
                try {
                  await initializeMsal();
                  instance = getMsalInstance();
                } catch (initErr) {
                  console.warn('⚠️ Re-initialize MSAL attempt failed:', initErr);
                }
                continue;
              }

              // For non-retriable errors, break and log
              console.error('❌ Non-retriable handleRedirectPromise error:', errHandle);
              break;
            }
          }

          if (response) {
            console.log("✅ MSAL redirect response received");
           
            if (response.accessToken) {
              await sendTokenToBackend(response.accessToken, "access_token");
            } else if (response.idToken) {
              await sendTokenToBackend(response.idToken, "id_token");
              try {
                const accounts = instance.getAllAccounts ? instance.getAllAccounts() : [];
                const account = response.account || (accounts && accounts[0]);
                if (account) {
                  const silentRequest = { account, scopes: ["User.Read", "openid", "profile", "email"] };
                  const tokenResp = await instance.acquireTokenSilent(silentRequest);
                  if (tokenResp && tokenResp.accessToken) {
                    console.log('🔑 Acquired access token silently after redirect');
                    await sendTokenToBackend(tokenResp.accessToken, 'access_token');
                  }
                }
              } catch (silentErr) {
                console.warn('⚠️ acquireTokenSilent failed after redirect:', silentErr);
              }
            }
          } else {
            console.log('ℹ️ No MSAL redirect response after retries');
            try {
              const accounts = instance.getAllAccounts ? instance.getAllAccounts() : [];
              if (accounts && accounts.length > 0) {
                const silentRequest = { account: accounts[0], scopes: ["User.Read", "openid", "profile", "email"] };
                const tokenResp = await instance.acquireTokenSilent(silentRequest);
                if (tokenResp && tokenResp.accessToken) {
                  console.log('🔑 Acquired access token silently (no redirect response)');
                  await sendTokenToBackend(tokenResp.accessToken, 'access_token');
                }
              }
            } catch (e) {
              console.warn('⚠️ Silent token acquisition after no-redirect-response failed:', e);
            }
          }
        } catch (redirectError) {
          console.error("❌ Error handling redirect (outer):", redirectError);
        }
      } catch (error) {
        console.error("❌ MSAL init error:", error);
        const clientId = import.meta.env.VITE_MSAL_CLIENT_ID;
        if (!clientId) {
          setErrorMessage("MSAL configuration is missing. Please check your .env file.");
        }
      }
    };
    
    init();
  }, []);

  const sendTokenToBackend = async (token, tokenType) => {
    if (authRequestInFlightRef.current) {
      console.log("⏭️ Auth request already in flight, skipping duplicate call");
      return;
    }

    authRequestInFlightRef.current = true;
    console.log(`📤 Sending ${tokenType} to backend...`);
    setLoading(true);
    setErrorMessage("");
    
    try {
      const requestBody = tokenType === "access_token" 
        ? { accessToken: token }
        : { idToken: token };
      
      const headers = { 
        "Content-Type": "application/json"
      };
      
      // Ajouter le CSRF token s'il existe
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken;
      }
      
      const res = await fetch(`${BACKEND_URL}/api/auth/microsoft/`, {
        method: "POST",
        headers: headers,
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      console.log("📥 Backend status:", res.status);
      
      const responseText = await res.text();
      let parsed = null;
      try {
        parsed = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        parsed = null;
      }

      if (!res.ok) {
        const message = parsed?.error || "Authentication failed";
        setErrorMessage(message);
        throw new Error(message);
      }

      const data = parsed || {};
      console.log("✅ Backend response:", data);
      
      if (data.success && data.user) {
        console.log("🎉 Authentication successful!");
        setErrorMessage("");
        
        // Stocker les données utilisateur complètes
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // ✅ STOCKER LE USERNAME (pour l'affichage)
        try {
          const userIdForChat = data.user.username || data.user.email || data.user.id;
          if (userIdForChat) localStorage.setItem('userId', userIdForChat);
          console.log("👤 Username stocké:", userIdForChat);
        } catch (e) {
          console.warn('Could not set userId in localStorage', e);
        }
        
        // ✅ STOCKER L'ID NUMÉRIQUE (pour les requêtes backend)
        if (data.user.id) {
          localStorage.setItem('userId_numeric', data.user.id.toString());
          console.log("🔢 ID numérique stocké:", data.user.id);
        }
        
        localStorage.setItem('microsoft_auth', 'true');
        localStorage.setItem('auth_token', token);
        
        // Sauvegarder le profil employé avec le matricule
        if (data.employee_profile) {
          console.log("📋 Saving employee profile with matricule:", data.employee_profile.matricule);
          localStorage.setItem('employee_profile', JSON.stringify(data.employee_profile));
        }
        
        // ✅ NOUVEAU: Sauvegarder le token temporaire s'il est fourni
        if (data.temp_token) {
          console.log("🔑 Saving temporary token...", data.temp_token && data.temp_token.slice ? data.temp_token.slice(0,40) : data.temp_token);
          localStorage.setItem('temp_token', data.temp_token);
        }

        // Claim any anonymous conversation stored locally (if present)
        try {
          const storedConv = localStorage.getItem('conversationId');
          if (storedConv && storedConv.startsWith('anonymous:')) {
            console.log('🔁 Claiming anonymous conversation:', storedConv);
            try {
              // Prefer using the temporary token returned by backend (session may not be established yet)
              const tempToken = data.temp_token || localStorage.getItem('temp_token');
              console.log('CLAIM TOKEN:', tempToken ? (tempToken.slice ? tempToken.slice(0,40) : tempToken) : '<<no-token>>');
              const authHeader = tempToken ? `Bearer ${tempToken}` : `Bearer ${token}`;

              const claimHeaders = {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
              };

              // Include CSRF if present
              const csrf = getCsrfToken();
              if (csrf) claimHeaders['X-CSRFToken'] = csrf;

              const claimRes = await fetch(`${BACKEND_URL}/api/chatbot/conversations/${encodeURIComponent(storedConv)}/`, {
                method: 'PATCH',
                credentials: 'include',
                headers: claimHeaders,
                body: JSON.stringify({ title: 'Reclaimed conversation' }),
              });

              if (!claimRes.ok) {
                const txt = await claimRes.text();
                console.warn('⚠️ Claim response error:', claimRes.status, txt);
              } else {
                console.log('✅ Claim request succeeded');
                // Update local userId now that claim succeeded
                try {
                  const userIdForChat = data.user.username || data.user.email || data.user.id;
                  if (userIdForChat) localStorage.setItem('userId', userIdForChat);
                } catch (e) {}
              }
            } catch (claimErr) {
              console.warn('⚠️ Claim request failed:', claimErr);
            }
          }
        } catch (e) {
          console.warn('⚠️ Error attempting to claim conversation:', e);
        }

        if (data.created) {
          setSuccessMessage("Creation du compte reussie. Redirection en cours...");
        } else {
          setSuccessMessage("Connexion reussie. Redirection en cours...");
        }
        setLoading(false);
        setTimeout(() => {
          navigate(getRedirectPath(data.user.role));
        }, 1200);
      } else {
        const message = data.error || "Authentication failed";
        setErrorMessage(message);
        throw new Error(message);
      }
    } catch (err) {
      console.error("💥 Error:", err);
      setErrorMessage(err.message);
      setLoading(false);
    } finally {
      authRequestInFlightRef.current = false;
    }
  };

  const handleMicrosoftLogin = async () => {
    if (loading || !msalReady) return;
    
    setLoading(true);
    setErrorMessage("");
    console.log("🚀 Starting Microsoft login (Redirect)...");
    
    try {
      const instance = getMsalInstance();
      
      const loginRequest = {
        scopes: [
          "User.Read", 
          "User.Read.All",  // Pour lire toutes les propriétés utilisateur
          "openid", 
          "profile", 
          "email"
        ],
        prompt: "select_account"
      };
      
      console.log("🔑 Requested scopes:", loginRequest.scopes);
      console.log("🔄 Redirecting to Microsoft...");
      await instance.loginRedirect(loginRequest);
      
    } catch (error) {
      setLoading(false);
      console.error("❌ Login error:", error);
      
      if (error.errorCode === "interaction_in_progress") {
        console.log("🔄 Trying popup as fallback...");
        await handleMicrosoftLoginPopup();
      } else {
        setErrorMessage(`Microsoft login failed: ${error.errorCode || error.message}`);
      }
    }
  };

  const handleMicrosoftLoginPopup = async () => {
    try {
      const instance = getMsalInstance();
      
      const accounts = instance.getAllAccounts();
      if (accounts.length > 0) {
        console.log("✅ Using existing account:", accounts[0].username);
        
        try {
          const silentRequest = {
            account: accounts[0],
            scopes: ["User.Read", "User.Read.All", "openid", "profile", "email"]
          };
          
          const response = await instance.acquireTokenSilent(silentRequest);
          await sendTokenToBackend(response.accessToken, "access_token");
          return;
        } catch (silentError) {
          console.log("⚠️ Silent token failed, trying popup...", silentError);
        }
      }
      
      const loginRequest = {
        scopes: ["User.Read", "User.Read.All", "openid", "profile", "email"],
        prompt: "select_account"
      };
      
      console.log("🔄 Opening Microsoft popup...");
      const response = await instance.loginPopup(loginRequest);
      
      console.log("✅ Popup login successful");
      if (response.accessToken) {
        await sendTokenToBackend(response.accessToken, "access_token");
      } else if (response.idToken) {
        await sendTokenToBackend(response.idToken, "id_token");
      }
      
    } catch (popupError) {
      console.error("❌ Popup login failed:", popupError);
      setErrorMessage("Popup authentication failed. Please try redirect method.");
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateField = (name, value) => {
    const trimmedValue = (value || "").trim();

    if (name === "email") {
      if (!trimmedValue) return "L'adresse email est obligatoire.";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedValue)) return "Format d'email invalide.";
      return "";
    }

    if (name === "password") {
      if (!value) return "Le mot de passe est obligatoire.";
      if (value.length < 6) return "Le mot de passe doit contenir au moins 6 caracteres.";
      return "";
    }

    return "";
  };

  const validateForm = () => {
    const emailError = validateField("email", formData.email);
    const passwordError = validateField("password", formData.password);
    const nextErrors = { email: emailError, password: passwordError };
    setFormErrors(nextErrors);
    return !emailError && !passwordError;
  };

  const handleFieldBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setFormErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setErrorMessage("Veuillez corriger les erreurs du formulaire.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('access_token', data.access_token);
        setSuccessMessage("Connexion reussie. Redirection en cours...");
        setTimeout(() => {
          navigate(getRedirectPath(data.user.role));
        }, 1200);
      } else {
        setErrorMessage(data.error || "Login failed");
      }
    } catch (err) {
      setErrorMessage("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthNavbar />
      <main className="signin-wrapper">
        {/* Left Section - Hero (Hidden on Mobile) */}
        <section className="signin-hero-section">
          {/* Background Image */}
          <img
            className="signin-hero-bg"
            alt="Modern university campus"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGY6ZpI9pnfQG1DXWvOzNsab9vlUyk6DgYAHH4A9bIok5eEQE-QShdmLYMXQoIjV2KfoUthCsOsliG8OLTCNwt8TMG7GQX6-zerx9WWX1xFGsJPVhEMveB1WslpV6-kHjMQ8uAwgfmQZhB3EL9KtQCAqmxWfEesAPljyAc5bsVRW-uDjHsGNuc1Jhg7Pm793ty_LKirQ3fKOrI7KHcOAnCDm4n7RfC7tSnBV1UkB3DvkrH35cqRSeqA7U6gNmsKDh_RqzcDIhu2M8"
          />
          
          {/* Gradient Overlay */}
          <div className="signin-hero-overlay"></div>
          
          {/* Hero Content */}
          <div className="signin-hero-content">
            {/* Logo */}
            <div className="signin-hero-logo">
              <img
                className="signin-hero-logo-img"
                alt="Honoris United Universities"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKpS809JT-zJS0MPKvU_cwIv5R1laDipVg6NL0ay9FTTMkcb0bGpkSUfD8qY0kW8rjpkJMNSmKK836ezdbA1HlYn2h9ql4VzUxDwKzL2OtKuVEYFzL9BPm4MQLEg5hPsmxAYcrI86OKoRrGMBF6VXQD29WzHPniZbBI0AXmEV-zjFM7jV48cwiRYoOrOo5039q6udPfMKi9pCpK2xrIRR8xf0OoGhkM0582nJKV1z8w42HE4p5K1LnBP6RzZf4hig3bdGYT5b0b4s"
              />
            </div>
            
            {/* Title */}
            <h1 className="signin-hero-title">Former les futurs leaders de l'Afrique.</h1>
            
            {/* Subtitle */}
            <p className="signin-hero-subtitle">
              Rejoignez le premier et le plus grand réseau panafricain d'enseignement supérieur privé engagé dans la réussite des étudiants.
            </p>
            
            {/* Footer Divider */}
            <div className="signin-hero-footer">
              <div className="signin-hero-divider"></div>
              <span>HONORIS UNITED UNIVERSITIES</span>
            </div>
          </div>
        </section>

        {/* Right Section - Login Form */}
        <section className="signin-form-section">
          <div className="signin-form-wrapper">
            {/* Mobile Logo Only */}
            <div className="signin-logo-mobile">
              <img
                alt="Honoris Logo"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXPydsEk6edNUWmQ8eOA3PFVem9JrRRrqPAK6CxBclA0fb44h9Yoyssrv5np_vM0k23XqkvCFN_eqSAeBVqmg7E3XpgnKYO1n2maV9gwGFDL08wMMRKzCV48ogXhVu-92N-PTVvjdckEOIFo5nRNN3A3uI4ODax6ADY0mNYPZfQHcqsWGhn-5NzPsl3M9dGLIDcnb_T9ux17Ad4fgAS3gtFbq29pljcLNsGq6e4htjLSiK9iFuLXw5cOJVnczeNdg7Zax2zvuTbq8"
              />
            </div>

            {/* Form Header */}
            <div className="signin-form-header">
              <h2 className="signin-form-title">Espace Collaborateur</h2>
              <p className="signin-form-subtitle">Veuillez vous identifier pour accéder à votre console.</p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="signin-error-box">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="signin-success-box" role="status" aria-live="polite">
                <span className="signin-success-badge">✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            {loading && (
              <div className="signin-progress-box" aria-live="polite">
                Verification en cours...
              </div>
            )}

            {/* Microsoft Login Button */}
            <button
              className="signin-btn-microsoft"
              onClick={handleMicrosoftLogin}
              disabled={loading || !msalReady}
            >
              <svg className="signin-ms-logo" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0h23v23H0z" fill="#f3f3f3"></path>
                <path d="M1 1h10v10H1z" fill="#f35325"></path>
                <path d="M12 1h10v10H12z" fill="#81bc06"></path>
                <path d="M1 12h10v10H1z" fill="#05a6f0"></path>
                <path d="M12 12h10v10H12z" fill="#ffba08"></path>
              </svg>
              Se connecter avec Microsoft
            </button>

            {/* Divider */}
            <div className="signin-divider-line">
              <div className="signin-divider-line-item"></div>
              <span className="signin-divider-text">Ou utiliser vos identifiants</span>
              <div className="signin-divider-line-item"></div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="signin-form-inputs">
              {/* Email Field */}
              <div className="signin-field-group">
                <label htmlFor="email" className="signin-field-label">Adresse Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleFieldBlur}
                  placeholder="Email"
                  required
                  className={`signin-field-input ${formErrors.email ? "is-invalid" : ""}`}
                  disabled={loading}
                  aria-invalid={Boolean(formErrors.email)}
                />
                {formErrors.email && <p className="signin-field-error">{formErrors.email}</p>}
              </div>

              {/* Password Field */}
              <div className="signin-field-group">
                <div className="signin-field-label-row">
                  <label htmlFor="password" className="signin-field-label">Mot de passe</label>
                  <a href="#" className="signin-field-forgot">Oublié ?</a>
                </div>
                <div className="signin-field-password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleFieldBlur}
                    placeholder="••••••••"
                    required
                    className={`signin-field-input ${formErrors.password ? "is-invalid" : ""}`}
                    disabled={loading}
                    aria-invalid={Boolean(formErrors.password)}
                  />
                  <button
                    type="button"
                    className="signin-field-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {formErrors.password && <p className="signin-field-error">{formErrors.password}</p>}
              </div>

              {/* Remember Me */}
              <div className="signin-field-remember">
                <input 
                  type="checkbox" 
                  id="remember" 
                  className="signin-field-checkbox"
                />
                <label htmlFor="remember" className="signin-field-checkbox-label">
                  Rester connecté
                </label>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="signin-btn-submit"
                disabled={loading}
              >
                {loading ? "Connexion en cours..." : "Se Connecter"}
              </button>
            </form>

            {/* Footer Support Link */}
            <div className="signin-form-footer">
              <p>Besoin d'aide ? <a href="#">Contactez le support IT</a></p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}