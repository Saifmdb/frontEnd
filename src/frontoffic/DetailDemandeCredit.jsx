import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from './components/navbar.jsx';
import { authFetch } from '../api/authFetch.js';
import './frontcss/detail-demande-credit.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const TYPE_PRET_OPTIONS = [
  { value: 'COMPLEMENTAIRE', label: "Prêt complémentaire au plan d'épargne" },
  { value: 'DIRECT', label: 'Prêt institutionnel direct' },
  { value: 'SOCIAL', label: "Prêt social d'urgence" },
];

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatAmount(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT`;
}

function statusConfig(status) {
  switch (status) {
    case 'APPROUVE': return { label: 'Approuvé', className: 'status-approved', icon: 'check_circle' };
    case 'REFUSE': return { label: 'Refusé', className: 'status-rejected', icon: 'cancel' };
    case 'EN_ATTENTE':
    default: return { label: 'En attente', className: 'status-pending', icon: 'schedule' };
  }
}

export default function DetailDemandeCredit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [demande, setDemande] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const loadDemande = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/credits/ma-demande/${id}/`);
      const json = await res.json();
      if (json.success) {
        setDemande(json.demande);
        setForm({
          objet_pret: json.demande.objet_pret || '',
          type_pret: json.demande.type_pret || '',
          montant: json.demande.montant || '0',
          duree_mois: json.demande.duree_mois || 12,
          date_premiere_echeance: json.demande.date_premiere_echeance || '',
          opposition_mensuelle: json.demande.opposition_mensuelle || '0',
        });
      } else {
        setError(json.error || 'Demande introuvable.');
      }
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadDemande(); }, [loadDemande]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await authFetch(`${API_URL}/credits/modifier/${id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setDemande(json.demande);
        setEditing(false);
        setMessage({ type: 'success', text: 'Demande modifiée avec succès.' });
      } else {
        setMessage({ type: 'error', text: json.error || 'Erreur lors de la modification.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette demande ? Cette action est irréversible.')) return;
    setSaving(true);
    try {
      const res = await authFetch(`${API_URL}/credits/supprimer/${id}/`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: 'Demande supprimée.' });
        setTimeout(() => navigate('/gestion-demandes-credit'), 1500);
      } else {
        setMessage({ type: 'error', text: json.error || 'Erreur lors de la suppression.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ddc-page">
        <Navbar />
        <main className="ddc-main"><div className="ddc-loading">Chargement...</div></main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ddc-page">
        <Navbar />
        <main className="ddc-main">
          <div className="ddc-error">
            <span className="material-symbols-outlined">error</span>
            <p>{error}</p>
            <button onClick={() => navigate('/gestion-demandes-credit')}>Retour</button>
          </div>
        </main>
      </div>
    );
  }

  if (!demande) return null;

  const badge = statusConfig(demande.statut);
  const isEnAttente = demande.statut === 'EN_ATTENTE';
  const typeLabel = TYPE_PRET_OPTIONS.find(t => t.value === demande.type_pret)?.label || demande.type_pret;

  return (
    <div className="ddc-page">
      <Navbar />

      <main className="ddc-main">
        <nav className="ddc-breadcrumb">
          <a onClick={() => navigate('/')}>Accueil</a>
          <span className="material-symbols-outlined">chevron_right</span>
          <a onClick={() => navigate('/credit-bancaire')}>Mes Demandes</a> 
          <span className="material-symbols-outlined">chevron_right</span>
          <span>Détails de la demande</span>
        </nav>

        <div className="ddc-header">
          <div>
            <h1>Détails de ma Demande</h1>
            <p className="ddc-subtitle">Consultez et modifiez les informations relatives à votre demande de prêt bancaire.</p>
          </div>
          {isEnAttente && !editing && (
            <button className="ddc-edit-btn" onClick={() => setEditing(true)}>
              <span className="material-symbols-outlined">edit</span>
              Modifier
            </button>
          )}
        </div>

        {message && (
          <div className={`ddc-alert ${message.type}`}>
            <span className="material-symbols-outlined">{message.type === 'success' ? 'check_circle' : 'error'}</span>
            {message.text}
          </div>
        )}

        <div className="ddc-grid">
          <div className="ddc-main-col">
            <section className="ddc-card">
              <h2>Détails du Financement</h2>
              <div className="ddc-fields">
                <div className={`ddc-field${editing ? ' editing' : ''}`}>
                  <label>Objet du prêt</label>
                  {editing ? (
                    <input type="text" value={form.objet_pret} onChange={e => handleChange('objet_pret', e.target.value)} />
                  ) : (
                    <div className="ddc-field-value">{demande.objet_pret}</div>
                  )}
                  {!editing && <span className="ddc-field-icon material-symbols-outlined">edit</span>}
                </div>
                <div className={`ddc-field${editing ? ' editing' : ''}`}>
                  <label>Type du prêt</label>
                  {editing ? (
                    <select value={form.type_pret} onChange={e => handleChange('type_pret', e.target.value)}>
                      {TYPE_PRET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <div className="ddc-field-value">{typeLabel}</div>
                  )}
                  {!editing && <span className="ddc-field-icon material-symbols-outlined">edit</span>}
                </div>
                <div className="ddc-row">
                  <div className={`ddc-field${editing ? ' editing' : ''}`}>
                    <label>Montant</label>
                    {editing ? (
                      <input type="number" step="0.001" value={form.montant} onChange={e => handleChange('montant', e.target.value)} />
                    ) : (
                      <div className="ddc-field-value">{formatAmount(demande.montant)}</div>
                    )}
                    {!editing && <span className="ddc-field-icon material-symbols-outlined">edit</span>}
                  </div>
                  <div className={`ddc-field${editing ? ' editing' : ''}`}>
                    <label>Durée</label>
                    {editing ? (
                      <input type="number" value={form.duree_mois} onChange={e => handleChange('duree_mois', e.target.value)} />
                    ) : (
                      <div className="ddc-field-value">{demande.duree_mois} Mois</div>
                    )}
                    {!editing && <span className="ddc-field-icon material-symbols-outlined">edit</span>}
                  </div>
                </div>
                <div className={`ddc-field${editing ? ' editing' : ''}`}>
                  <label>Début de l'échéance</label>
                  {editing ? (
                    <input type="date" value={form.date_premiere_echeance} onChange={e => handleChange('date_premiere_echeance', e.target.value)} />
                  ) : (
                    <div className="ddc-field-value">{formatDate(demande.date_premiere_echeance)}</div>
                  )}
                  {!editing && <span className="ddc-field-icon material-symbols-outlined">edit</span>}
                </div>
                <div className={`ddc-field${editing ? ' editing' : ''}`}>
                  <label>Opposition mensuelle</label>
                  {editing ? (
                    <input type="number" step="0.001" value={form.opposition_mensuelle} onChange={e => handleChange('opposition_mensuelle', e.target.value)} />
                  ) : (
                    <div className="ddc-field-value">{formatAmount(demande.opposition_mensuelle)}</div>
                  )}
                  {!editing && <span className="ddc-field-icon material-symbols-outlined">edit</span>}
                </div>
              </div>
            </section>

            {demande.justificatif_url && (
              <section className="ddc-card">
                <h2>Pièce jointe</h2>
                <div className="ddc-file-card">
                  <div className="ddc-file-icon"><span className="material-symbols-outlined">description</span></div>
                  <div className="ddc-file-info">
                    <p className="ddc-file-name">Justificatif</p>
                    <a href={demande.justificatif_url} target="_blank" rel="noopener noreferrer" className="ddc-file-link">
                      <span className="material-symbols-outlined">download</span> Télécharger
                    </a>
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="ddc-side-col">
            <section className="ddc-status-card">
              <h3>Statut de la Demande</h3>
              <div className={`ddc-status-badge ${badge.className}`}>
                <span className="material-symbols-outlined">{badge.icon}</span>
                <span>{badge.label}</span>
              </div>
              <p className="ddc-status-text">
                {demande.statut === 'EN_ATTENTE' && 'Votre dossier est en cours d\'examen par le service RH.'}
                {demande.statut === 'APPROUVE' && 'Félicitations ! Votre demande de prêt a été approuvée.'}
                {demande.statut === 'REFUSE' && 'Votre demande de prêt a été refusée.'}
              </p>
              <div className="ddc-status-meta">
                <div><span>Référence</span><strong>#CR-{String(demande.id).padStart(4, '0')}</strong></div>
                <div><span>Soumis le</span><strong>{formatDate(demande.date_creation)}</strong></div>
                {demande.date_reponse && <div><span>Répondu le</span><strong>{formatDate(demande.date_reponse)}</strong></div>}
              </div>
            </section>

            {demande.commentaire_manager && (
              <section className="ddc-response-card">
                <h3>Réponse du service RH</h3>
                <div className="ddc-response-text">{demande.commentaire_manager}</div>
                {demande.responsable_approbation && (
                  <p className="ddc-response-author">
                    — {demande.responsable_approbation.full_name || 'Responsable RH'}
                  </p>
                )}
              </section>
            )}

            <section className="ddc-help-card">
              <span className="material-symbols-outlined">info</span>
              <p>Si vous rencontrez des difficultés, veuillez contacter le support académique.</p>
            </section>
          </div>
        </div>

        {editing && (
          <div className="ddc-actions">
            <button className="ddc-btn-secondary" onClick={() => { setEditing(false); loadDemande(); }} disabled={saving}>
              Annuler
            </button>
            <button className="ddc-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        )}

        {isEnAttente && !editing && (
          <div className="ddc-delete-row">
            <button className="ddc-btn-delete" onClick={handleDelete} disabled={saving}>
              <span className="material-symbols-outlined">delete_forever</span>
              Supprimer la demande
            </button>
          </div>
        )}
      </main>
    </div>
  );
}