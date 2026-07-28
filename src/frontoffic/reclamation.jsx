import { useState, useEffect } from "react";
import Navbar from "./components/navbar.jsx";
import { authFetch } from "../api/authFetch.js";
import "./frontcss/reclamation.css";

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api"}/reclamations`;

// Mapping types frontend vers backend
const TYPE_MAP = {
  "Problème Technique": "TECHNIQUE",
  "Congé refusé": "CONGE_REFUSE",
  "Solde incorrect": "SOLDE_INCORRECT",
  "Demande bloquée": "DEMANDE_BLOQUEE",
  "Autre": "AUTRE",
};

const PRIORITE_MAP = {
  "Basse": "BASSE",
  "Moyenne": "MOYENNE",
  "Haute": "HAUTE",
  "Urgente": "URGENTE",
};

export default function Reclamation() {
  const [formData, setFormData] = useState({
    type_reclamation: "",
    objet: "",
    description: "",
    priorite: "Moyenne",
    piece_jointe: null,
  });

  const [alert, setAlert] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rhDisponible, setRhDisponible] = useState(null);
  const [rhInfo, setRhInfo] = useState(null);

  useEffect(() => {
    const verifierRhDisponible = async () => {
      try {
        const response = await authFetch(`${API_BASE}/verifier-rh/`);
        const data = await response.json();

        if (data.success) {
          setRhDisponible(data.rh_disponible);
          if (data.rh_disponible) {
            setRhInfo(data.rh);
          } else {
            setAlert({
              type: "warning",
              message: data.message || "Aucun RH affecté. Contactez l'administration."
            });
          }
        }
      } catch (error) {
        console.error("Erreur vérification RH:", error);
      }
    };

    verifierRhDisponible();
  }, []);

  const leaveTypes = [
    "Problème Technique",
    "Congé refusé",
    "Solde incorrect",
    "Demande bloquée",
    "Autre",
  ];

  const priorityLevels = ["Basse", "Moyenne", "Haute"];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (fieldErrors.piece_jointe) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.piece_jointe;
        return next;
      });
    }

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormData((prev) => ({ ...prev, piece_jointe: null }));
        setFileInfo(null);
        setFieldErrors((prev) => ({
          ...prev,
          piece_jointe: "La pièce jointe ne doit pas dépasser 5 MB.",
        }));
        return;
      }

      setFormData((prev) => ({ ...prev, piece_jointe: file }));
      setFileInfo({ name: file.name, size: (file.size / 1024).toFixed(2) });
    } else {
      setFormData((prev) => ({ ...prev, piece_jointe: null }));
      setFileInfo(null);
    }
  };

  const validateForm = () => {
    const errors = {};
    const trimmedObjet = formData.objet.trim();
    const trimmedDescription = formData.description.trim();

    if (!formData.type_reclamation) {
      errors.type_reclamation = "Veuillez sélectionner un type de réclamation.";
    }

    if (!trimmedObjet) {
      errors.objet = "L'objet est obligatoire.";
    } else if (trimmedObjet.length > 200) {
      errors.objet = "L'objet ne doit pas dépasser 200 caractères.";
    }

    if (!trimmedDescription) {
      errors.description = "La description est obligatoire.";
    } else if (trimmedDescription.length < 10) {
      errors.description = "Veuillez donner plus de détails (minimum 10 caractères).";
    }

    if (formData.piece_jointe && formData.piece_jointe.size > 5 * 1024 * 1024) {
      errors.piece_jointe = "La pièce jointe ne doit pas dépasser 5 MB.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!validateForm()) {
      setAlert({
        type: "error",
        message: "Veuillez corriger les champs en erreur avant d'envoyer la réclamation.",
      });
      return;
    }

    if (!rhDisponible) {
      setAlert({
        type: "error",
        message: "Aucun RH disponible pour traiter votre réclamation. Contactez l'administration."
      });
      return;
    }

    setLoading(true);

    try {
      // Utiliser FormData pour envoyer fichier
      const formDataToSend = new FormData();
      formDataToSend.append('type_reclamation', TYPE_MAP[formData.type_reclamation] || 'AUTRE');
      formDataToSend.append('objet', formData.objet.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('priorite', PRIORITE_MAP[formData.priorite] || 'MOYENNE');
      
      if (formData.piece_jointe) {
        formDataToSend.append('piece_jointe', formData.piece_jointe);
      }

      const response = await authFetch(`${API_BASE}/creer/`, {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (data.success) {
        setAlert({
          type: "success",
          message: data.message,
        });
        
        // Reset form
        setFormData({
          type_reclamation: "",
          objet: "",
          description: "",
          priorite: "Moyenne",
          piece_jointe: null,
        });
        setFieldErrors({});
        setFileInfo(null);
      } else {
        setAlert({
          type: "error",
          message: data.error,
        });
      }
    } catch (error) {
      console.error("Erreur envoi réclamation:", error);
      setAlert({
        type: "error",
        message: "Erreur lors de l'envoi de la réclamation",
      });
    } finally {
      setLoading(false);
      setTimeout(() => setAlert(null), 5000);
    }
  };

  return (
    <div className="reclamation-page">
      <Navbar />
      <main className="reclamation-main">
        <div className="reclamation-grid">
          <section className="reclamation-left">
            <div className="reclamation-header">
              <h1 className="reclamation-title">Nouvelle Réclamation</h1>
              <p className="reclamation-subtitle">
                Soumettez vos demandes professionnelles. Notre équipe de gestion
                s&apos;engage à traiter chaque dossier avec la plus grande attention.
              </p>
            </div>

            {alert && (
              <div className={`reclamation-alert reclamation-alert-${alert.type}`}>
                <span className="material-symbols-outlined">
                  {alert.type === "success" ? "check_circle" : "info"}
                </span>
                <span>{alert.message}</span>
              </div>
            )}

            {rhDisponible && rhInfo && (
              <div className="reclamation-rh-status ok">
                <span className="material-symbols-outlined">check_circle</span>
                <span>Destinataire RH: <strong>{rhInfo.nom}</strong></span>
              </div>
            )}
            {rhDisponible === false && (
              <div className="reclamation-rh-status warn">
                <span className="material-symbols-outlined">info</span>
                <span>Aucun RH affecté à votre hiérarchie. Contactez l&apos;administration.</span>
              </div>
            )}

            <div className="reclamation-form-card">
              <form className="reclamation-form" onSubmit={handleSubmit} noValidate>
                <div className="reclamation-form-top-row">
                  <div className="reclamation-form-group">
                    <label htmlFor="type_reclamation" className="reclamation-label">
                      Type de réclamation
                    </label>
                    <select
                      id="type_reclamation"
                      name="type_reclamation"
                      value={formData.type_reclamation}
                      onChange={handleInputChange}
                      className={`reclamation-select ${fieldErrors.type_reclamation ? "reclamation-field-invalid" : ""}`}
                    >
                      <option value="">Sélectionnez un type</option>
                      {leaveTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    {fieldErrors.type_reclamation && (
                      <p className="reclamation-field-error">{fieldErrors.type_reclamation}</p>
                    )}
                  </div>

                  <div className="reclamation-form-group">
                    <label className="reclamation-label">Niveau de priorité</label>
                    <div className="reclamation-priority-row">
                      {priorityLevels.map((level) => (
                        <button
                          key={level}
                          type="button"
                          className={`priority-chip ${formData.priorite === level ? "active" : ""}`}
                          onClick={() => setFormData((prev) => ({ ...prev, priorite: level }))}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="reclamation-form-group">
                  <label htmlFor="objet" className="reclamation-label">Objet</label>
                  <input
                    id="objet"
                    type="text"
                    name="objet"
                    value={formData.objet}
                    onChange={handleInputChange}
                    placeholder="Résumé bref de votre demande"
                    maxLength="200"
                    className={`reclamation-input ${fieldErrors.objet ? "reclamation-field-invalid" : ""}`}
                  />
                  {fieldErrors.objet && <p className="reclamation-field-error">{fieldErrors.objet}</p>}
                </div>

                <div className="reclamation-form-group">
                  <label htmlFor="description" className="reclamation-label">Description détaillée</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Veuillez détailler les faits et le contexte..."
                    rows="6"
                    className={`reclamation-textarea ${fieldErrors.description ? "reclamation-field-invalid" : ""}`}
                  ></textarea>
                  {fieldErrors.description && <p className="reclamation-field-error">{fieldErrors.description}</p>}
                </div>

                <div className="reclamation-form-group">
                  <label htmlFor="piece_jointe" className="reclamation-label">Pièce jointe</label>
                  <div className={`reclamation-file-dropzone ${fieldErrors.piece_jointe ? "reclamation-field-invalid" : ""}`}>
                    <input
                      id="piece_jointe"
                      type="file"
                      name="piece_jointe"
                      onChange={handleFileChange}
                      className="reclamation-file-input"
                      accept="image/*,.pdf,.doc,.docx"
                    />
                    <div className="reclamation-file-overlay">
                      <p>{fileInfo ? `${fileInfo.name} (${fileInfo.size} KB)` : "Cliquez ou déposez vos fichiers ici"}</p>
                      <span>PDF, JPG ou PNG (Max 5MB)</span>
                    </div>
                  </div>
                  {fieldErrors.piece_jointe && <p className="reclamation-field-error">{fieldErrors.piece_jointe}</p>}
                </div>

                <div className="reclamation-submit-wrap">
                  <button
                    type="submit"
                    className="reclamation-submit-btn"
                    disabled={loading || !rhDisponible}
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined spinning">progress_activity</span>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        Envoyer la réclamation
                        <span className="material-symbols-outlined">send</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>

          <aside className="reclamation-sidebar">
            <div className="sidebar-card tips-card">
              <div className="sidebar-card-header">
                <span className="material-symbols-outlined">lightbulb</span>
                <h3>Conseils de rédaction</h3>
              </div>
              <ul>
                <li><span>01.</span><p>Soyez factuel et précis dans votre description des événements.</p></li>
                <li><span>02.</span><p>Joignez systématiquement les documents justificatifs si disponibles.</p></li>
                <li><span>03.</span><p>Indiquez clairement l&apos;impact du problème sur votre travail quotidien.</p></li>
              </ul>
            </div>

            <div className="sidebar-card trust-card">
              <div className="sidebar-card-header">
                <span className="material-symbols-outlined">verified_user</span>
                <h3>Engagement Honoris</h3>
              </div>
              <p>
                Honoris United Universities s&apos;engage à traiter votre réclamation en toute
                confidentialité. Vos données personnelles sont protégées selon notre charte
                éthique et la réglementation en vigueur.
              </p>
              <button type="button" className="policy-link">
                Consulter la politique RH
                <span className="material-symbols-outlined">open_in_new</span>
              </button>
            </div>
          </aside>
        </div>
      </main>

      <footer className="reclamation-footer">
        <div className="reclamation-footer-inner">
          <div className="footer-brand">Honoris United Universities</div>
          <nav className="footer-links">
            <a href="#">Mentions Légales</a>
            <a href="#">Politique de Confidentialité</a>
            <a href="#">Contact Support</a>
          </nav>
          <div className="footer-copy">© 2024 Honoris United Universities. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
