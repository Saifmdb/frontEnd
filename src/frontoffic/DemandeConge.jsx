import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";
import Navbar from "./components/navbar.jsx";
import { authFetch } from "../api/authFetch.js";
import "./frontcss/demande-conge.css";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function DemandeConge() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ date_debut: "", date_fin: "", type_conge: "", motif: "" });
  const [demandes, setDemandes] = useState([]);
  const [soldeConge, setSoldeConge] = useState(0);
  const [soldeDisponible, setSoldeDisponible] = useState(0);
  const [joursEnAttente, setJoursEnAttente] = useState(0);
  const [typesConge, setTypesConge] = useState([]);
  const [justificatifFile, setJustificatifFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [alert, setAlert] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, demandeId: null });

  const fetchMesDemandes = async () => {
    try {
      const response = await authFetch(`${API_URL}/conges/mes-demandes/`);
      if (!response.ok) return;
      const data = await response.json();
      if (data && data.success) {
        setDemandes(data.demandes);
        setSoldeConge(data.solde_conge);
        setSoldeDisponible(data.solde_disponible !== undefined ? data.solde_disponible : data.solde_conge);
        setJoursEnAttente(data.jours_en_attente || 0);
      }
    } catch (error) {}
  };

  const fetchSolde = async () => {
    try {
      const response = await authFetch(`${API_URL}/conges/solde/`);
      const data = await response.json();
      if (data.success) {
        setSoldeConge(data.solde_conge);
        setSoldeDisponible(data.solde_disponible !== undefined ? data.solde_disponible : data.solde_conge);
        setJoursEnAttente(data.jours_en_attente || 0);
      }
    } catch (error) {}
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchMesDemandes(), fetchSolde()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await fetch(`${API_URL}/conges/types/`);
        if (!res.ok) return setTypesConge([]);
        const data = await res.json();
        if (data && data.success && Array.isArray(data.types)) {
          setTypesConge(data.types);
          setFormData((f) => ({ ...f, type_conge: f.type_conge || (data.types[0] && data.types[0].value) || '' }));
        } else setTypesConge([]);
      } catch (e) { setTypesConge([]); }
    };
    fetchTypes();
  }, []);

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

    if ((name === "date_debut" || name === "date_fin") && fieldErrors.date_fin) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.date_fin;
        return next;
      });
    }

    if (name === "type_conge") {
      const isSickType = (value || '').toLowerCase().includes('malad') || (value || '').toUpperCase() === 'MALADIE';
      if (!isSickType && fieldErrors.justificatif) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.justificatif;
          return next;
        });
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!formData.type_conge) {
      errors.type_conge = "Veuillez sélectionner un type de congé.";
    }

    if (!formData.date_debut) {
      errors.date_debut = "La date de début est obligatoire.";
    }

    if (!formData.date_fin) {
      errors.date_fin = "La date de fin est obligatoire.";
    }

    if (formData.date_debut) {
      const startDate = new Date(formData.date_debut);
      if (Number.isNaN(startDate.getTime())) {
        errors.date_debut = "La date de début est invalide.";
      } else if (startDate < today) {
        errors.date_debut = "La date de début doit être égale ou postérieure à aujourd'hui.";
      }
    }

    if (formData.date_fin) {
      const endDate = new Date(formData.date_fin);
      if (Number.isNaN(endDate.getTime())) {
        errors.date_fin = "La date de fin est invalide.";
      } else if (endDate < today) {
        errors.date_fin = "La date de fin doit être égale ou postérieure à aujourd'hui.";
      }
    }

    if (formData.date_debut && formData.date_fin) {
      const startDate = new Date(formData.date_debut);
      const endDate = new Date(formData.date_fin);
      if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && endDate < startDate) {
        errors.date_fin = "La date de fin ne peut pas être avant la date de début.";
      }
    }

    const isSick = (formData.type_conge || '').toLowerCase().includes('malad') || (formData.type_conge || '').toUpperCase() === 'MALADIE';
    if (isSick && !justificatifFile) {
      errors.justificatif = "Veuillez fournir un justificatif pour congé maladie.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const calculateDays = () => {
    if (!formData.date_debut || !formData.date_fin) return 0;
    const start = new Date(formData.date_debut);
    const end = new Date(formData.date_fin);
    if (end < start) return 0;
    // Jours ouvrés uniquement : samedi (6) et dimanche (0) exclus, cohérent avec le backend.
    let count = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) count += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setAlert(null);
    if (!validateForm()) {
      setAlert({
        type: "error",
        message: "Veuillez corriger les champs en erreur avant de soumettre la demande."
      });
      return;
    }

    const joursDemandes = calculateDays();
    const isSansSolde = formData.type_conge === "SANS_SOLDE";
    if (!isSansSolde && soldeDisponible <= 0) {
      setAlert({
        type: "error",
        message: joursEnAttente > 0
          ? `Impossible de soumettre : votre solde de ${soldeConge} jour(s) est déjà entièrement engagé par ${joursEnAttente} jour(s) de demande(s) en attente de traitement.`
          : "Votre solde de congés est épuisé (0 jour restant)."
      });
      return;
    }
    if (!isSansSolde && joursDemandes > soldeDisponible) {
      setAlert({ type: "error", message: `Solde insuffisant. Il vous reste ${soldeDisponible} jour(s) réellement disponible(s), vous demandez ${joursDemandes} jour(s).` }); return;
    }

    setIsSubmitting(true);
    try {
      const isSick = (formData.type_conge || '').toLowerCase().includes('malad') || (formData.type_conge || '').toUpperCase() === 'MALADIE';
      let response;

      if (isSick || justificatifFile) {
        const payload = new FormData();
        payload.append('date_debut', formData.date_debut);
        payload.append('date_fin', formData.date_fin);
        payload.append('type_conge', formData.type_conge);
        payload.append('motif', formData.motif || '');
        if (justificatifFile) payload.append('justificatif', justificatifFile);

        response = await authFetch(`${API_URL}/conges/demander/`, { method: 'POST', body: payload });
      } else {
        response = await authFetch(`${API_URL}/conges/demander/`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData),
        });
      }

      const data = await response.json();
      if (data.success) {
        setAlert({ type: "success", message: "Demande de congé soumise avec succès!" });
        setFormData({ date_debut: "", date_fin: "", type_conge: (effectiveTypes[0] && effectiveTypes[0].value) || "", motif: "" });
        setJustificatifFile(null);
        setFileInfo(null);
        setFieldErrors({});
        await Promise.all([fetchMesDemandes(), fetchSolde()]);
        // Redirection vers la page Conges après 2 secondes
        setTimeout(() => navigate('/conges'), 2000);
      } else {
        setAlert({ type: "error", message: data.error || "Erreur lors de la soumission" });
      }
    } catch (error) {
      setAlert({ type: "error", message: "Erreur de connexion au serveur" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnnuler = async (demandeId) => {
    setConfirmModal({ isOpen: false, demandeId: null });
    try {
      const response = await authFetch(`${API_URL}/conges/annuler/${demandeId}/`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await response.json();
      if (data.success) {
        setDemandes(prev => prev.filter(d => d.id !== demandeId));
        if (data.solde_conge !== undefined) setSoldeConge(data.solde_conge);
        if (data.solde_disponible !== undefined) setSoldeDisponible(data.solde_disponible);
        if (data.jours_en_attente !== undefined) setJoursEnAttente(data.jours_en_attente);
        setAlert({ type: "success", message: "Demande annulée avec succès" });
      } else {
        setAlert({ type: "error", message: data.error || "Erreur lors de l'annulation" });
      }
    } catch (error) {}
  };

  const getStatusBadge = (statut) => {
    const statusMap = {
      APPROUVE: { text: "Approuvé", color: "success", icon: "check_circle" },
      EN_ATTENTE: { text: "En attente", color: "warning", icon: "schedule" },
      EN_ATTENTE_MANAGER: { text: "En attente Manager", color: "warning", icon: "schedule" },
      REFUSE: { text: "Refusé", color: "danger", icon: "cancel" },
      ANNULE: { text: "Annulé", color: "secondary", icon: "cancel" },
    };
    return statusMap[statut] || statusMap.EN_ATTENTE;
  };

  const localTypesFallback = [
    { value: "ANNUEL", label: "Congé annuel" },
    { value: "MALADIE", label: "Congé maladie" },
    { value: "SANS_SOLDE", label: "Congé sans solde" },
    { value: "MATERNITE", label: "Congé maternité" },
    { value: "PATERNITE", label: "Congé paternité" },
    { value: "FAMILIAL", label: "Congé familial" },
    { value: "AUTRE", label: "Autre" },
  ];

  const effectiveTypes = typesConge && typesConge.length ? typesConge : localTypesFallback;

  if (isLoading) {
    return (
      <div className="dc-new-page">
        <Navbar hideDisconnectBtn={false} />
        <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw className="animate-spin" size={48} style={{ color: '#7e0008' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="dc-new-page">
      <Navbar hideDisconnectBtn={false} />

      <main className="dc-new-main">
        <header className="dc-new-header">
          <div className="dc-new-herotext">
            <h1>Nouvelle Demande de Congé</h1>
            <p>Soumettez vos dates d'absence en quelques clics. Votre solde est mis à jour en temps réel après approbation.</p>
          </div>
          
          <div className="dc-new-soldecard">
            <span className="solde-label">Solde Actuel</span>
            <div className="solde-value">{soldeDisponible}</div>
            <span className="solde-desc">
              {joursEnAttente > 0
                ? `Jours réellement disponibles (solde de ${soldeConge}, dont ${joursEnAttente} déjà engagé(s) en attente)`
                : "Jours restants"}
            </span>
          </div>
        </header>

        {joursEnAttente > 0 && soldeDisponible <= 0 && (
          <div className="dc-new-alert dc-new-alert-error">
            <span>
              Vous avez déjà {joursEnAttente} jour(s) de demande(s) en attente de traitement qui
              engagent tout votre solde. Vous ne pouvez pas soumettre de nouvelle demande tant
              qu'elles n'ont pas été traitées.
            </span>
          </div>
        )}

        {alert && (
          <div className={`dc-new-alert dc-new-alert-${alert.type}`}>
            <span>{alert.message}</span>
            <button onClick={() => setAlert(null)}>&times;</button>
          </div>
        )}

        <div className="dc-new-content">
          {/* Form Column */}
          <div className="dc-new-form-container">
            <form className="dc-new-form" onSubmit={handleSubmit} noValidate>
              
              <div className="dc-form-group-new">
                <label>Type de congé</label>
                <select 
                  name="type_conge" 
                  value={formData.type_conge} 
                  onChange={handleInputChange}
                  className={`dc-new-input ${fieldErrors.type_conge ? 'dc-input-invalid' : ''}`}
                >
                  {effectiveTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                {fieldErrors.type_conge && <p className="dc-field-error">{fieldErrors.type_conge}</p>}
              </div>

              <div className="dc-new-row">
                <div className="dc-form-group-new">
                  <label>Date de début</label>
                  <input 
                    type="date" 
                    name="date_debut" 
                    value={formData.date_debut} 
                    onChange={handleInputChange}
                    min={new Date().toISOString().split("T")[0]}
                    className={`dc-new-input ${fieldErrors.date_debut ? 'dc-input-invalid' : ''}`}
                  />
                  {fieldErrors.date_debut && <p className="dc-field-error">{fieldErrors.date_debut}</p>}
                </div>
                <div className="dc-form-group-new">
                  <label>Date de fin</label>
                  <input 
                    type="date" 
                    name="date_fin" 
                    value={formData.date_fin} 
                    onChange={handleInputChange}
                    min={formData.date_debut || new Date().toISOString().split("T")[0]}
                    className={`dc-new-input ${fieldErrors.date_fin ? 'dc-input-invalid' : ''}`}
                  />
                  {fieldErrors.date_fin && <p className="dc-field-error">{fieldErrors.date_fin}</p>}
                </div>
              </div>

              {((formData.type_conge || '').toLowerCase().includes('malad') || (formData.type_conge || '').toUpperCase() === 'MALADIE') && (
                <div className="dc-form-group-new">
                  <label>Justificatif obligatoire</label>
                  <div className={`dc-file-dropzone ${fieldErrors.justificatif ? 'dc-input-invalid' : ''}`}>
                    <input 
                      type="file" 
                      accept="application/pdf,image/*"
                      onChange={(e) => {
                        const f = e.target.files[0] || null;
                        setJustificatifFile(f);
                        if (fieldErrors.justificatif) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.justificatif;
                            return next;
                          });
                        }
                        if (f) setFileInfo({ name: f.name, size: (f.size / 1024).toFixed(2) });
                        else setFileInfo(null);
                      }}
                    />
                    <div className="dc-file-info">
                      <span className="material-symbols-outlined">cloud_upload</span>
                      {fileInfo ? (
                        <strong>{fileInfo.name} ({fileInfo.size} KB)</strong>
                      ) : (
                        <strong>Cliquez ou glissez un fichier ici pour téléverser</strong>
                      )}
                      <p>PDF, Images (Max 5 MB)</p>
                    </div>
                  </div>
                  {fieldErrors.justificatif && <p className="dc-field-error">{fieldErrors.justificatif}</p>}
                </div>
              )}

              <div className="dc-form-group-new">
                <label>Motif de la demande</label>
                <textarea 
                  name="motif" 
                  placeholder="Précisez la raison de votre demande..." 
                  rows="4" 
                  className="dc-new-input"
                  style={{ resize: 'none' }}
                  value={formData.motif}
                  onChange={handleInputChange}
                ></textarea>
              </div>

              <div className="dc-new-actions">
                <div className="dc-calc-total">
                  <div className="dc-calc-icon-wrapper">
                    <span className="material-symbols-outlined">event_available</span>
                  </div>
                  <div className="dc-calc-text">
                    <p>Total calculé</p>
                    <p>{calculateDays()} Jours</p>
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="dc-btn-submit"
                  disabled={
                    isSubmitting ||
                    (formData.type_conge !== "SANS_SOLDE" && soldeDisponible <= 0) ||
                    (formData.type_conge !== "SANS_SOLDE" && calculateDays() > soldeDisponible)
                  }
                >
                  {isSubmitting ? "Soumission en cours..." : "Soumettre la demande"}
                  {!isSubmitting && <span className="material-symbols-outlined">send</span>}
                </button>
              </div>

            </form>
          </div>

          {/* Guidelines Column */}
          <div className="dc-new-rules-container">
            <div className="dc-rules-header">
              <h3>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>info</span>
                Règles de gestion
              </h3>
              <p>Veuillez respecter les directives suivantes pour assurer un traitement rapide de votre demande.</p>
            </div>
            
            <ul className="dc-rules-list">
              <li>
                <span className="material-symbols-outlined">check_circle</span>
                <div>
                  <p className="rule-title">Délai de soumission</p>
                  <p className="rule-desc">Toute demande doit être soumise au moins 15 jours à l'avance pour permettre l'organisation des services.</p>
                </div>
              </li>
              <li>
                <span className="material-symbols-outlined">check_circle</span>
                <div>
                  <p className="rule-title">Justificatifs obligatoires</p>
                  <p className="rule-desc">Les pièces justificatives sont requises pour les congés maladie et les événements familiaux exceptionnels.</p>
                </div>
              </li>
              <li>
                <span className="material-symbols-outlined">check_circle</span>
                <div>
                  <p className="rule-title">Processus d'approbation</p>
                  <p className="rule-desc">L'approbation de votre manager direct est indispensable avant la validation finale par le département RH.</p>
                </div>
              </li>
            </ul>

            <a href="#" className="dc-rules-link">
              Télécharger le guide complet (PDF)
              <span className="material-symbols-outlined">download</span>
            </a>
          </div>
        </div>

      </main>
    </div>
  );
}
