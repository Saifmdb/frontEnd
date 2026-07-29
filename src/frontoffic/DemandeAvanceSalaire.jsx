import { useEffect, useState } from 'react';
import Navbar from './components/navbar.jsx';
import { authFetch } from '../api/authFetch.js';
import './frontcss/demande-avance-salaire.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export default function DemandeAvanceSalaire() {
  const [mois, setMois] = useState('');
  const [montant, setMontant] = useState('');
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState(null);

  const checkEligibility = async (m, moisVal) => {
    if (!m || !moisVal) { setEligibility(null); return; }
    try {
      const res = await authFetch(`${API_URL}/avance-salaire/eligibilite/?montant=${m}&mois=${moisVal}`);
      const data = await res.json();
      if (data.success) setEligibility(data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => checkEligibility(montant, mois), 400);
    return () => clearTimeout(timer);
  }, [montant, mois]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!mois || !montant) { setMessage({ type: 'error', text: 'Tous les champs sont requis.' }); return; }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('mois', mois);
      payload.append('montant', montant);
      payload.append('motif', '');

      const res = await authFetch(`${API_URL}/avance-salaire/demander/`, { method: 'POST', body: payload });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Votre demande a été soumise avec succès et est en attente de validation.' });
        setMois('');
        setMontant('');
        setEligibility(null);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la soumission.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur.' });
    } finally {
      setSubmitting(false);
    }
  };

  const isEligible = eligibility?.eligible;

  return (
    <div className="avance-page">
      <Navbar hideDisconnectBtn={false} />

      <main className="avance-main">
        <header className="avance-header">
          <div className="avance-header-left">
            <h1 className="avance-title">
              Demande d&apos;Avance <br />
              <span className="avance-title-red">sur Salaire</span>
            </h1>
            <p className="avance-desc">
              Sollicitez une avance sur votre salaire de manière simple et sécurisée. Le montant
              demandé est soumis à validation et aux politiques internes de l&apos;institution.
            </p>
          </div>

          <div className="avance-badge">
            <span className="avance-badge-label">Statut Employé</span>
            <div className="avance-badge-row">
              <span className="avance-badge-dot"></span>
              <span className="avance-badge-text">
                {isEligible === false ? 'Non éligible' : isEligible ? 'Éligible' : 'Non vérifié'}
              </span>
            </div>
            <p className="avance-badge-note">
              {isEligible === false
                ? 'Règles non respectées'
                : isEligible
                  ? 'Présence > 1 an validée'
                  : 'Remplissez le formulaire'}
            </p>
          </div>
        </header>

        {message && <div className={`avance-msg ${message.type}`}>{message.text}</div>}

        <div className="avance-card">
          <div className="avance-card-head">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <h2>Détails de l&apos;Avance</h2>
          </div>

          <form className="avance-card-body" onSubmit={handleSubmit}>
            <div className="avance-fields">
              <div className="avance-field">
                <label className="avance-label">* Mois de l&apos;avance :</label>
                <div className="avance-input-wrap">
                  <input
                    type="month"
                    className="avance-input"
                    value={mois}
                    onChange={(e) => setMois(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="avance-field">
                <label className="avance-label">* Montant souhaité (DT) :</label>
                <div className="avance-input-wrap">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    className="avance-input"
                    placeholder="Ex: 1500"
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                    required
                  />
                  <span className="material-symbols-outlined avance-input-icon">payments</span>
                </div>
                <p className="avance-note">
                  La valeur du montant à récupérer ne doit pas dépasser 60% du montant de votre salaire net aperçu.
                </p>
              </div>
            </div>

            <div className="avance-actions">
              <button
                type="submit"
                className="avance-btn-submit"
                disabled={submitting || isEligible === false}
              >
                {submitting ? 'Envoi...' : 'Soumettre la demande'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
