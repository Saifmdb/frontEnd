import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from './components/navbar.jsx';
import { authFetch } from '../api/authFetch.js';
import './frontcss/traitement-credit.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatAmount(v) {
  const n = Number(v || 0);
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT`;
}

function StatutBadge({ statut }) {
  const map = {
    APPROUVE: { cls: 'pill-approved', label: 'Approuvé' },
    REFUSE: { cls: 'pill-rejected', label: 'Refusé' },
    EN_ATTENTE: { cls: 'pill-pending', label: 'En attente' },
  };
  const s = map[statut] || map.EN_ATTENTE;
  return <span className={`tc-pill ${s.cls}`}>{s.label}</span>;
}

StatutBadge.propTypes = {
  statut: PropTypes.string,
};

export default function TraitementCredit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [decision, setDecision] = useState('approve');
  const [commentaire, setCommentaire] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await authFetch(`${API_URL}/credits/detail/${id}/`);
        const json = await res.json();
        if (json.success) {
          setData(json);
        } else {
          setErrorMsg(json.error || 'Demande introuvable.');
        }
      } catch {
        setErrorMsg('Impossible de contacter le serveur.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const demande = data?.demande;
  const employe = data?.employe;
  const historique = data?.historique_prets || [];
  const isDone = demande?.statut !== 'EN_ATTENTE';
  const initiale = employe?.full_name?.[0]?.toUpperCase() || '?';
  const nomComplet = employe?.full_name || demande?.demandeur?.full_name || demande?.demandeur?.username || '—';
  const statutLabel = (s) => s === 'APPROUVE' ? 'Approuvé' : s === 'REFUSE' ? 'Refusé' : 'En attente';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (decision === 'reject' && !commentaire.trim()) {
      setSendError('Le motif du refus est obligatoire.');
      return;
    }
    setSending(true);
    setSendError('');
    try {
      const endpoint = decision === 'approve' ? 'approuver' : 'refuser';
      const res = await authFetch(`${API_URL}/credits/${endpoint}/${id}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentaire }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMessage(decision === 'approve' ? 'Demande approuvée avec succès.' : 'Demande refusée.');
        setSent(true);
        setTimeout(() => navigate('/gestion-demandes-credit'), 2000);
      } else {
        setSendError(json.error || 'Erreur lors du traitement.');
      }
    } catch {
      setSendError('Erreur réseau.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="tc-page">
        <Navbar />
        <div className="tc-loader">
          <span className="material-symbols-outlined spin">progress_activity</span>
          <p>Chargement de la demande…</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !demande) {
    return (
      <div className="tc-page">
        <Navbar />
        <div className="tc-loader">
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#cbd5e1' }}>find_in_page</span>
          <h2>Demande introuvable</h2>
          <p>{errorMsg || `La demande #${id} est introuvable.`}</p>
          <button className="tc-back-btn" onClick={() => navigate('/gestion-demandes-credit')}>
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tc-page">
      <Navbar />

      <main className="tc-main">
        <nav className="tc-breadcrumb">
          <Link to="/welcome">Accueil</Link>
          <span className="material-symbols-outlined">chevron_right</span>
          <Link to="/gestion-demandes-credit">Crédits</Link>
          <span className="material-symbols-outlined">chevron_right</span>
          <span>Traitement de la demande</span>
        </nav>

        <header className="tc-header">
          <div>
            <h1>Traitement de la Demande</h1>
            <p>
              {isDone
                ? 'Cette demande a déjà été traitée.'
                : 'Examinez la demande de crédit et prenez une décision.'}
            </p>
          </div>
          <StatutBadge statut={demande.statut} />
        </header>

        {successMessage && (
          <div className="tc-banner success">
            <span className="material-symbols-outlined">check_circle</span>
            {successMessage}
          </div>
        )}
        {sendError && (
          <div className="tc-banner error">
            <span className="material-symbols-outlined">error</span>
            {sendError}
          </div>
        )}

        <div className="tc-grid">
          {/* ─── LEFT ─── */}
          <aside className="tc-left">
            <div className="tc-card tc-profile-card">
              <div className="tc-pc-header">
                <div className="tc-pc-avatar">{initiale}</div>
                <div className="tc-pc-info">
                  <h2>{nomComplet}</h2>
                  <p className="tc-pc-fonction">{employe?.profile?.fonction || ''}</p>
                  <p className="tc-pc-matricule">
                    <span className="material-symbols-outlined">badge</span>
                    {employe?.profile?.matricule || '—'}
                  </p>
                </div>
              </div>

              <div className="tc-pc-details">
                <div className="tc-pc-row">
                  <span className="tc-label">Département</span>
                  <strong>{employe?.profile?.depatement || '—'}</strong>
                </div>
                <div className="tc-pc-row">
                  <span className="tc-label">Email</span>
                  <strong>{employe?.email || employe?.profile?.company_email || '—'}</strong>
                </div>
                <div className="tc-pc-row">
                  <span className="tc-label">Campus</span>
                  <strong>—</strong>
                </div>
                <div className="tc-pc-row">
                  <span className="tc-label">Téléphone</span>
                  <strong>{employe?.profile?.phone || '—'}</strong>
                </div>
              </div>
            </div>

            <div className="tc-card">
              <h3 className="tc-card-title">Détails du dossier</h3>
              <div className="tc-detail-list">
                <div className="tc-detail-row">
                  <span className="tc-label">ID Requête</span>
                  <strong>#CR-{String(demande.id).padStart(4, '0')}</strong>
                </div>
                <div className="tc-detail-row">
                  <span className="tc-label">Objet du prêt</span>
                  <strong>{demande.objet_pret}</strong>
                </div>
                <div className="tc-detail-row">
                  <span className="tc-label">Type de prêt</span>
                  <span className="tc-badge-type">{demande.type_pret_display || demande.type_pret}</span>
                </div>
                <div className="tc-detail-row">
                  <span className="tc-label">Montant demandé</span>
                  <strong className="tc-amount">{formatAmount(demande.montant)}</strong>
                </div>
                <div className="tc-detail-row">
                  <span className="tc-label">Durée</span>
                  <strong>{demande.duree_mois} mois</strong>
                </div>
                <div className="tc-detail-row">
                  <span className="tc-label">Opposition mensuelle</span>
                  <strong>{formatAmount(demande.opposition_mensuelle)}</strong>
                </div>
                <div className="tc-detail-row">
                  <span className="tc-label">Date de soumission</span>
                  <strong>{formatDate(demande.date_creation)}</strong>
                </div>
                <div className="tc-detail-row">
                  <span className="tc-label">Première échéance</span>
                  <strong>{formatDate(demande.date_premiere_echeance)}</strong>
                </div>
              </div>
            </div>

            {demande.justificatif_url && (
              <div className="tc-card">
                <h3 className="tc-card-title">Pièces jointes</h3>
                <a href={demande.justificatif_url} target="_blank" rel="noopener noreferrer" className="tc-file-link">
                  <span className="material-symbols-outlined">description</span>
                  <span>Document justificatif</span>
                  <span className="material-symbols-outlined">open_in_new</span>
                </a>
              </div>
            )}
          </aside>

          {/* ─── RIGHT ─── */}
          <section className="tc-right">
            <div className="tc-card">
              <h3 className="tc-card-title">{isDone ? 'Décision enregistrée' : 'Décision RH'}</h3>

              {isDone ? (
                <div className="tc-decision-done">
                  <div className={`tc-decision-badge ${demande.statut === 'APPROUVE' ? 'pill-approved' : 'pill-rejected'}`}>
                    <span className="material-symbols-outlined">
                      {demande.statut === 'APPROUVE' ? 'check_circle' : 'cancel'}
                    </span>
                    {statutLabel(demande.statut)}
                  </div>
                  {demande.commentaire_manager && (
                    <div className="tc-comment-box">
                      <p className="tc-comment-label">Motif / Commentaire</p>
                      <p className="tc-comment-text">{demande.commentaire_manager}</p>
                    </div>
                  )}
                  {demande.date_reponse && (
                    <p className="tc-date-reponse">Traitée le {formatDate(demande.date_reponse)}</p>
                  )}
                </div>
              ) : (
                <form className="tc-form" onSubmit={handleSubmit}>
                  <div className="tc-decision-options">
                    <label className={`tc-option ${decision === 'approve' ? 'on-approve' : ''}`}>
                      <input type="radio" name="decision" value="approve" checked={decision === 'approve'} onChange={() => setDecision('approve')} />
                      <span className="material-symbols-outlined">check_circle</span>
                      <span>Approuver</span>
                    </label>
                    <label className={`tc-option ${decision === 'reject' ? 'on-reject' : ''}`}>
                      <input type="radio" name="decision" value="reject" checked={decision === 'reject'} onChange={() => setDecision('reject')} />
                      <span className="material-symbols-outlined">cancel</span>
                      <span>Refuser</span>
                    </label>
                  </div>

                  <div className="tc-fg">
                    <label htmlFor="c">{decision === 'reject' ? 'Motif du refus *' : 'Commentaire (optionnel)'}</label>
                    <textarea id="c" rows={4} value={commentaire} onChange={e => setCommentaire(e.target.value)}
                      placeholder={decision === 'reject' ? 'Veuillez justifier le refus…' : 'Ajouter un commentaire…'} />
                  </div>

                  <div className="tc-form-actions">
                    <button type="button" className="tc-btn tc-btn-cancel" onClick={() => navigate('/gestion-demandes-credit')}>Annuler</button>
                    <button type="submit" className={`tc-btn ${decision === 'approve' ? 'tc-btn-approve' : 'tc-btn-reject'}`} disabled={sending || sent}>
                      {sending ? 'Traitement…' : decision === 'approve' ? 'Approuver la demande' : 'Refuser la demande'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="tc-card">
              <h3 className="tc-card-title">Éligibilité</h3>
              <div className="tc-stats-grid">
                <div className="tc-stat-item">
                  <p className="tc-stat-label">Année d&apos;ancienneté</p>
                  <div className="tc-stat-value">
                    <span className="tc-stat-number-sm">{employe?.profile?.anciennete ?? '—'}</span>
                    <span className="tc-stat-unit">{employe?.profile?.anciennete > 1 ? 'ans' : 'an'}</span>
                  </div>
                </div>
                <div className="tc-stat-item">
                  <p className="tc-stat-label">Salaire</p>
                  <div className="tc-stat-value">
                    <span className="tc-stat-number-sm">{employe?.salaire ? Number(employe.salaire).toLocaleString('fr-FR') : '—'}</span>
                    <span className="tc-stat-unit">DT</span>
                  </div>
                </div>
                <div className="tc-stat-item">
                  <p className="tc-stat-label">Score performance</p>
                  <div className="tc-stat-value">
                    <span className="tc-stat-number-sm">{employe?.profile?.score_rendement ?? '—'}</span>
                    {employe?.profile?.score_rendement && <span className="tc-stat-unit">/100</span>}
                  </div>
                </div>
                <div className="tc-stat-item">
                  <p className="tc-stat-label">Taux d&apos;endettement</p>
                  <div className="tc-stat-value">
                    <span className="tc-stat-number-sm">—</span>
                  </div>
                </div>
                <div className="tc-stat-item">
                  <p className="tc-stat-label">Crédit en cours</p>
                  <div className="tc-stat-value">
                    <span className="tc-stat-number-sm">{employe?.has_bank_loan ? 'Oui' : 'Non'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="tc-card">
              <h3 className="tc-card-title">Historique des prêts</h3>
              {historique.length === 0 ? (
                <p className="tc-empty">Aucun prêt précédent.</p>
              ) : (
                <div className="tc-table-wrap">
                  <table className="tc-table">
                    <thead>
                      <tr>
                        <th>N°</th>
                        <th>Objet</th>
                        <th>Montant</th>
                        <th>Statut</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historique.map(p => (
                        <tr key={p.id}>
                          <td className="tc-code">#CR-{String(p.id).padStart(4, '0')}</td>
                          <td>{p.objet_pret}</td>
                          <td>{formatAmount(p.montant)}</td>
                          <td><StatutBadge statut={p.statut} /></td>
                          <td>{formatDate(p.date_creation)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
