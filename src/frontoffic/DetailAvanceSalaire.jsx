import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from './components/navbar.jsx';
import { authFetch } from '../api/authFetch.js';
import './frontcss/detail-avance-salaire.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

function getUserContext() {
  try {
    const userData = localStorage.getItem('user');
    const profileData = localStorage.getItem('employee_profile');
    const user = userData ? JSON.parse(userData) : null;
    const profile = profileData ? JSON.parse(profileData) : null;
    return {
      username: user?.username || null,
      matricule: user?.matricule || profile?.matricule || null,
      role: user?.role || null,
      department: user?.depatement || profile?.depatement || null,
    };
  } catch {
    return { username: null, matricule: null, role: null, department: null };
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateFull(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatAmount(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DT`;
}

function statusConfig(statut) {
  switch (statut) {
    case 'APPROUVE': return { label: 'Approuvé', cls: 'approved', icon: 'check_circle' };
    case 'REFUSE': return { label: 'Refusé', cls: 'refused', icon: 'cancel' };
    case 'EN_ATTENTE':
    default: return { label: 'En Attente', cls: 'pending', icon: 'potted_plant' };
  }
}

function generatePDF(demande) {
  const st = statusConfig(demande.statut);
  const empName = demande.demandeur?.full_name || demande.demandeur?.username || '-';
  const empEmail = demande.demandeur?.email || '-';
  const mois = demande.mois || '-';
  const montant = formatAmount(demande.montant);
  const motif = demande.motif || 'Non renseigné';
  const dateCreation = formatDate(demande.date_creation);
  const id = demande.id;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Demande d'Avance sur Salaire #AV-${String(id).padStart(4, '0')}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #191c1d; padding: 48px; background: #fff; }
  h1 { font-family: 'Manrope', sans-serif; font-size: 1.8rem; font-weight: 800; color: #7e0008; margin-bottom: 8px; }
  h2 { font-family: 'Manrope', sans-serif; font-size: 1rem; font-weight: 700; color: #191c1d; margin-bottom: 16px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #7e0008; }
  .header-right { text-align: right; }
  .header-right p { font-size: 0.8rem; color: #5a403e; }
  .badge { display: inline-block; padding: 6px 16px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; margin-top: 8px; }
  .badge.pending { background: #ffe088; color: #574500; }
  .badge.approved { background: #c1ecd4; color: #274e3d; }
  .badge.refused { background: #ffdad6; color: #93000a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
  th { text-align: left; padding: 10px 12px; background: #edeeef; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #5a403e; border-bottom: 1px solid #e2beba; }
  td { padding: 12px; border-bottom: 1px solid #e2beba; font-size: 0.9rem; }
  .section-title { font-family: 'Manrope', sans-serif; font-size: 0.85rem; font-weight: 700; color: #7e0008; text-transform: uppercase; letter-spacing: 0.1em; margin: 32px 0 12px; }
  .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 64px; }
  .signature-box { border-top: 1px solid #191c1d; padding-top: 8px; }
  .signature-box p { font-size: 0.75rem; color: #5a403e; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2beba; text-align: center; font-size: 0.65rem; color: #8e706c; letter-spacing: 0.15em; text-transform: uppercase; }
  @media print { body { padding: 24px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>Demande d'Avance sur Salaire</h1>
    <p style="font-size: 0.85rem; color: #5a403e;">Honoris United Universities</p>
  </div>
  <div class="header-right">
    <p>Référence : <strong>#AV-${String(id).padStart(4, '0')}</strong></p>
    <p>Date : <strong>${dateCreation}</strong></p>
    <div class="badge ${st.cls}">${st.label}</div>
  </div>
</div>

<h2>Informations de l'employé</h2>
<table>
  <tr><th style="width:35%">Nom complet</th><td>${empName}</td></tr>
  <tr><th>Email</th><td>${empEmail}</td></tr>
  <tr><th>Mois concerné</th><td>${mois}</td></tr>
</table>

<h2>Détails de la demande</h2>
<table>
  <tr><th style="width:35%">Montant demandé</th><td style="font-weight:700; color:#7e0008;">${montant}</td></tr>
  <tr><th>Motif</th><td>${motif}</td></tr>
  <tr><th>Date de soumission</th><td>${dateCreation}</td></tr>
  <tr><th>Statut</th><td>${st.label}</td></tr>
  ${demande.commentaire_manager ? `<tr><th>Commentaire RH</th><td>${demande.commentaire_manager}</td></tr>` : ''}
  ${demande.date_reponse ? `<tr><th>Date de réponse</th><td>${formatDate(demande.date_reponse)}</td></tr>` : ''}
</table>

<p class="section-title">Engagements</p>
<p style="font-size: 0.82rem; line-height: 1.7; color: #5a403e;">
  Je soussigné(e) ${empName}, confirme que les informations ci-dessus sont exactes et m'engage à rembourser
  le montant de l'avance conformément aux politiques internes de l'institution.
</p>

<div class="signature-grid">
  <div class="signature-box">
    <p>Signature de l'employé</p>
  </div>
  <div class="signature-box">
    <p>Signature du responsable RH</p>
  </div>
</div>

<div class="footer">
  Honoris United Universities • Academic Excellence Digital Portal
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

export default function DetailAvanceSalaire() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { role, department } = useMemo(() => getUserContext(), []);
  const [demande, setDemande] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isRh = role === 'RH' || String(department || '').toUpperCase() === 'RH';
  const isApprover = role === 'ADMIN' || isRh;

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const endpoint = isApprover ? 'detail' : 'ma-demande';
        const res = await authFetch(`${API_URL}/avance-salaire/${endpoint}/${id}/`);
        const data = await res.json();
        if (data.success) {
          setDemande(data.demande);
        } else {
          setMessage({ type: 'error', text: data.error || 'Impossible de charger la demande.' });
        }
      } catch {
        setMessage({ type: 'error', text: 'Erreur de connexion.' });
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, isApprover]);

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      const endpoint = action === 'approve' ? 'approuver' : 'refuser';
      const res = await authFetch(`${API_URL}/avance-salaire/${endpoint}/${id}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentaire }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: action === 'approve' ? 'Demande approuvée.' : 'Demande refusée.' });
        setDemande(data.demande);
        setCommentaire('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Action impossible.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await authFetch(`${API_URL}/avance-salaire/supprimer/${id}/`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        navigate('/avance-salaire');
      } else {
        setMessage({ type: 'error', text: data.error || 'Suppression impossible.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion.' });
    }
  };

  if (loading) {
    return (
      <div className="detail-avance-page">
        <Navbar hideDisconnectBtn={false} />
        <div className="detail-avance-main" style={{ textAlign: 'center', paddingTop: 200 }}>Chargement...</div>
      </div>
    );
  }

  if (!demande) {
    return (
      <div className="detail-avance-page">
        <Navbar hideDisconnectBtn={false} />
        <div className="detail-avance-main" style={{ textAlign: 'center', paddingTop: 200 }}>
          <p>Demande introuvable.</p>
          <button onClick={() => navigate(-1)}>Retour</button>
        </div>
      </div>
    );
  }

  const st = statusConfig(demande.statut);
  const isPending = demande.statut === 'EN_ATTENTE';

  return (
    <div className="detail-avance-page">
      <Navbar hideDisconnectBtn={false} />

      <header className="detail-avance-header">
        <nav className="detail-breadcrumb">
          <a href="/welcome">Accueil</a>
          <span className="sep">{'>'}</span>
          <a href="/avance-salaire">Avances</a>
          <span className="sep">{'>'}</span>
          <a href="/historique-avance">Historique</a>
          <span className="sep">{'>'}</span>
          <span className="current">Détail</span>
        </nav>

        <h1 className="detail-avance-title">
          Détails de la demande <span className="red">#AV-{String(demande.id).padStart(4, '0')}</span>
        </h1>
      </header>

      <main className="detail-avance-main">
        {message && <div className={`avance-msg ${message.type}`}>{message.text}</div>}

        <div className="detail-grid">
          <div className="detail-left">
            <div className="summary-card">
              <div className="summary-top">
                <div>
                  <p className="label">Montant Demandé</p>
                  <p className="amount">{formatAmount(demande.montant)}</p>
                </div>
                <div className={`summary-status ${st.cls}`}>
                  <span className="material-symbols-outlined">{st.icon}</span>
                  {st.label}
                </div>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-bottom">
                <div>
                  <p className="label">Type d'avance</p>
                  <p className="value">Avance sur Salaire</p>
                </div>
                <div>
                  <p className="label">Date de soumission</p>
                  <p className="value">{formatDate(demande.date_creation)}</p>
                </div>
              </div>

              {demande.motif && (
                <>
                  <div className="summary-divider"></div>
                  <div>
                    <p className="label">Motif</p>
                    <p className="value">{demande.motif}</p>
                  </div>
                </>
              )}

              {demande.commentaire_manager && (
                <>
                  <div className="summary-divider"></div>
                  <div>
                    <p className="label">Commentaire RH</p>
                    <p className="value">{demande.commentaire_manager}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="detail-right">
            <div className="timeline-card">
              <h2 className="timeline-title">Suivi du dossier</h2>

              <div className="timeline">
                <div className="timeline-step">
                  <div className="timeline-dot done">
                    <span className="material-symbols-outlined">check</span>
                  </div>
                  <div className="timeline-step-content">
                    <p className="step-title">Soumission</p>
                    <p className="step-sub">{formatDateFull(demande.date_creation)}</p>
                    <span className="step-badge">Effectué</span>
                  </div>
                </div>

                <div className="timeline-step">
                  <div className={`timeline-dot ${isPending ? 'active' : 'done'}`}>
                    <span className="material-symbols-outlined">
                      {isPending ? 'supervisor_account' : 'check'}
                    </span>
                  </div>
                  <div className="timeline-step-content">
                    <p className={`step-title ${isPending ? 'faded' : ''}`}>Manager RH</p>
                    <p className="step-sub italic">
                      {isPending ? "En attente d'approbation" : formatDateFull(demande.date_reponse)}
                    </p>
                    {isPending && demande.manager_approbateur && (
                      <div className="timeline-assignee">
                        <div className="avatar"></div>
                        <span className="name">Assigné à {demande.manager_approbateur.full_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="timeline-step">
                  <div className={`timeline-dot ${!isPending ? 'done' : 'active'}`}>
                    <span className="material-symbols-outlined">
                      {!isPending ? 'check' : 'corporate_fare'}
                    </span>
                  </div>
                  <div className="timeline-step-content">
                    <p className={`step-title ${!isPending ? '' : 'faded'}`}>Approbation RH</p>
                    <p className="step-sub">
                      {!isPending && demande.date_reponse ? formatDateFull(demande.date_reponse) : 'Étape finale'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="timeline-info">
                <p>
                  Le délai de traitement habituel est de <strong>48 heures</strong> après validation du Manager RH.
                </p>
              </div>
            </div>

            {isApprover && isPending && (
              <div className="timeline-card" style={{ marginTop: '24px' }}>
                <h2 className="timeline-title">Traiter la demande</h2>
                <textarea
                  placeholder="Commentaire (optionnel)..."
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  rows={3}
                  className="traitement-textarea"
                />
                <div className="traitement-actions">
                  <button
                    className="traitement-btn approve"
                    onClick={() => handleAction('approve')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? '...' : 'Approuver'}
                  </button>
                  <button
                    className="traitement-btn reject"
                    onClick={() => handleAction('reject')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? '...' : 'Refuser'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="detail-actions">
          <button className="btn-primary-action" onClick={() => generatePDF(demande)}>
            <span className="material-symbols-outlined">download</span>
            Télécharger le reçu
          </button>
          {isPending && !isApprover && (
            <button
              className="btn-danger-action"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <span className="material-symbols-outlined">delete</span>
              Supprimer
            </button>
          )}
        </div>
      </main>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <span className="material-symbols-outlined modal-icon">warning</span>
            <h3>Confirmer la suppression</h3>
            <p>Êtes-vous sûr de vouloir supprimer cette demande d'avance ? Cette action est irréversible.</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowDeleteConfirm(false)}>
                Annuler
              </button>
              <button className="modal-btn confirm" onClick={handleDelete}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="detail-footer">
        <p>HONORIS UNITED UNIVERSITIES • ACADEMIC EXCELLENCE DIGITAL PORTAL</p>
      </footer>
    </div>
  );
}
