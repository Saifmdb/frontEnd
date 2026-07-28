import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/navbar.jsx';
import { authFetch } from '../api/authFetch.js';
import './frontcss/historique-avance-salaire.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

function parseMonth(mois) {
  if (!mois) return { month: '---', year: '----' };
  const [y, m] = mois.split('-');
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return { month: months[Number(m) - 1] || '---', year: y };
}

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DT`;
}

function statusConfig(statut) {
  switch (statut) {
    case 'APPROUVE': return { label: 'Approuvé', cls: 'approved' };
    case 'REFUSE': return { label: 'Refusé', cls: 'refused' };
    case 'EN_ATTENTE':
    default: return { label: 'En Attente', cls: 'pending' };
  }
}

function actionIcon() {
  return 'visibility';
}

export default function HistoriqueAvanceSalaire() {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/avance-salaire/mes-demandes/`);
      const data = await res.json();
      if (data.success) {
        setDemandes(data.demandes || []);
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors du chargement.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="hist-avance-page">
      <Navbar hideDisconnectBtn={false} />

      <main className="hist-avance-main">
        <nav className="hist-breadcrumb">
          <a href="/welcome">Accueil</a>
          <span className="sep">{'>'}</span>
          <a href="/avance-salaire">Avances</a>
          <span className="sep">{'>'}</span>
          <span className="current">Historique</span>
        </nav>

        <header className="hist-header">
          <div className="hist-header-left">
            <h1 className="hist-title">
              Historique des <span className="hist-title-red">Avances</span>
            </h1>
            <p className="hist-desc">
              Consultez et suivez l'état de vos demandes d'avances sur salaire.
              Gérez votre flexibilité financière avec clarté et précision.
            </p>
          </div>
          <button className="hist-btn-new" onClick={() => navigate('/avance-salaire')}>
            <span className="material-symbols-outlined">add</span>
            Nouvelle Demande
          </button>
        </header>

        {message && <div className={`avance-msg ${message.type}`}>{message.text}</div>}

        <div className="hist-section-title">
          <span className="hist-section-bar"></span>
          Activités Récentes
        </div>

        {loading ? (
          <div className="hist-empty">
            <span className="material-symbols-outlined">progress_activity</span>
            <h3>Chargement...</h3>
          </div>
        ) : demandes.length === 0 ? (
          <div className="hist-empty">
            <span className="material-symbols-outlined">receipt_long</span>
            <h3>Aucune demande</h3>
            <p>Vous n'avez pas encore fait de demande d'avance sur salaire.</p>
          </div>
        ) : (
          <div className="hist-timeline">
            {demandes.map((d) => {
              const st = statusConfig(d.statut);
              const { month, year } = parseMonth(d.mois);
              return (
                <div className="hist-item" key={d.id}>
                  <div className={`hist-item-border ${st.cls}`}></div>

                  <div className="hist-item-date">
                    <span className="month">{month}</span>
                    <span className="day">{year}</span>
                  </div>

                  <div className="hist-item-content">
                    <div className="hist-item-field">
                      <label>Montant</label>
                      <span className="value amount">{formatAmount(d.montant)}</span>
                    </div>
                    <div className="hist-item-field">
                      <label>Mois</label>
                      <span className="value">{d.mois}</span>
                    </div>
                    <div className="hist-item-field">
                      <label>Date Soumission</label>
                      <span className="value">{formatDate(d.date_creation)}</span>
                    </div>
                    <div className="hist-item-status {st.cls}">
                      <span className="dot"></span>
                      {st.label}
                    </div>
                  </div>

                  <div className="hist-item-actions">
                    <button
                      className="hist-action-btn"
                      onClick={() => navigate(`/detail-avance/${d.id}`)}
                      title="Voir le détail"
                    >
                      <span className="material-symbols-outlined">{actionIcon()}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
