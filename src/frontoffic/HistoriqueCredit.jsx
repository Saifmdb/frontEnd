import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/navbar.jsx';
import { authFetch } from '../api/authFetch.js';
import './frontcss/historique-credit.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

function getUserContext() {
  try {
    const userData = localStorage.getItem('user');
    const profileData = localStorage.getItem('employee_profile');
    const user = userData ? JSON.parse(userData) : null;
    const profile = profileData ? JSON.parse(profileData) : null;

    return {
      username: user?.username || null,
      matricule: user?.matricule || user?.profile?.matricule || profile?.matricule || null,
      role: user?.role || null,
      department: user?.depatement || user?.department || user?.profile?.depatement || user?.profile?.department || profile?.depatement || profile?.department || null,
    };
  } catch {
    return { username: null, matricule: null, role: null, department: null };
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT`;
}

function statusConfig(status) {
  switch (status) {
    case 'APPROUVE': return { label: 'Approuvé', className: 'approved' };
    case 'REFUSE': return { label: 'Refusé', className: 'rejected' };
    case 'EN_ATTENTE':
    default: return { label: 'En attente', className: 'pending' };
  }
}

function getResponsable(request) {
  return request.responsable_approbation?.full_name || request.rh_responsable?.full_name || request.manager_approbateur?.full_name || '-';
}

export default function GestionDemandesCredit() {
  const navigate = useNavigate();
  const { role, department } = useMemo(() => getUserContext(), []);
  const isRh = role === 'RH' || String(department || '').toUpperCase() === 'RH';
  const isApprover = role === 'ADMIN' || isRh;
  const [myRequests, setMyRequests] = useState([]);
  const [reviewRequests, setReviewRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [message, setMessage] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const myPromise = authFetch(`${API_URL}/credits/mes-demandes/`).then((res) => res.json());

      const reviewPromise = isApprover
        ? authFetch(`${API_URL}/credits/a-approuver/?include_closed=1`).then((res) => res.json())
        : Promise.resolve({ success: false, demandes: [] });

      const [myData, reviewData] = await Promise.all([myPromise, reviewPromise]);

      if (myData?.success) setMyRequests(myData.demandes || []);
      if (reviewData?.success) setReviewRequests(reviewData.demandes || []);
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors du chargement des demandes.' });
    } finally {
      setLoading(false);
    }
  }, [isApprover]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleRequests = isApprover ? reviewRequests : myRequests;

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return visibleRequests.filter((request) => {
      const typeLabel = request.type_pret_display || request.type_pret || '';
      const requesterLabel = request.demandeur?.full_name || request.demandeur?.username || '';
      const responsableLabel = getResponsable(request);
      const idMatch = String(request.id || '').includes(normalizedSearch);
      const typeMatch = typeLabel.toLowerCase().includes(normalizedSearch);
      const requesterMatch = requesterLabel.toLowerCase().includes(normalizedSearch);
      const responsableMatch = responsableLabel.toLowerCase().includes(normalizedSearch);
      const statusMatch = statusFilter === 'ALL' || request.statut === statusFilter;
      return statusMatch && (!normalizedSearch || idMatch || typeMatch || requesterMatch || responsableMatch);
    });
  }, [visibleRequests, search, statusFilter]);

  const statsSource = isApprover ? reviewRequests : myRequests;
  const pendingCount = statsSource.filter((request) => request.statut === 'EN_ATTENTE').length;
  const approvedCount = statsSource.filter((request) => request.statut === 'APPROUVE').length;
  const totalProcessedAmount = statsSource
    .filter((request) => request.statut === 'APPROUVE')
    .reduce((sum, request) => sum + Number(request.montant || 0), 0);

  const year = new Date().getFullYear();
  const approvedThisYear = statsSource.filter(
    (request) => request.statut === 'APPROUVE' && new Date(request.date_creation).getFullYear() === year,
  ).length;

  const pageTitle = isApprover ? 'Gestion des demandes de crédit' : 'Mes demandes de crédit';
  const pageSubtitle = isApprover
    ? 'Consultez les demandes affectées à votre périmètre et traitez celles qui sont encore ouvertes.'
    : 'Suivez l’état de vos demandes de crédit.';

  return (
    <div className="credit-management-page">
      <Navbar hideDisconnectBtn={false} />

      <main className="credit-management-main">
        <header className="management-hero">
          <div>
            <h1>{pageTitle}</h1>
            <p>{pageSubtitle}</p>
          </div>
          {!isApprover && (
            <button className="management-primary-btn" onClick={() => navigate('/credit-bancaire')}>
              Nouvelle Demande
            </button>
          )}
        </header>

        {message && <div className={`management-alert ${message.type}`}>{message.text}</div>}

        {isApprover && (
          <section className="stats-grid">
            <article className="stat-card light">
              <span className="material-symbols-outlined stat-icon">pending_actions</span>
              <p>Demandes en cours</p>
              <strong>{String(pendingCount).padStart(2, '0')}</strong>
            </article>
            <article className="stat-card light">
              <span className="material-symbols-outlined stat-icon secondary">check_circle</span>
              <p>Approuvées</p>
              <strong>{String(approvedThisYear).padStart(2, '0')}</strong>
            </article>
            <article className="stat-card light">
              <span className="material-symbols-outlined stat-icon">task_alt</span>
              <p>Demandes approuvées</p>
              <strong>{String(approvedCount).padStart(2, '0')}</strong>
            </article>
            <article className="stat-card total">
              <p>Encours total</p>
              <strong>{formatAmount(totalProcessedAmount)}</strong>
              <span>Montant total des crédits actifs</span>
            </article>
          </section>
        )}

        <section className="table-card">
          <div className="table-controls">
            <div className="search-box">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder={isApprover ? 'Rechercher par ID, type, employé ou responsable...' : 'Rechercher par ID ou type...'}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="status-filters">
              {['ALL', 'EN_ATTENTE', 'APPROUVE', 'REFUSE'].map((filter) => (
                <button
                  key={filter}
                  className={statusFilter === filter ? 'active' : ''}
                  onClick={() => setStatusFilter(filter)}
                  type="button"
                >
                  {filter === 'ALL'
                    ? 'Tout'
                    : filter === 'EN_ATTENTE'
                      ? 'En attente'
                      : filter === 'APPROUVE'
                        ? 'Approuvées'
                        : 'Refusées'}
                </button>
              ))}
            </div>
          </div>

          <div className="table-wrapper">
            <table className="history-table management-table">
              <thead>
                <tr>
                  <th>ID Requête</th>
                  <th>Type de Demande</th>
                  <th>Montant (DT)</th>
                  <th>Date de Soumission</th>
                  <th>Statut</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="empty-row">Chargement des demandes...</td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-row">Aucune demande de crédit trouvée.</td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => {
                    const badge = statusConfig(request.statut);
                    return (
                      <tr key={request.id}>
                        <td className="code">#CR-{String(request.id).padStart(4, '0')}</td>
                        <td>{request.type_pret_display || request.type_pret}</td>
                        <td>{formatAmount(request.montant)}</td>
                        <td>{formatDate(request.date_creation)}</td>
                        <td>
                          <span className={`status-pill ${badge.className}`}>{badge.label}</span>
                        </td>
                        <td className="actions-col">
                          <button className="icon-btn" onClick={() => navigate(isApprover ? `/traitement-credit/${request.id}` : `/detail-demande-credit/${request.id}`)} type="button" title="Voir le détail">
                            <span className="material-symbols-outlined">visibility</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <footer className="table-footer">
            <p>
              Affichage de {filteredRequests.length ? 1 : 0} à {filteredRequests.length} sur {filteredRequests.length} demandes de crédit
            </p>
            <div className="pagination">
              <button type="button" disabled><span className="material-symbols-outlined">chevron_left</span></button>
              <button type="button" className="current">1</button>
              <button type="button" disabled><span className="material-symbols-outlined">chevron_right</span></button>
            </div>
          </footer>
        </section>
      </main>

      
    </div>
  );
}