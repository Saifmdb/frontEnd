import { useState, useEffect } from "react";
import Navbar from "./components/navbar.jsx";
import RepondreConge from "./RepondreConge.jsx";
import { authFetch } from "../api/authFetch.js";
import "./frontcss/gestion-conges-unique.css";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function GestionCongesManager() {
  const [demandesEnAttente, setDemandesEnAttente] = useState([]);
  const [toutesLesDemandes, setToutesLesDemandes] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [commentaire, setCommentaire] = useState("");
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [showModal, setShowModal] = useState(false);
  // eslint-disable-next-line no-unused-vars -- not wired to UI yet, kept for handleAction below
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination for the table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const fetchDemandesEnAttente = async () => {
    try {
      const response = await authFetch(`${API_URL}/conges/a-approuver/`);
      const data = await response.json();
      if (data.success) {
        setDemandesEnAttente(data.demandes);
      }
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const fetchToutesLesDemandes = async () => {
    try {
      const response = await authFetch(`${API_URL}/conges/toutes/`);
      const data = await response.json();
      if (data.success) {
        setToutesLesDemandes(data.demandes);
      }
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchDemandesEnAttente(), fetchToutesLesDemandes()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    await Promise.all([fetchDemandesEnAttente(), fetchToutesLesDemandes()]);
    setIsLoading(false);
  };

  const openModal = (demande) => {
    setSelectedDemande(demande);
    setCommentaire("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDemande(null);
    setCommentaire("");
  };

  // eslint-disable-next-line no-unused-vars -- not wired to UI yet, calls backend approve/refuse endpoint
  const handleAction = async (actionType) => {
    if (!selectedDemande) return;
    setLoading(true);
    try {
      const endpoint = actionType === "approuver" ? "approuver" : "refuser";
      const response = await authFetch(
        `${API_URL}/conges/${endpoint}/${selectedDemande.id}/`,
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
          text: actionType === "approuver" ? "Demande approuvée avec succès" : "Demande refusée",
        });
        await refreshData();
        closeModal();
      } else {
        setMessage({ type: "error", text: data.error || "Une erreur est survenue" });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur de connexion au serveur" });
    } finally {
      setLoading(false);
    }
  };

  const getBadgeClass = (statut) => {
    if (statut === 'APPROUVE') return 'approved';
    if (statut === 'REFUSE') return 'refused';
    return 'pending';
  };

  const getStatusLabel = (statut) => {
    if (statut === 'APPROUVE') return 'Approuvé';
    if (statut === 'REFUSE') return 'Refusé';
    return 'En attente';
  };

  const displayedDemandes = toutesLesDemandes;
  const totalPages = Math.ceil(displayedDemandes.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDemandes = displayedDemandes.slice(startIndex, startIndex + itemsPerPage);

  const congesEnCoursCount = toutesLesDemandes.filter(d => d.statut === 'APPROUVE').length;

  if (isLoading) {
    return (
      <div className="gcm-page-wrapper">
        <Navbar hideDisconnectBtn={false} />
        <div className="gcm-main-content gcm-loading">
          <span className="material-symbols-outlined" style={{animation: 'spin 1s linear infinite', fontSize: '3rem'}}>refresh</span>
          <p style={{marginTop: '1rem', fontWeight: 500}}>Chargement des demandes...</p>
        </div>
      </div>
    );
  }

  // If a demande is selected, show the RepondreConge component instead of the table list
  if (showModal && selectedDemande) {
    return (
      <div className="gcm-page-wrapper">
        <Navbar hideDisconnectBtn={false} />
        <RepondreConge 
          demande={selectedDemande} 
          onBack={closeModal} 
          onStatusUpdate={() => {
            refreshData();
            closeModal();
          }}
        />
      </div>
    );
  }

  return (
    <div className="gcm-page-wrapper">
      <Navbar hideDisconnectBtn={false} />
      
      <main className="gcm-main-content">
        {/* Breadcrumb */}
        <nav className="gcm-breadcrumb">
          <a href="/welcome">Accueil</a>
          <span className="material-symbols-outlined">chevron_right</span>
          <span className="gcm-breadcrumb-active">Gestion des demandes</span>
        </nav>

        {/* Header Section */}
        <header className="gcm-header-section">
          <h1 className="gcm-title">Gestion des Demandes de Congés</h1>
          <p className="gcm-subtitle">
            Consultez, validez ou refusez les demandes de congés des collaborateurs du réseau Honoris. Maintenez la continuité académique en optimisant les plannings.
          </p>
          <div className="gcm-header-actions">
             <button className="gcm-refresh-btn" onClick={refreshData}>
               <span className="material-symbols-outlined">sync</span> Rafraîchir
             </button>
          </div>
        </header>

        {message.text && (
          <div className={`gcm-alert gcm-alert-${message.type}`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage({ type: "", text: "" })}>&times;</button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="gcm-stats-grid">
          <div className="gcm-stat-card pending">
            <div className="gcm-stat-card-header">
              <div>
                <p className="gcm-stat-label">En attente d&apos;approbation</p>
                <h3 className="gcm-stat-value">{demandesEnAttente.length < 10 ? '0'+demandesEnAttente.length : demandesEnAttente.length}</h3>
              </div>
              <div className="gcm-stat-icon-wrapper">
                <span className="material-symbols-outlined">pending_actions</span>
              </div>
            </div>
            <div className="gcm-stat-footer">Nécessite une action immédiate</div>
          </div>

          <div className="gcm-stat-card active-leaves">
            <div className="gcm-stat-card-header">
              <div>
                <p className="gcm-stat-label">Congés approuvés</p>
                <h3 className="gcm-stat-value">{congesEnCoursCount < 10 ? '0'+congesEnCoursCount : congesEnCoursCount}</h3>
              </div>
              <div className="gcm-stat-icon-wrapper">
                <span className="material-symbols-outlined">event_available</span>
              </div>
            </div>
            <div className="gcm-stat-footer">Collaborateurs avec congés validés</div>
          </div>

          <div className="gcm-stat-card total">
            <div className="gcm-stat-card-header">
              <div>
                <p className="gcm-stat-label">Total des demandes</p>
                <h3 className="gcm-stat-value">{toutesLesDemandes.length < 10 ? '0'+toutesLesDemandes.length : toutesLesDemandes.length}</h3>
              </div>
              <div className="gcm-stat-icon-wrapper">
                <span className="material-symbols-outlined">calendar_month</span>
              </div>
            </div>
            <div className="gcm-stat-footer">Toutes les requêtes enregistrées</div>
          </div>
        </div>

        {/* Data Table Container */}
        <div className="gcm-table-container">
          <div className="gcm-table-toolbar">
            <h2 className="gcm-table-title">Registre des Demandes</h2>
          </div>
          
          <div className="gcm-table-wrapper">
            <table className="gcm-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Collaborateur</th>
                  <th>Type de Congé</th>
                  <th>Dates</th>
                  <th>Durée</th>
                  <th>Statut</th>
                  <th className="gcm-text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDemandes.length > 0 ? (
                  paginatedDemandes.map((demande) => (
                    <tr key={demande.id}>
                      <td>#{demande.id.toString().padStart(4, '0')}</td>
                      <td>
                        <div className="gcm-collab-cell">
                          <div className="gcm-avatar">
                            <span className="material-symbols-outlined">person</span>
                          </div>
                          <div className="gcm-collab-info">
                            <span className="gcm-collab-name">{demande.demandeur?.full_name || 'Utilisateur inconnu'}</span>
                            <span className="gcm-collab-role">Employé</span>
                          </div>
                        </div>
                      </td>
                      <td className="gcm-type-cell">{demande.type_conge_display}</td>
                      <td>
                        {new Date(demande.date_debut).toLocaleDateString('fr-FR', {day: '2-digit', month:'2-digit', year:'2-digit'})} — {new Date(demande.date_fin).toLocaleDateString('fr-FR', {day: '2-digit', month:'2-digit', year:'2-digit'})}
                      </td>
                      <td>{demande.nombre_jours} jours</td>
                      <td>
                        <span className={`gcm-badge ${getBadgeClass(demande.statut)}`}>
                          <span className="gcm-badge-dot"></span>
                          {getStatusLabel(demande.statut)}
                        </span>
                      </td>
                      <td className="gcm-text-right">
                        <button className="gcm-action-link" onClick={() => openModal(demande)} style={{color: 'var(--gcm-primary)'}}>Détails</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">
                      <div className="gcm-empty-state">
                        <span className="material-symbols-outlined">inbox</span>
                        <p>Aucune demande trouvée.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="gcm-table-footer">
            <span className="gcm-pagination-info">
              Affichage de {paginatedDemandes.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + itemsPerPage, displayedDemandes.length)} sur {displayedDemandes.length} demandes
            </span>
            {totalPages > 1 && (
              <div className="gcm-pagination">
                <button 
                  className="gcm-page-btn" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>chevron_left</span>
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button 
                    key={i} 
                    className={`gcm-page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  className="gcm-page-btn" 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

    </div>
  );
}