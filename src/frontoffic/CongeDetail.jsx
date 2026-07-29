import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "./components/navbar.jsx";
import { authFetch } from "../api/authFetch.js";
import "./frontcss/conge-detail.css";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function CongeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [demande, setDemande] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAnnulling, setIsAnnulling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [editForm, setEditForm] = useState({ date_debut: "", date_fin: "", motif: "" });

  useEffect(() => {
    const fetchDemande = async () => {
      if (!id) return;
      try {
        const response = await authFetch(`${API_URL}/conges/mes-demandes/`);
        if (!response.ok) {
          setError("Erreur lors du chargement");
          return;
        }
        const data = await response.json();
        if (data && data.success && data.demandes) {
          const found = data.demandes.find(d => d.id === parseInt(id));
          if (found) {
            setDemande(found);
            setEditForm({
              date_debut: found.date_debut ? found.date_debut.slice(0, 10) : "",
              date_fin: found.date_fin ? found.date_fin.slice(0, 10) : "",
              motif: found.motif || "",
            });
          } else {
            setError("Demande non trouvée");
          }
        }
      } catch (err) {
        console.error("Erreur fetch:", err);
        setError("Erreur de connexion");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDemande();
  }, [id]);

  const getStatusBadge = (statut) => {
    const statusMap = {
      APPROUVE: { text: "APPROUVÉ", color: "success", icon: "check_circle" },
      EN_ATTENTE: { text: "EN ATTENTE", color: "warning", icon: "schedule" },
      EN_ATTENTE_MANAGER: { text: "EN ATTENTE MANAGER", color: "warning", icon: "schedule" },
      REFUSE: { text: "REFUSÉ", color: "danger", icon: "cancel" },
      ANNULE: { text: "ANNULÉ", color: "secondary", icon: "cancel" },
    };
    return statusMap[statut] || statusMap.EN_ATTENTE;
  };

  const handleAnnuler = async () => {
    setIsAnnulling(true);

    try {
      const response = await authFetch(`${API_URL}/conges/annuler/${id}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Afficher un message de succès
        alert('Demande de congé annulée avec succès');
        // Rediriger vers la page des demandes
        setTimeout(() => navigate('/conges'), 500);
      } else {
        const errorData = await response.json();
        alert(`Erreur: ${errorData.message || 'Impossible d\'annuler la demande'}`);
      }
    } catch (err) {
      console.error('Erreur lors de l\'annulation:', err);
      alert('Erreur de connexion lors de l\'annulation');
    } finally {
      setIsAnnulling(false);
      setShowConfirm(false);
    }
  };

  const handleEditFieldChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleModifier = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await authFetch(`${API_URL}/conges/modifier/${id}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setDemande(data.demande);
        setEditForm({
          date_debut: data.demande.date_debut ? data.demande.date_debut.slice(0, 10) : "",
          date_fin: data.demande.date_fin ? data.demande.date_fin.slice(0, 10) : "",
          motif: data.demande.motif || "",
        });
        setIsEditing(false);
      } else {
        setSaveError(data.error || "Erreur lors de la modification");
      }
    } catch {
      setSaveError("Erreur de connexion lors de la modification");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="cd-page">
        <Navbar hideDisconnectBtn={false} />
        <main className="cd-main">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <p>Chargement...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !demande) {
    return (
      <div className="cd-page">
        <Navbar hideDisconnectBtn={false} />
        <main className="cd-main">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#ba1a1a', fontSize: '1.125rem', marginBottom: '1rem' }}>{error}</p>
              <button onClick={() => navigate('/conges')} className="cd-btn-back">
                Retour aux demandes
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const status = getStatusBadge(demande.statut);
  const isEditable = demande.statut === "EN_ATTENTE" || demande.statut === "EN_ATTENTE_MANAGER";
  const dateDebut = new Date(demande.date_debut).toLocaleDateString("fr-FR", { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  const dateFin = new Date(demande.date_fin).toLocaleDateString("fr-FR", { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="cd-page">
      <Navbar hideDisconnectBtn={false} />

      <main className="cd-main">
        {/* Breadcrumb */}
        <nav className="cd-breadcrumb">
          <a href="/welcome">Accueil</a>
          <span className="material-symbols-outlined">chevron_right</span>
          <a href="/conges">Mes Demandes</a>
          <span className="material-symbols-outlined">chevron_right</span>
          <span>Détails de la demande</span>
        </nav>

        {/* Header Section */}
        <header className="cd-header">
          <div>
            <div className="cd-header-top">
              <span className={`cd-badge cd-badge-${status.color}`}>
                <span className="material-symbols-outlined">{status.icon}</span>
                {status.text}
              </span>
              <span className="cd-ref">Ref: #CD-{demande.id}</span>
            </div>
            <h1 className="cd-title">{demande.type_conge_display || demande.type_conge}</h1>
          </div>
          <div className="cd-header-actions">
            {isEditable && !isEditing && (
              <button
                className="cd-btn cd-btn-edit"
                onClick={() => setIsEditing(true)}
                title="Modifier la demande"
              >
                <span className="material-symbols-outlined">edit</span>
                Modifier
              </button>
            )}
            {isEditing && (
              <>
                <button
                  className="cd-btn cd-btn-secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setSaveError(null);
                    setEditForm({
                      date_debut: demande.date_debut ? demande.date_debut.slice(0, 10) : "",
                      date_fin: demande.date_fin ? demande.date_fin.slice(0, 10) : "",
                      motif: demande.motif || "",
                    });
                  }}
                  disabled={isSaving}
                >
                  Annuler
                </button>
                <button
                  className="cd-btn cd-btn-save"
                  onClick={handleModifier}
                  disabled={isSaving}
                >
                  <span className="material-symbols-outlined">save</span>
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </>
            )}
            {isEditable && !isEditing && (
              <button
                className="cd-btn cd-btn-cancel"
                onClick={() => setShowConfirm(true)}
                disabled={isAnnulling}
              >
                <span className="material-symbols-outlined">cancel</span>
                {isAnnulling ? 'Annulation en cours...' : 'Annuler la demande'}
              </button>
            )}
          </div>
        </header>

        {saveError && (
          <div className="cd-info-box" style={{ marginBottom: '1rem', color: '#ba1a1a' }}>
            <span className="material-symbols-outlined">error</span>
            <p>{saveError}</p>
          </div>
        )}

        <div className="cd-content-grid">
          {/* Main Content */}
          <div className="cd-main-content">
            {/* Informations Principales */}
            <section className="cd-section">
              <h3 className="cd-section-title">
                <span className="cd-title-bar"></span>
                Informations Principales
              </h3>
              {isEditing ? (
                <div className="cd-info-grid">
                  <div className="cd-info-item">
                    <p className="cd-info-label">Date de début</p>
                    <input
                      type="date"
                      name="date_debut"
                      value={editForm.date_debut}
                      onChange={handleEditFieldChange}
                      className="cd-edit-input"
                    />
                  </div>
                  <div className="cd-info-item">
                    <p className="cd-info-label">Date de fin</p>
                    <input
                      type="date"
                      name="date_fin"
                      value={editForm.date_fin}
                      onChange={handleEditFieldChange}
                      className="cd-edit-input"
                    />
                  </div>
                  <div className="cd-info-item full-width">
                    <p className="cd-info-label">Motif de la demande</p>
                    <textarea
                      name="motif"
                      value={editForm.motif}
                      onChange={handleEditFieldChange}
                      className="cd-edit-input"
                      rows="3"
                    />
                  </div>
                </div>
              ) : (
                <div className="cd-info-grid">
                  <div className="cd-info-item">
                    <p className="cd-info-label">Période du congé</p>
                    <div className="cd-info-value">
                      <span className="material-symbols-outlined">calendar_today</span>
                      <p>{dateDebut} au {dateFin}</p>
                    </div>
                  </div>

                  <div className="cd-info-item">
                    <p className="cd-info-label">Durée totale</p>
                    <div className="cd-info-value">
                      <span className="material-symbols-outlined">schedule</span>
                      <p>{demande.nombre_jours} Jour(s)</p>
                    </div>
                  </div>

                  {demande.motif && (
                    <div className="cd-info-item full-width">
                      <p className="cd-info-label">Motif de la demande</p>
                      <div className="cd-motif-box">
                        <p>&quot;{demande.motif}&quot;</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Documents Section */}
            {demande.justificatif_url && (
              <section className="cd-section">
                <div className="cd-section-header">
                  <h3 className="cd-section-title-alt">Pièces Jointes</h3>
                  <span className="cd-file-count">1 Fichier</span>
                </div>
                <div className="cd-file-item">
                  <div className="cd-file-icon">
                    <span className="material-symbols-outlined">picture_as_pdf</span>
                  </div>
                  <div className="cd-file-info">
                    <p className="cd-file-name">{demande.justificatif_url.split('/').pop()}</p>
                  </div>
                  <a href={demande.justificatif_url} target="_blank" rel="noopener noreferrer" className="cd-btn-download">
                    <span className="material-symbols-outlined">download</span>
                  </a>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar: Processus de Validation */}
          <aside className="cd-sidebar">
            <div className="cd-validation-box">
              <h3 className="cd-validation-title">Processus de Validation</h3>
              <div className="cd-timeline">
                {demande.statut === "APPROUVE" && (
                  <>
                    <div className="cd-timeline-step completed">
                      <div className="cd-timeline-dot">
                        <span className="material-symbols-outlined">verified</span>
                      </div>
                      <div className="cd-timeline-content">
                        <p className="cd-timeline-label">Validé par RH</p>
                        <p className="cd-timeline-name">{demande.manager_approbateur?.full_name || "RH Department"}</p>
                        <p className="cd-timeline-date">Approuvé</p>
                      </div>
                    </div>
                    <div className="cd-timeline-step completed">
                      <div className="cd-timeline-dot">
                        <span className="material-symbols-outlined">check_circle</span>
                      </div>
                      <div className="cd-timeline-content">
                        <p className="cd-timeline-label">Validé par Manager</p>
                        <p className="cd-timeline-name">{demande.manager_approbateur?.full_name || "Non assigné"}</p>
                        <p className="cd-timeline-date">Approuvé</p>
                      </div>
                    </div>
                  </>
                )}
                <div className={`cd-timeline-step ${demande.statut !== "EN_ATTENTE" && demande.statut !== "EN_ATTENTE_MANAGER" ? "completed" : ""}`}>
                  <div className="cd-timeline-dot">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                  <div className="cd-timeline-content">
                    <p className="cd-timeline-label">Soumis</p>
                    <p className="cd-timeline-name">{demande.utilisateur_nom || "Vous"}</p>
                    <p className="cd-timeline-date">{new Date(demande.created_at || new Date()).toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>
              </div>

              {demande.statut !== "EN_ATTENTE" && demande.statut !== "EN_ATTENTE_MANAGER" && (
                <div className="cd-info-box">
                  <span className="material-symbols-outlined">info</span>
                  <p>Cette demande a été traité. Pour toute modification, veuillez contacter le service RH.</p>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="cd-modal-overlay" onClick={() => !isAnnulling && setShowConfirm(false)}>
            <div className="cd-modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="cd-modal-title">Confirmer l&apos;annulation</h3>
              <p className="cd-modal-text">
                Êtes-vous sûr de vouloir annuler cette demande de congé? Cette action est irréversible.
              </p>
              <div className="cd-modal-actions">
                <button 
                  className="cd-btn cd-btn-secondary"
                  onClick={() => setShowConfirm(false)}
                  disabled={isAnnulling}
                >
                  Annuler
                </button>
                <button 
                  className="cd-btn cd-btn-danger"
                  onClick={handleAnnuler}
                  disabled={isAnnulling}
                >
                  {isAnnulling ? 'Annulation...' : 'Confirmer l\'annulation'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
