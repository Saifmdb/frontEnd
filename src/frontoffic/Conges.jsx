import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./components/navbar.jsx";
import { authFetch } from "../api/authFetch.js";
import "./frontcss/conges.css";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function Conges() {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState([]);
  const [filteredDemandes, setFilteredDemandes] = useState([]);
  const [soldeConge, setSoldeConge] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ approved: 0, pending: 0, rejected: 0 });
  const [selectedDemande, setSelectedDemande] = useState(null);

  // Matricule de l'utilisateur courant, utilisé uniquement pour construire le lien
  // vers sa propre page de nouvelle demande (pas pour l'authentification des appels API).
  const getMatricule = () => {
    try {
      const userData = localStorage.getItem('user');
      const profileData = localStorage.getItem('employee_profile');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.matricule) return user.matricule;
      }
      if (profileData) {
        const profile = JSON.parse(profileData);
        if (profile.matricule) return profile.matricule;
      }
    } catch (e) {
      console.error("Erreur parsing user:", e);
    }
    return null;
  };

  const matricule = getMatricule();

  const fetchMesDemandes = async () => {
    try {
      const response = await authFetch(`${API_URL}/conges/mes-demandes/`);
      if (!response.ok) return;
      const data = await response.json();
      if (data && data.success) {
        setDemandes(data.demandes);
        setSoldeConge(data.solde_conge);
        calculateStats(data.demandes);
        applyFilters(data.demandes, searchTerm, statusFilter, dateFilter);
      }
    } catch (error) {
      console.error("Erreur fetch demandes:", error);
    }
  };

  const fetchSolde = async () => {
    try {
      const response = await authFetch(`${API_URL}/conges/solde/`);
      const data = await response.json();
      if (data.success) {
        setSoldeConge(data.solde_conge);
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

  const calculateStats = (demandesList) => {
    const approved = demandesList.filter(d => d.statut === 'APPROUVE').length;
    const pending = demandesList.filter(d => d.statut === 'EN_ATTENTE' || d.statut === 'EN_ATTENTE_MANAGER').length;
    const rejected = demandesList.filter(d => d.statut === 'REFUSE').length;
    setStats({ approved, pending, rejected });
  };

  const applyFilters = (list, search, status, date) => {
    let filtered = list;

    if (search.trim()) {
      filtered = filtered.filter(d =>
        d.type_conge_display?.toLowerCase().includes(search.toLowerCase()) ||
        d.motif?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (status !== 'all') {
      filtered = filtered.filter(d => d.statut === status);
    }

    if (date) {
      filtered = filtered.filter(d => d.date_debut?.startsWith(date));
    }

    setFilteredDemandes(filtered);
  };

  useEffect(() => {
    applyFilters(demandes, searchTerm, statusFilter, dateFilter);
  }, [searchTerm, statusFilter, dateFilter, demandes]);

  const getStatusBadge = (statut) => {
    const statusMap = {
      APPROUVE: { text: "APPROUVÉ", color: "success", icon: "check_circle" },
      EN_ATTENTE: { text: "EN ATTENTE", color: "warning", icon: "schedule" },
      EN_ATTENTE_MANAGER: { text: "EN ATTENTE", color: "warning", icon: "schedule" },
      REFUSE: { text: "REFUSÉ", color: "danger", icon: "cancel" },
      ANNULE: { text: "ANNULÉ", color: "secondary", icon: "cancel" },
    };
    return statusMap[statut] || statusMap.EN_ATTENTE;
  };

  const handleAnnuler = async (demandeId) => {
    if (window.confirm("Êtes-vous sûr de vouloir annuler cette demande ?")) {
      try {
        const response = await authFetch(`${API_URL}/conges/annuler/${demandeId}/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        const data = await response.json();
        if (data.success) {
          setDemandes(prev => prev.filter(d => d.id !== demandeId));
          if (data.solde_conge !== undefined) setSoldeConge(data.solde_conge);
        }
      } catch (error) {
        console.error("Erreur annulation:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="conges-page">
        <Navbar hideDisconnectBtn={false} />
        <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="conges-page">
      <Navbar hideDisconnectBtn={false} />

      <main className="conges-main">
        {/* Header Section */}
        <header className="conges-header">
          <div className="conges-header-content">
            <h1>Historique des demandes de congé</h1>
            <p>Consultez et gérez vos demandes passées. Suivez l'état de validation de vos congés annuels, exceptionnels ou maladies en temps réel.</p>
          </div>
          <div className="conges-header-action">
            <Link to={`/demande-conge/${matricule || 'new'}`} className="btn-nouvelle-demande">
              <span className="material-symbols-outlined">add</span>
              Nouvelle Demande
            </Link>
          </div>
        </header>

        {/* Search & Filter Bar */}
        <section className="conges-filters">
          <div className="conges-search">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Rechercher une demande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="conges-filter-controls">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tous les statuts</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="EN_ATTENTE_MANAGER">En attente Manager</option>
              <option value="APPROUVE">Approuvé</option>
              <option value="REFUSE">Refusé</option>
              <option value="ANNULE">Annulé</option>
            </select>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
        </section>

        {/* Content Grid */}
        <div className="conges-content-grid">
          {/* Main Requests Area */}
          <div className="conges-requests-area">
            {filteredDemandes.length > 0 ? (
              <div className="conges-requests-list">
                {filteredDemandes.map(demande => {
                  const status = getStatusBadge(demande.statut);
                  const dateDebut = new Date(demande.date_debut).toLocaleDateString("fr-FR");
                  const dateFin = new Date(demande.date_fin).toLocaleDateString("fr-FR");
                  
                  return (
                    <div key={demande.id} className={`conges-request-card conges-status-${status.color}`}>
                      <div className="conges-card-header">
                        <div>
                          <span className="conges-type-label">{demande.type_conge_display || demande.type_conge}</span>
                          <h3 className="conges-card-title">{dateDebut} — {dateFin}</h3>
                        </div>
                        <span className={`conges-badge conges-badge-${status.color}`}>{status.text}</span>
                      </div>

                      <div className="conges-card-details">
                        <div className="conges-detail-item">
                          <span className="material-symbols-outlined">schedule</span>
                          <span>{demande.nombre_jours} jour(s)</span>
                        </div>
                        {demande.motif && (
                          <div className="conges-detail-item">
                            <span className="material-symbols-outlined">description</span>
                            <span className="italic">{demande.motif}</span>
                          </div>
                        )}
                        {demande.commentaire_manager && (
                          <div className="conges-detail-item error">
                            <span>Motif: {demande.commentaire_manager}</span>
                          </div>
                        )}
                      </div>

                      <div className="conges-card-actions">
                        {(demande.statut === "EN_ATTENTE" || demande.statut === "EN_ATTENTE_MANAGER") && (
                          <button
                            className="btn-action btn-danger"
                            onClick={() => handleAnnuler(demande.id)}
                          >
                            ANNULER
                          </button>
                        )}
                        <button 
                          className="btn-action btn-secondary"
                          onClick={() => navigate(`/conges/${demande.id}`)}
                        >
                          DÉTAILS
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="conges-empty-state">
                <p>Aucune demande trouvée</p>
              </div>
            )}
          </div>

          {/* Sidebar Statistics */}
          <div className="conges-sidebar">
            {/* Solde Card */}
            <div className="conges-solde-card">
              <h4>Solde Restant</h4>
              <div className="conges-solde-value">
                <span className="value">{soldeConge}</span>
                <span className="unit">jours</span>
              </div>
              <p className="conges-solde-period">Période : janvier 2026 - septembre 2026</p>
             
            </div>

            {/* Stats Card */}
            <div className="conges-stats-card">
              <h4>Résumé par statut</h4>
              <div className="conges-stats-list">
                <div className="stat-item">
                  <span className="stat-dot approved"></span>
                  <span className="stat-label">Approuvées</span>
                  <span className="stat-value">{stats.approved}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-dot pending"></span>
                  <span className="stat-label">En attente</span>
                  <span className="stat-value">{stats.pending}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-dot rejected"></span>
                  <span className="stat-label">Refusées</span>
                  <span className="stat-value">{stats.rejected}</span>
                </div>
              </div>
            </div>

            {/* Support Card */}
            <div className="conges-support-card">
              <h4>Besoin d'aide ?</h4>
              <p>Contactez le service RH ou consultez notre chatbot pour vos questions sur la politique de congés.</p>
              <a href="#" className="conges-support-link">
                Consulter la politique RH
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
