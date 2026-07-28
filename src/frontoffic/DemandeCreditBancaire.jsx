import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/navbar.jsx';
import { authFetch } from '../api/authFetch.js';
import './frontcss/demande-credit.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const typePretOptions = [
  { value: 'COMPLEMENTAIRE', label: "Prêt complémentaire au plan d'épargne" },
  { value: 'DIRECT', label: 'Prêt institutionnel direct' },
  { value: 'SOCIAL', label: "Prêt social d'urgence" },
];

const objetPretOptions = [
  'Logement',
  'Acquisition',
  'Achat de voiture',
  'Besoin personnel',
  'Mobilier',
  'Terrain',
];

function getUserContext() {
  try {
    const userData = localStorage.getItem('user');
    const profileData = localStorage.getItem('employee_profile');
    const user = userData ? JSON.parse(userData) : null;
    const profile = profileData ? JSON.parse(profileData) : null;
    return {
      user,
      profile,
      username: user?.username || null,
      matricule: user?.matricule || user?.profile?.matricule || profile?.matricule || null,
      role: user?.role || null,
      department: user?.depatement || user?.department || user?.profile?.depatement || user?.profile?.department || profile?.depatement || profile?.department || null,
      hasBankLoan: Boolean(user?.has_bank_loan),
    };
  } catch (error) {
    return { user: null, profile: null, username: null, matricule: null, role: null, department: null, hasBankLoan: false };
  }
}

function formatCurrency(value) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return '— DT';
  return `${numericValue.toFixed(3)} DT`;
}

function statusLabel(status) {
  switch (status) {
    case 'APPROUVE':
      return 'Approuvé';
    case 'REFUSE':
      return 'Refusé';
    case 'EN_ATTENTE':
    default:
      return 'En attente';
  }
}

