import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/navbar.jsx";
import { authFetch } from "../api/authFetch.js";
import "./frontcss/reclamationRespons.css";

const API_BASE = "http://127.0.0.1:8000/api/reclamations";

const TYPE_LABELS = {
  'CONGE_REFUSE': 'Congé refusé injustement',
  'SOLDE_INCORRECT': 'Erreur sur le solde de congés',
  'DEMANDE_BLOQUEE': 'Demande bloquée/sans réponse',
  'TECHNIQUE': 'Problème technique',
  'AUTRE': 'Autre'
};

export default function ReclamationRespons() {
  const navigate = useNavigate();
  const [reclamations, setReclamations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReclamation, setSelectedReclamation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [reponse, setReponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState(null);
  const itemsPerPage = 10;

  // Récupérer le rôle depuis localStorage
  const getUserRole = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.role;
      }
    } catch (e) {
      console.error("Erreur parsing user role:", e);
    }
    return null;
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString.split('T')[0]).toLocaleDateString("fr-FR");
  };

  // Get status color
  const getStatusColor = (statut) => {
    switch (statut) {
      case 'OUVERTE':
        return 'rh-status-pending';
      case 'EN_COURS':
        return 'rh-status-inprogress';
      case 'RESOLUE':
        return 'rh-status-resolved';
      case 'FERMEE':
        return 'rh-status-closed';
      default:
        return 'rh-status-pending';
    }
  };

  // Get status label
  const getStatusLabel = (statut) => {
    switch (statut) {
      case 'OUVERTE':
        return 'En attente';
      case 'EN_COURS':
        return 'En cours';
      case 'RESOLUE':
        return 'Résolue';
      case 'FERMEE':
        return 'Fermée';
      default:
        return statut;
    }
  };

  // Get priority color
  const getPriorityColor = (priorite) => {
    switch (priorite) {
      case 'BASSE':
        return 'rh-priority-low';
      case 'MOYENNE':
        return 'rh-priority-medium';
      case 'HAUTE':
        return 'rh-priority-high';
      case 'URGENTE':
        return 'rh-priority-urgent';
      default:
        return 'rh-priority-low';
    }
  };

  // Get avatar initials
  const getAvatarInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Charger les réclamations depuis l'API
  const fetchReclamations = useCallback(async () => {
    setLoadingData(true);

    try {
      const response = await authFetch(`${API_BASE}/rh/`);

      if (response.status === 401) {
        navigate('/signin', { replace: true });
        return;
      }
      
      if (response.status === 403) {
        navigate('/welcome', { replace: true });
        return;
      }

      const data = await response.json();

      if (data.success) {
        const transformed = data.reclamations.map(r => ({
          id: r.id,
          reference: `#REC-${String(r.id).padStart(4, '0')}`,
          employee_name: r.demandeur?.full_name || r.demandeur?.username || 'Inconnu',
          employee_campus: r.demandeur?.campus || '',
          subject: r.objet,
          description: r.description,
          type: TYPE_LABELS[r.type_reclamation] || r.type_reclamation,
          priority: r.priorite,
          date: r.date_creation?.split('T')[0],
          status: r.statut,
          response: r.reponse_rh,
          response_date: r.date_resolution?.split('T')[0],
          attachment: r.piece_jointe,
          attachment_name: r.piece_jointe_nom
        }));
        
        setReclamations(transformed);
      } else {
        setMessage({ type: "error", text: data.error || "Erreur lors du chargement" });
      }
    } catch (error) {
      console.error("Erreur API:", error);
      setMessage({ type: "error", text: "Erreur de connexion au serveur" });
    } finally {
      setLoadingData(false);
    }
  }, [navigate]);

  useEffect(() => {
    // Vérifier que l'utilisateur est RH
    const userRole = getUserRole();
    let hasRhLicense = false;
    try {
      const rawUser = localStorage.getItem('user');
      const rawProfile = localStorage.getItem('employee_profile');
      const parsedUser = rawUser ? JSON.parse(rawUser) : {};
      const parsedProfile = rawProfile ? JSON.parse(rawProfile) : {};
      const dept = (parsedUser?.depatement || parsedUser?.profile?.depatement || parsedProfile?.depatement || '').toUpperCase();
      hasRhLicense = userRole === 'RH' || dept === 'RH';
    } catch {
      hasRhLicense = userRole === 'RH';
    }

    if (userRole && !hasRhLicense && userRole !== 'ADMIN') {
      navigate('/welcome', { replace: true });
      return;
    }

    fetchReclamations();
  }, [navigate, fetchReclamations]);

  const closeModal = () => {
    setShowModal(false);
    setSelectedReclamation(null);
    setReponse("");
  };

  // Submit response
  const handleSubmitResponse = async () => {
    if (!selectedReclamation || !reponse.trim()) {
      setMessage({ type: "error", text: "Veuillez entrer une réponse" });
      return;
    }

    setLoading(true);

    try {
      const response = await authFetch(
        `${API_BASE}/rh/${selectedReclamation.id}/repondre/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reponse: reponse, resoudre: true })
        }
      );
      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Réponse envoyée avec succès" });
        fetchReclamations();
        closeModal();
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur lors de l'envoi de la réponse" });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    }
  };

  // Exporter les données en CSV
  const handleExport = () => {
    if (filteredReclamations.length === 0) {
      setMessage({ type: "error", text: "Aucune donnée à exporter" });
      return;
    }

    const headers = ['ID', 'Collaborateur', 'Sujet', 'Date', 'Statut', 'Priorité'];
    const csv = [
      headers.join(','),
      ...filteredReclamations.map(r =>
        [r.reference, r.employee_name, r.subject, r.date, getStatusLabel(r.status), r.priority].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `reclamations_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    setMessage({ type: "success", text: "Données exportées avec succès" });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  // Filter reclamations based on search
  const filteredReclamations = reclamations.filter(r => {
    const matchesSearch = r.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredReclamations.length / itemsPerPage);
  const paginatedReclamations = filteredReclamations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredReclamations.length);

  return (
    <div className="rh-page">
      <Navbar />
      
      <div className="rh-main">
        {/* Header */}
        <div className="rh-header">
          <div className="rh-breadcrumb">
            <button 
              className="rh-breadcrumb-link"
              onClick={() => navigate('/')}
            >
              Accueil
            </button>
            <span className="rh-breadcrumb-sep">/</span>
            <span>Réclamations</span>
          </div>
          <h1 className="rh-title">Gestion des Réclamations</h1>
          <p className="rh-subtitle">Gérez et répondez aux réclamations des employés</p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`rh-alert rh-alert-${message.type}`}>
            <span>{message.text}</span>
          </div>
        )}

        {/* Loading State */}
        {loadingData ? (
          <div className="rh-loading">
            <div className="rh-spinner"></div>
            <p>Chargement des réclamations...</p>
          </div>
        ) : (
          <>
            {/* Filters Bar */}
            <div className="rh-filters-bar">
              <div className="rh-search-box">
                <span className="material-symbols-outlined rh-search-icon">search</span>
                <input
                  type="text"
                  placeholder="Rechercher un collaborateur ou un sujet..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rh-search-input"
                />
              </div>
              <div className="rh-action-buttons">
                <button 
                  className={`rh-btn rh-btn-secondary ${showFilters ? 'rh-btn-active' : ''}`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <span className="material-symbols-outlined">filter_list</span>
                  Filtrer
                </button>
                <button 
                  className="rh-btn rh-btn-secondary"
                  onClick={handleExport}
                >
                  <span className="material-symbols-outlined">download</span>
                  Exporter
                </button>
             
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="rh-filter-panel">
                <div className="rh-filter-group">
                  <h4>Statut</h4>
                  <div className="rh-filter-options">
                    <button 
                      className={`rh-filter-option ${!filterStatus ? 'active' : ''}`}
                      onClick={() => setFilterStatus(null)}
                    >
                      Tous
                    </button>
                    <button 
                      className={`rh-filter-option ${filterStatus === 'OUVERTE' ? 'active' : ''}`}
                      onClick={() => setFilterStatus('OUVERTE')}
                    >
                      En attente
                    </button>
                    <button 
                      className={`rh-filter-option ${filterStatus === 'EN_COURS' ? 'active' : ''}`}
                      onClick={() => setFilterStatus('EN_COURS')}
                    >
                      En cours
                    </button>
                    <button 
                      className={`rh-filter-option ${filterStatus === 'RESOLUE' ? 'active' : ''}`}
                      onClick={() => setFilterStatus('RESOLUE')}
                    >
                      Résolue
                    </button>
                    <button 
                      className={`rh-filter-option ${filterStatus === 'FERMEE' ? 'active' : ''}`}
                      onClick={() => setFilterStatus('FERMEE')}
                    >
                      Fermée
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="rh-table-container">
              {paginatedReclamations.length === 0 ? (
                <div className="rh-empty-state">
                  <span className="material-symbols-outlined">inbox</span>
                  <p>Aucune réclamation trouvée</p>
                </div>
              ) : (
                <table className="rh-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Collaborateur</th>
                      <th>Sujet</th>
                      <th>Date</th>
                      <th>Statut</th>
                      <th>Priorité</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReclamations.map((rec) => (
                      <tr key={rec.id}>
                        <td className="rh-cell-id">{rec.reference}</td>
                        <td>
                          <div className="rh-employee">
                            <div className="rh-avatar">{getAvatarInitials(rec.employee_name)}</div>
                            <div className="rh-employee-info">
                              <div className="rh-employee-name">{rec.employee_name}</div>
                              <div className="rh-employee-campus">{rec.employee_campus || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="rh-subject">
                            <div className="rh-subject-title">{rec.subject}</div>
                            <div className="rh-subject-type">{rec.type}</div>
                          </div>
                        </td>
                        <td className="rh-cell-date">{formatDate(rec.date)}</td>
                        <td>
                          <span className={`rh-badge ${getStatusColor(rec.status)}`}>
                            {getStatusLabel(rec.status)}
                          </span>
                        </td>
                        <td>
                          <span className={`rh-priority ${getPriorityColor(rec.priority)}`}>
                            {rec.priority}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="rh-action-btn"
                            onClick={() => navigate(`/reclamation-responsable/${rec.id}`)}
                          >
                            Répondre
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {filteredReclamations.length > 0 && (
              <div className="rh-pagination">
                <span className="rh-pagination-info">
                  Affichage de {startIndex} à {endIndex} sur {filteredReclamations.length} réclamations
                </span>
                <div className="rh-pagination-controls">
                  <button 
                    className="rh-pagination-btn"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`rh-pagination-page ${page === currentPage ? 'rh-pagination-page-active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button 
                    className="rh-pagination-btn"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* FAB Button */}
        <button className="rh-floating-btn" title="Nouvelle demande">
          <span className="material-symbols-outlined">support_agent</span>
        </button>
      </div>

      {/* Modal */}
      {showModal && selectedReclamation && (
        <div className="rh-modal-overlay" onClick={closeModal}>
          <div className="rh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rh-modal-header">
              <h2>Répondre à la réclamation</h2>
              <button className="rh-modal-close" onClick={closeModal}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="rh-modal-content">
              <div className="rh-modal-details">
                <h3>{selectedReclamation.subject}</h3>
                <div className="rh-modal-info">
                  <span className="rh-modal-label">Collaborateur:</span>
                  <span>{selectedReclamation.employee_name}</span>
                </div>
                <div className="rh-modal-info">
                  <span className="rh-modal-label">Type:</span>
                  <span>{selectedReclamation.type}</span>
                </div>
                <div className="rh-modal-info">
                  <span className="rh-modal-label">Priorité:</span>
                  <span className={`rh-priority ${getPriorityColor(selectedReclamation.priority)}`}>
                    {selectedReclamation.priority}
                  </span>
                </div>
                <div className="rh-modal-description">
                  <span className="rh-modal-label">Description:</span>
                  <p>{selectedReclamation.description}</p>
                </div>
              </div>

              {(selectedReclamation.status === 'OUVERTE' || selectedReclamation.status === 'EN_COURS') && (
                <div className="rh-modal-input">
                  <label>Votre réponse</label>
                  <textarea
                    value={reponse}
                    onChange={(e) => setReponse(e.target.value)}
                    placeholder="Entrez votre réponse..."
                    rows="6"
                  />
                </div>
              )}
            </div>

            <div className="rh-modal-footer">
              <button className="rh-btn rh-btn-secondary" onClick={closeModal}>
                Fermer
              </button>
              {(selectedReclamation.status === 'OUVERTE' || selectedReclamation.status === 'EN_COURS') && (
                <button 
                  className="rh-btn rh-btn-primary" 
                  onClick={handleSubmitResponse}
                  disabled={loading}
                >
                  {loading ? "Envoi..." : "Envoyer"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
