import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/navbar.jsx';
import { authFetch } from '../api/authFetch.js';
import './frontcss/gestion-avances-salaire.css';

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
      fullName: user?.full_name || user?.first_name || profile?.full_name || null,
    };
  } catch {
    return { username: null, matricule: null, role: null, department: null, fullName: null };
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMonth(monthStr) {
  if (!monthStr) return '-';
  const [year, month] = monthStr.split('-');
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

function formatAmount(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('fr-FR')} DT`;
}

function statusConfig(status) {
  switch (status) {
    case 'APPROUVE': return { label: 'Approuvée', cls: 'status-approved' };
    case 'REFUSE': return { label: 'Refusée', cls: 'status-refused' };
    case 'EN_ATTENTE':
    default: return { label: 'En Attente', cls: 'status-pending' };
  }
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(index) {
  const colors = ['bg-secondary-container text-on-secondary-container', 'bg-surface-container-highest text-neutral-600', 'bg-primary-fixed-dim text-primary', 'bg-tertiary-fixed text-on-tertiary-fixed-variant'];
  return colors[index % colors.length];
}

export default function GestionAvancesSalaire() {
  const navigate = useNavigate();
  const { role, department } = useMemo(() => getUserContext(), []);
  const isRhManager = role === 'ORGANIZER' && String(department || '').toUpperCase() === 'RH';
  const isApprover = role === 'ADMIN' || isRhManager;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [message, setMessage] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isApprover ? 'a-approuver' : 'mes-demandes';
      const query = isApprover ? '?include_closed=1' : '';
      const res = await authFetch(`${API_URL}/avance-salaire/${endpoint}/${query}`);
      const data = await res.json();
      if (data?.success) setRequests(data.demandes || []);
      else setMessage({ type: 'error', text: data?.error || 'Erreur lors du chargement.' });
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion.' });
    } finally {
      setLoading(false);
    }
  }, [isApprover]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      const statusMatch = statusFilter === 'ALL' || r.statut === statusFilter;
      const monthMatch = monthFilter === 'ALL' || r.mois === monthFilter;
      if (!statusMatch || !monthMatch) return false;
      if (!q) return true;
      const name = r.demandeur?.full_name || r.demandeur?.username || '';
      return (
        String(r.id).includes(q) ||
        name.toLowerCase().includes(q) ||
        (r.mois || '').toLowerCase().includes(q)
      );
    });
  }, [requests, search, statusFilter, monthFilter]);

  const pendingCount = useMemo(() => requests.filter(r => r.statut === 'EN_ATTENTE').length, [requests]);

  const availableMonths = useMemo(() => {
    const months = [...new Set(requests.map(r => r.mois).filter(Boolean))];
    return months.sort().reverse();
  }, [requests]);

  const pageSubtitle = isApprover
    ? "Interface de supervision des requêtes financières. Validez, examinez et archivez les demandes de vos collaborateurs au sein du réseau Honoris."
    : "Suivez l'état de vos demandes d'avance sur salaire.";

  return (
    <div className="gestion-avance-page">
      <Navbar hideDisconnectBtn={false} />

      <main className="gestion-avance-main">
        <header className="gestion-avance-header">
          <div className="header-content">
            <h1 className="header-title">
              Gestion des <span className="text-primary italic">Avances</span> sur Salaire
            </h1>
            <p className="header-subtitle">{pageSubtitle}</p>
          </div>
          <div className="header-stats">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper">
                <span className="material-symbols-outlined">pending_actions</span>
              </div>
              <div>
                <p className="stat-label">En Attente</p>
                <p className="stat-value">{String(pendingCount).padStart(2, '0')}</p>
              </div>
            </div>
          </div>
        </header>

        {message && <div className={`gestion-msg ${message.type}`}>{message.text}</div>}

        <section className="control-bar">
          <div className="search-box">
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              placeholder="Rechercher un employé ou un ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tous les statuts</option>
              <option value="EN_ATTENTE">En Attente</option>
              <option value="APPROUVE">Approuvée</option>
              <option value="REFUSE">Refusée</option>
            </select>
            <select
              className="filter-select"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="ALL">Tous les mois</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
            <button className="filter-icon-btn">
              <span className="material-symbols-outlined">tune</span>
            </button>
            <div className="filter-divider"></div>
            {!isApprover && (
              <button className="btn-nouvelle" onClick={() => navigate('/avance-salaire')}>
                Nouvelle Requête
              </button>
            )}
          </div>
        </section>

        <section className="table-section">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employé</th>
                  <th>ID Requête</th>
                  <th>Mois</th>
                  <th>Montant</th>
                  <th>Date Soumission</th>
                  <th>Statut</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="empty-cell">Chargement...</td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-cell">Aucune demande trouvée.</td>
                  </tr>
                ) : (
                  filteredRequests.map((request, idx) => {
                    const st = statusConfig(request.statut);
                    const name = request.demandeur?.full_name || request.demandeur?.username || '-';
                    return (
                      <tr key={request.id} className="table-row">
                        <td>
                          <div className="employee-cell">
                            <div className={`avatar ${getAvatarColor(idx)}`}>
                              {getInitials(name)}
                            </div>
                            <div>
                              <p className="employee-name">{name}</p>
                              <p className="employee-role">{request.demandeur?.role || 'Employé'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="cell-id">#AV-{String(request.id).padStart(4, '0')}</td>
                        <td>{formatMonth(request.mois)}</td>
                        <td className="cell-amount">{formatAmount(request.montant)}</td>
                        <td className="cell-date">{formatDate(request.date_creation)}</td>
                        <td>
                          <span className={`status-pill ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="text-right">
                          <button
                            className="btn-details"
                            onClick={() => navigate(isApprover ? `/traitement-avance/${request.id}` : `/detail-avance/${request.id}`)}
                          >
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

          <div className="table-footer">
            <p className="footer-info">
              Affichage de {filteredRequests.length > 0 ? 1 : 0} à {filteredRequests.length} sur {filteredRequests.length} requête{filteredRequests.length !== 1 ? 's' : ''} au total
            </p>
            <div className="pagination">
              <button className="page-btn" disabled>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="page-btn active">1</button>
              <button className="page-btn" disabled>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