export default function DemandeCreditBancaire() {
  const navigate = useNavigate();
  const { role, department, hasBankLoan } = useMemo(() => getUserContext(), []);
  const hasRhLicense = role === 'RH' || String(department || '').toUpperCase() === 'RH';
  const [formData, setFormData] = useState({
    objet_pret: '',
    type_pret: 'COMPLEMENTAIRE',
    montant: '',
    duree_mois: 12,
    date_premiere_echeance: '',
  });
  const [justificatifFile, setJustificatifFile] = useState(null);
  const [fileLabel, setFileLabel] = useState('Aucun fichier sélectionné');
  const [message, setMessage] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [managerRequests, setManagerRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const oppositionMensuelle = useMemo(() => {
    const montant = Number(formData.montant || 0);
    const duree = Number(formData.duree_mois || 1);
    if (!montant || !duree) return 0;
    return montant / duree;
  }, [formData.montant, formData.duree_mois]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const requests = [];
      requests.push(authFetch(`${API_URL}/credits/mes-demandes/`).then((res) => res.json()));
      if (role === 'ADMIN' || hasRhLicense) {
        requests.push(authFetch(`${API_URL}/credits/a-approuver/`).then((res) => res.json()));
      }

      const results = await Promise.all(requests);
      const myResult = results[0];
      if (myResult?.success) {
        setMyRequests(myResult.demandes || []);
      }

      if (role === 'ADMIN' || hasRhLicense) {
        const managerResult = results[1];
        if (managerResult?.success) {
          setManagerRequests(managerResult.demandes || []);
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Impossible de charger les demandes.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [role]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setJustificatifFile(file);
    setFileLabel(file ? file.name : 'Aucun fichier sélectionné');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (hasBankLoan) {
      setMessage({ type: 'error', text: 'Vous avez déjà un crédit bancaire actif.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('objet_pret', formData.objet_pret);
      payload.append('type_pret', formData.type_pret);
      payload.append('montant', formData.montant);
      payload.append('duree_mois', formData.duree_mois);
      payload.append('date_premiere_echeance', formData.date_premiere_echeance);
      if (justificatifFile) {
        payload.append('justificatif', justificatifFile);
      }

      const response = await authFetch(`${API_URL}/credits/demander/`, {
        method: 'POST',
        body: payload,
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Demande de crédit envoyée avec succès.' });
        setFormData({
          objet_pret: '',
          type_pret: 'COMPLEMENTAIRE',
          montant: '',
          duree_mois: 12,
          date_premiere_echeance: '',
        });
        setJustificatifFile(null);
        setFileLabel('Aucun fichier sélectionné');
        await loadRequests();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la soumission.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleManagerAction = async (requestId, action) => {
    setActionLoading(`${action}-${requestId}`);
    setMessage(null);
    try {
      const endpoint = action === 'approve' ? 'approuver' : 'refuser';
      const response = await authFetch(`${API_URL}/credits/${endpoint}/${requestId}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentaire: '' }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: action === 'approve' ? 'Demande approuvée.' : 'Demande refusée.' });
        await loadRequests();
      } else {
        setMessage({ type: 'error', text: data.error || 'Action impossible.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur.' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="credit-page">
      <Navbar hideDisconnectBtn={false} />

      <main className="credit-main">
        <section className="credit-hero">
          <div className="credit-hero-copy">
            <p className="credit-kicker">Services financiers internes</p>
            <h1>Demande de Prêt Bancaire</h1>
            <p>
              Accédez aux solutions de financement exclusives pour les membres du réseau Honoris.
              Un accompagnement sur mesure pour vos projets de vie, avec des taux préférentiels.
            </p>
          </div>

          <aside className={`credit-status ${hasBankLoan ? 'warn' : 'ok'}`}>
            <div className="credit-status-icon">{hasBankLoan ? '!' : '✓'}</div>
            <div>
              <h3>{hasBankLoan ? 'Crédit déjà actif' : 'Statut Éligible'}</h3>
              <p>
                {hasBankLoan
                  ? 'Un crédit bancaire est déjà enregistré sur votre profil.'
                  : 'Vos droits aux prêts institutionnels sont ouverts.'}
              </p>
            </div>
          </aside>
        </section>

        {message && (
          <div className={`credit-alert ${message.type}`}>
            {message.text}
          </div>
        )}

        <section className="credit-grid">
          <article className="credit-card credit-form-card">
            <header className="credit-section-header">
              <div>
                <span className="material-symbols-outlined">account_balance</span>
                <h2>Détails du Financement</h2>
              </div>
              <span className="credit-form-code">FORMULAIRE HHU-L01</span>
            </header>

            <form className="credit-form" onSubmit={handleSubmit}>
              <div className="credit-form-row two-columns">
                <label>
                  <span>* Objet du prêt</span>
                  <div className="field-shell select-shell">
                    <select name="objet_pret" value={formData.objet_pret} onChange={handleChange} required>
                      <option value="">Sélectionner l'objet</option>
                      {objetPretOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined">keyboard_arrow_down</span>
                  </div>
                </label>

                <label>
                  <span>* Type du prêt</span>
                  <div className="field-shell select-shell">
                    <select name="type_pret" value={formData.type_pret} onChange={handleChange} required>
                      {typePretOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined">keyboard_arrow_down</span>
                  </div>
                </label>
              </div>

              <div className="credit-form-row two-columns amount-row">
                <label>
                  <span>* Montant (DT)</span>
                  <div className="field-shell amount-shell">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      name="montant"
                      value={formData.montant}
                      onChange={handleChange}
                      placeholder="0.000"
                      required
                    />
                    <strong>DT</strong>
                  </div>
                  <small>La simulation ci-dessus calcule l'opposition mensuelle estimée.</small>
                </label>

                <label>
                  <span>* Durée (mois)</span>
                  <div className="field-shell duration-shell">
                    <input
                      type="number"
                      name="duree_mois"
                      value={formData.duree_mois}
                      onChange={handleChange}
                      min="1"
                      required
                    />
                    <strong>MOIS</strong>
                  </div>
                </label>
              </div>

              <div className="credit-form-row two-columns">
                <label>
                  <span>Montant de l'opposition mensuelle (DT)</span>
                  <div className="computed-value">
                    <p>Calcul automatique</p>
                    <strong>{formatCurrency(oppositionMensuelle)}</strong>
                  </div>
                </label>

                <label>
                  <span>* Début de la première échéance</span>
                  <div className="field-shell date-shell">
                    <input
                      type="date"
                      name="date_premiere_echeance"
                      value={formData.date_premiere_echeance}
                      onChange={handleChange}
                      required
                    />
                    <span className="material-symbols-outlined">calendar_today</span>
                  </div>
                </label>
              </div>

              <div className="credit-upload">
                <div>
                  <span>* Pièces jointes (Documents justificatifs)</span>
                  <div className="upload-zone">
                    <span className="material-symbols-outlined upload-icon">cloud_upload</span>
                    <p>Glissez vos fichiers ici</p>
                    <small>PDF, JPG ou PNG supportés (Max 5Mo par fichier)</small>
                    <label className="upload-button" htmlFor="creditFile">Choisir un fichier</label>
                    <input
                      id="creditFile"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                    <span className="upload-meta">{fileLabel}</span>
                  </div>
                </div>
              </div>

              <div className="credit-form-actions">
           
                <button type="submit" disabled={submitting || hasBankLoan}>
                  {submitting ? 'Envoi...' : 'Soumettre la demande'}
                </button>
              </div>
            </form>
          </article>

          <aside className="credit-side-column">
            <div className="credit-card summary-card">
              <h3>Votre dossier</h3>
              <div className="summary-list">
                <div>
                  <span>Rôle</span>
                  <strong>{role || 'N/A'}</strong>
                </div>
                <div>
                  <span>Crédit actif</span>
                  <strong>{hasBankLoan ? 'Oui' : 'Non'}</strong>
                </div>
                <div>
                  <span>Demandes envoyées</span>
                  <strong>{myRequests.length}</strong>
                </div>
              </div>
            </div>

            {role === 'ADMIN' || hasRhLicense ? (
              <div className="credit-card manager-card">
                <h3>Demandes à approuver</h3>
                {managerRequests.length === 0 ? (
                  <p className="empty-state">Aucune demande en attente.</p>
                ) : (
                  <div className="manager-list">
                    {managerRequests.map((request) => (
                      <div className="manager-item" key={request.id}>
                        <div>
                          <strong>{request.demandeur.full_name || request.demandeur.username}</strong>
                          <p>{request.objet_pret}</p>
                          <small>{request.montant} DT sur {request.duree_mois} mois</small>
                        </div>
                        <div className="manager-actions">
                          <button
                            type="button"
                            className="approve"
                            onClick={() => handleManagerAction(request.id, 'approve')}
                            disabled={actionLoading === `approve-${request.id}`}
                          >
                            {actionLoading === `approve-${request.id}` ? '...' : 'Approuver'}
                          </button>
                          <button
                            type="button"
                            className="reject"
                            onClick={() => handleManagerAction(request.id, 'reject')}
                            disabled={actionLoading === `reject-${request.id}`}
                          >
                            {actionLoading === `reject-${request.id}` ? '...' : 'Refuser'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </aside>
        </section>

        <section className="credit-card table-card">
          <div className="credit-section-header compact">
            <div>
              <span className="material-symbols-outlined">table_view</span>
              <h2>Tableau de suivi</h2>
            </div>
          </div>

          {loading ? (
            <div className="table-loading">Chargement des demandes...</div>
          ) : myRequests.length === 0 ? (
            <div className="empty-table">Aucune demande enregistrée pour le moment.</div>
          ) : (
            <div className="credit-table-wrap">
              <table className="credit-table">
                <thead>
                  <tr>
                    <th>Objet</th>
                    <th>Type</th>
                    <th>Montant</th>
                    <th>Durée</th>
                    <th>Opposition</th>
                    <th>Statut</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.objet_pret}</td>
                      <td>{request.type_pret_display || request.type_pret}</td>
                      <td>{request.montant} DT</td>
                      <td>{request.duree_mois} mois</td>
                      <td>{request.opposition_mensuelle} DT</td>
                      <td>
                        <span className={`status-pill ${request.statut.toLowerCase()}`}>
                          {statusLabel(request.statut)}
                        </span>
                      </td>
                      <td className="actions-col">
                        <button className="icon-btn" onClick={() => navigate(`/detail-demande-credit/${request.id}`)} type="button" title="Voir le détail">
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}