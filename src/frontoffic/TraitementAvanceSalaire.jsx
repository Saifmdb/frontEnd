import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from './components/navbar.jsx';
import { authFetch } from '../api/authFetch.js';
import './frontcss/traitement-avance-salaire.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateShort(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMonth(monthStr) {
  if (!monthStr) return '-';
  const [year, month] = monthStr.split('-');
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

function formatAmount(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DT`;
}

function statusConfig(statut) {
  switch (statut) {
    case 'APPROUVE': return { label: 'Approuvé', cls: 'status-approved', icon: 'check_circle' };
    case 'REFUSE': return { label: 'Refusé', cls: 'status-refused', icon: 'cancel' };
    case 'EN_ATTENTE':
    default: return { label: 'En Attente', cls: 'status-pending', icon: 'potted_plant' };
  }
}

function generatePDF(demande, employe) {
  const st = statusConfig(demande.statut);
  const empName = employe?.full_name || demande.demandeur?.full_name || demande.demandeur?.username || '-';
  const empEmail = employe?.email || demande.demandeur?.email || '-';
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

export default function TraitementAvanceSalaire() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [demande, setDemande] = useState(null);
  const [employe, setEmploye] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await authFetch(`${API_URL}/avance-salaire/detail/${id}/`);
        const data = await res.json();
        if (data.success) {
          setDemande(data.demande);
          setEmploye(data.employe || null);
        } else {
          setErrorMsg(data.error || 'Demande introuvable.');
        }
      } catch {
        setErrorMsg('Impossible de contacter le serveur.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleAction = async (action) => {
    if (action === 'approve' || action === 'reject') {
      if (action === 'reject' && !commentaire.trim()) {
        setSendError('Le motif du refus est obligatoire.');
        return;
      }
      setSending(true);
      setSendError('');
      try {
        const endpoint = action === 'approve' ? 'approuver' : 'refuser';
        const res = await authFetch(`${API_URL}/avance-salaire/${endpoint}/${id}/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commentaire }),
        });
        const json = await res.json();
        if (json.success) {
          setSuccessMessage(action === 'approve' ? 'Demande approuvée avec succès.' : 'Demande refusée.');
          setDemande(json.demande);
          setCommentaire('');
        } else {
          setSendError(json.error || 'Erreur lors du traitement.');
        }
      } catch {
        setSendError('Erreur réseau.');
      } finally {
        setSending(false);
      }
    }
  };

  const empName = employe?.full_name || demande?.demandeur?.full_name || demande?.demandeur?.username || '-';
  const initiale = empName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const empProfile = employe?.profile || null;

  if (loading) {
    return (
      <div className="tra-avance-page">
        <Navbar hideDisconnectBtn={false} />
        <div className="tra-avance-loader">
          <span className="material-symbols-outlined spin">progress_activity</span>
          <p>Chargement de la demande…</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !demande) {
    return (
      <div className="tra-avance-page">
        <Navbar hideDisconnectBtn={false} />
        <div className="tra-avance-loader">
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#cbd5e1' }}>find_in_page</span>
          <h2>Demande introuvable</h2>
          <p>{errorMsg || `La demande #${id} est introuvable.`}</p>
          <button className="tra-avance-back-btn" onClick={() => navigate('/gestion-avances-salaire')}>
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  const st = statusConfig(demande.statut);
  const isDone = demande.statut !== 'EN_ATTENTE';
  const motif = demande.motif || 'Aucun motif renseigné.';
  const justificatifUrl = demande.justificatif_url || null;

  return (
    <div className="tra-avance-page">
      <Navbar hideDisconnectBtn={false} />

      <main className="tra-avance-main">
        <nav className="tra-avance-breadcrumb">
          <Link to="/welcome">Accueil</Link>
          <span className="material-symbols-outlined">chevron_right</span>
          <Link to="/gestion-avances-salaire">Avances</Link>
          <span className="material-symbols-outlined">chevron_right</span>
          <span>Traitement</span>
        </nav>

        <header className="tra-avance-header">
          <div>
            <h1>Traitement de la Demande</h1>
            <p>
              {isDone
                ? 'Cette demande a déjà été traitée.'
                : 'Examinez la demande et prenez une décision.'}
            </p>
          </div>
          <span className={`tra-avance-pill ${st.cls}`}>{st.label}</span>
        </header>

        {successMessage && (
          <div className="tra-avance-banner success">
            <span className="material-symbols-outlined">check_circle</span>
            {successMessage}
          </div>
        )}
        {sendError && (
          <div className="tra-avance-banner error">
            <span className="material-symbols-outlined">error</span>
            {sendError}
          </div>
        )}

        <div className="tra-avance-bento">
          {/* ─── LEFT: Identity Card ─── */}
          <aside className="tra-avance-identity">
            <div className="tra-avance-card tra-avance-profile-card">
              <div className="tra-avance-pc-avatar-wrap">
                <div className="tra-avance-pc-avatar">{initiale}</div>
              </div>
              <div className="tra-avance-pc-info">
                <h2>{empName}</h2>
                <p className="tra-avance-pc-role">{demande.demandeur?.role || 'Employé'}</p>
              </div>

              <div className="tra-avance-pc-details">
                <div className="tra-avance-pc-row">
                  <span className="material-symbols-outlined">apartment</span>
                  <div>
                    <span className="tra-label">Département</span>
                    <strong>{empProfile?.depatement || '—'}</strong>
                  </div>
                </div>
                <div className="tra-avance-pc-row">
                  <span className="material-symbols-outlined">badge</span>
                  <div>
                    <span className="tra-label">Matricule</span>
                    <strong>{empProfile?.matricule || '—'}</strong>
                  </div>
                </div>
                <div className="tra-avance-pc-row">
                  <span className="material-symbols-outlined">calendar_today</span>
                  <div>
                    <span className="tra-label">Ancienneté</span>
                    <strong>{empProfile?.anciennete ? `${empProfile.anciennete} an(s)` : '—'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* ─── RIGHT: Request Details ─── */}
          <section className="tra-avance-details">
            <div className="tra-avance-card">
              <h3 className="tra-avance-card-title">Détails de la demande</h3>

              <div className="tra-avance-detail-rows">
                <div className="tra-avance-detail-row">
                  <span className="tra-label">ID Requête</span>
                  <strong className="tra-avance-code">#AV-{String(demande.id).padStart(4, '0')}</strong>
                </div>
                <div className="tra-avance-detail-row">
                  <span className="tra-label">Type d&apos;avance</span>
                  <span className="tra-avance-badge-type">Avance sur Salaire</span>
                </div>
                <div className="tra-avance-detail-row">
                  <span className="tra-label">Mois concerné</span>
                  <strong>{formatMonth(demande.mois)}</strong>
                </div>
                <div className="tra-avance-detail-row">
                  <span className="tra-label">Montant demandé</span>
                  <strong className="tra-avance-amount">{formatAmount(demande.montant)}</strong>
                </div>
                <div className="tra-avance-detail-row">
                  <span className="tra-label">Date de soumission</span>
                  <strong>{formatDateShort(demande.date_creation)}</strong>
                </div>
                <div className="tra-avance-detail-row">
                  <span className="tra-label">Statut</span>
                  <span className={`tra-avance-pill-inline ${st.cls}`}>{st.label}</span>
                </div>
              </div>

              <div className="tra-avance-motif-section">
                <span className="tra-label">Motif</span>
                <p className="tra-avance-motif-text">{motif}</p>
              </div>
            </div>

            {/* Justificatif */}
            {justificatifUrl && (
              <div className="tra-avance-card">
                <h3 className="tra-avance-card-title">Justificatif</h3>
                <a href={justificatifUrl} target="_blank" rel="noopener noreferrer" className="tra-avance-file-link">
                  <span className="material-symbols-outlined">description</span>
                  <span>Document justificatif</span>
                  <span className="material-symbols-outlined">open_in_new</span>
                </a>
              </div>
            )}
          </section>

          {/* ─── BOTTOM: Decision Section ─── */}
          <div className="tra-avance-decision-section">
            <div className="tra-avance-card">
              <h3 className="tra-avance-card-title">
                {isDone ? 'Décision enregistrée' : 'Décision RH'}
              </h3>

              {isDone ? (
                <div className="tra-avance-decision-done">
                  <div className={`tra-avance-decision-badge ${demande.statut === 'APPROUVE' ? 'status-approved' : 'status-refused'}`}>
                    <span className="material-symbols-outlined">
                      {demande.statut === 'APPROUVE' ? 'check_circle' : 'cancel'}
                    </span>
                    {demande.statut === 'APPROUVE' ? 'Approuvé' : 'Refusé'}
                  </div>
                  {demande.commentaire_manager && (
                    <div className="tra-avance-comment-box">
                      <p className="tra-avance-comment-label">Motif / Commentaire</p>
                      <p className="tra-avance-comment-text">{demande.commentaire_manager}</p>
                    </div>
                  )}
                  {demande.date_reponse && (
                    <p className="tra-avance-date-reponse">Traitée le {formatDate(demande.date_reponse)}</p>
                  )}
                  <div className="tra-avance-done-actions">
                    <button
                      className="tra-avance-btn tra-avance-btn-approve"
                      onClick={() => generatePDF(demande, employe)}
                    >
                      <span className="material-symbols-outlined">download</span>
                      Télécharger le reçu
                    </button>
                    <button
                      className="tra-avance-btn tra-avance-btn-cancel"
                      onClick={() => navigate('/gestion-avances-salaire')}
                    >
                      Retour à la liste
                    </button>
                  </div>
                </div>
              ) : (
                <form className="tra-avance-form" onSubmit={(e) => { e.preventDefault(); handleAction('approve'); }}>
                  <div className="tra-avance-comment-area">
                    <label htmlFor="tra-commentaire">Commentaire (optionnel)</label>
                    <textarea
                      id="tra-commentaire"
                      rows={4}
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                      placeholder="Ajouter un commentaire…"
                    />
                  </div>

                  <div className="tra-avance-form-actions">
                    <button
                      type="button"
                      className="tra-avance-btn tra-avance-btn-cancel"
                      onClick={() => navigate('/gestion-avances-salaire')}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="tra-avance-btn tra-avance-btn-reject"
                      onClick={() => handleAction('reject')}
                      disabled={sending}
                    >
                      {sending ? '…' : 'Refuser'}
                    </button>
                    <button
                      type="submit"
                      className="tra-avance-btn tra-avance-btn-approve"
                      disabled={sending}
                    >
                      {sending ? '…' : 'Approuver'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="tra-avance-footer">
        <p>HONORIS UNITED UNIVERSITIES • ACADEMIC EXCELLENCE DIGITAL PORTAL</p>
      </footer>
    </div>
  );
}
