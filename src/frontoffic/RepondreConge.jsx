import { useState } from 'react';
import PropTypes from 'prop-types';
import { authFetch } from "../api/authFetch.js";
import './frontcss/repondre-conge.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
const BACKEND_ORIGIN = (API_URL || '').replace(/\/api\/?$/, '') || 'http://localhost:8000';

export default function RepondreConge({ demande, onBack, onStatusUpdate }) {
  const [commentaire, setCommentaire] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const isPending = demande.statut === 'EN_ATTENTE' || demande.statut === 'EN_ATTENTE_MANAGER';

  const handleAction = async (actionType) => {
    if (!demande) return;
    if (actionType === 'refuser' && !commentaire.trim()) {
        setMessage({ type: "error", text: "Veuillez préciser la raison du refus." });
        return;
    }

    setLoading(true);
    try {
      const endpoint = actionType === "approuver" ? "approuver" : "refuser";
      const response = await authFetch(
        `${API_URL}/conges/${endpoint}/${demande.id}/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commentaire }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setMessage({
          type: "success",
          text: actionType === "approuver" ? "La demande a été approuvée avec succès." : "La demande a été refusée.",
        });
        setTimeout(() => {
          onStatusUpdate();
        }, 1500);
      } else {
        setMessage({ type: "error", text: data.error || "Une erreur est survenue" });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur de connexion au serveur" });
    } finally {
      setLoading(false);
    }
  };

  const calculateSoldeWidth = (solde) => {
    // Arbitrary max value to show a progress bar. Assuming max 30 days.
    const maxDays = 30;
    const value = typeof solde === 'number' ? solde : parseInt(solde) || 0;
    const percentage = Math.min(Math.max((value / maxDays) * 100, 0), 100);
    return `${percentage}%`;
  };

  return (
    <div className="rc-container">
      {/* Breadcrumb */}
      <nav className="rc-breadcrumb">
        <span onClick={() => window.location.href = '/welcome'}>Accueil</span>
        <span className="rc-breadcrumb-icon">chevron_right</span>
        <span onClick={onBack}>Gestion congé</span>
        <span className="rc-breadcrumb-icon">chevron_right</span>
        <span className="rc-active">Répondre</span>
      </nav>

      {/* Main Header */}
      <div className="rc-header">
        <h1 className="rc-headline rc-title">Détails de la demande de congé</h1>
        <div className="rc-title-underline"></div>
      </div>

      {message.text && (
        <div className={`rc-alert rc-alert-${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage({ type: "", text: "" })}>&times;</button>
        </div>
      )}

      <div className="rc-grid">
        {/* Left Column: Employee & Request Info */}
        <div className="rc-left-col rc-space-y-12">
          
          {/* Employee Information Section */}
          <section className="rc-card-employee">
            <div className="rc-avatar-container">
              <div className="rc-avatar">
                {demande.demandeur?.full_name ? demande.demandeur.full_name.charAt(0) : 'U'}
              </div>
              <div className="rc-status-dot"></div>
            </div>
            <div style={{flex: 1}}>
              <h2 className="rc-headline rc-emp-name">{demande.demandeur?.full_name || 'Utilisateur inconnu'}</h2>
              <p className="rc-emp-role">{demande.demandeur?.departement || 'Collaborateur'}</p>
              <div className="rc-emp-stats">
                <div>
                  <span className="rc-stat-label">Matricule</span>
                  <span className="rc-stat-value">{demande.demandeur?.matricule || 'Non spécifié'}</span>
                </div>
                <div>
                  <span className="rc-stat-label">Ancienneté</span>
                  <span className="rc-stat-value">{demande.demandeur?.anciennete || 'Non spécifiée'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Leave Details Section */}
          <section className="rc-space-y-6">
            <div className="rc-details-grid">
              {/* Type & Period */}
              <div className="rc-detail-box-primary">
                <span className="rc-box-label">Type de congé</span>
                <span className="rc-headline rc-box-value">{demande.type_conge_display}</span>
                <div className="rc-dates-row">
                  <span className="material-symbols-outlined" style={{fontSize: '1.25rem'}}>calendar_today</span>
                  <span>
                    {new Date(demande.date_debut).toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit', year:'2-digit'})} — {new Date(demande.date_fin).toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit', year:'2-digit'})}
                  </span>
                </div>
              </div>

              {/* Duration & Balance */}
              <div className="rc-detail-box-secondary">
                <div className="rc-balance-header">
                  <div>
                    <span className="rc-box-label rc-box-label-alt">Durée demandée</span>
                    <span className="rc-headline rc-box-value-alt">{demande.nombre_jours} jours</span>
                  </div>
                  <div className="rc-balance-text">
                    <span className="rc-box-label rc-box-label-alt">Solde actuel</span>
                    <span className="rc-balance-val">{demande.demandeur?.solde_conge ?? '?'} jours restants</span>
                  </div>
                </div>
                <div className="rc-progress-bar-bg">
                  <div className="rc-progress-bar-fill" style={{width: calculateSoldeWidth(demande.demandeur?.solde_conge ?? 0)}}></div>
                </div>
              </div>
            </div>

            {/* Context/Justification */}
            <div className="rc-note-box">
              <h3 className="rc-headline rc-note-title">
                <span className="rc-note-icon">info</span> Note de l&apos;employé
              </h3>
              <p className="rc-note-text">
                &quot;{demande.motif || 'Aucun motif fourni pour cette demande.'}&quot;
              </p>
              {demande.justificatif_url && (
                <a 
                  href={demande.justificatif_url.startsWith('http') ? demande.justificatif_url : `${BACKEND_ORIGIN}${demande.justificatif_url}`}
                  target="_blank" rel="noopener noreferrer"
                  className="rc-attachment-link"
                >
                  <span className="material-symbols-outlined">attach_file</span>
                  Consulter le justificatif
                </a>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: HR Response Form */}
        <div className="rc-right-col">
          <section className="rc-form-card">
            <h3 className="rc-headline rc-form-title">Réponse RH</h3>
            
            <div className="rc-space-y-6">
              <div className="rc-form-group">
                <label className="rc-label" htmlFor="hr-comment">Commentaires ou motifs</label>
                <div className="rc-textarea-container">
                  <textarea 
                    id="hr-comment"
                    className="rc-textarea"
                    rows="6"
                    placeholder="Précisez les raisons de l'approbation ou du refus..."
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    disabled={!isPending || loading}
                  ></textarea>
                  <div className="rc-textarea-tools">
                    <span className="rc-tool-icon">format_bold</span>
                    <span className="rc-tool-icon">format_italic</span>
                    <span className="rc-tool-icon">link</span>
                  </div>
                </div>
              </div>

              {isPending ? (
                <div className="rc-actions">
                  <button 
                    className="rc-btn-approve group" 
                    onClick={() => handleAction('approuver')}
                    disabled={loading}
                  >
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                    {loading ? "Chargement..." : "Approuver la demande"}
                  </button>
                  <button 
                    className="rc-btn-refuse group" 
                    onClick={() => handleAction('refuser')}
                    disabled={loading}
                  >
                    <span className="material-symbols-outlined">cancel</span>
                    {loading ? "Chargement..." : "Refuser la demande"}
                  </button>
                </div>
              ) : (
                <div className={`rc-alert ${demande.statut === 'APPROUVE' ? 'rc-alert-success' : 'rc-alert-error'}`} style={{marginTop: '1rem', justifyContent: 'center'}}>
                  STATUT : {demande.statut === 'APPROUVE' ? 'APPROUVÉ' : 'REFUSÉ'}
                </div>
              )}
              
              <p className="rc-notice">Une notification automatique sera envoyée à l&apos;employé dès validation.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

RepondreConge.propTypes = {
  demande: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    statut: PropTypes.string,
    demandeur: PropTypes.shape({
      full_name: PropTypes.string,
      departement: PropTypes.string,
      matricule: PropTypes.string,
      anciennete: PropTypes.string,
      solde_conge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    type_conge_display: PropTypes.string,
    date_debut: PropTypes.string,
    date_fin: PropTypes.string,
    nombre_jours: PropTypes.number,
    motif: PropTypes.string,
    justificatif_url: PropTypes.string,
  }).isRequired,
  onBack: PropTypes.func.isRequired,
  onStatusUpdate: PropTypes.func.isRequired,
};