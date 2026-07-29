import { useState } from 'react';
import Navbar from './components/navbar';
import { Link, useLocation } from 'react-router-dom';
import { authFetch } from '../api/authFetch.js';
import './frontcss/demandeDocument.css';

// Map display labels → backend code keys
const DOCUMENTS = [
  { label: 'Attestation de travail', value: 'attestation_travail' },
  { label: 'Fiche de paie',          value: 'fiche_paie' },
  { label: 'Titre de congé',         value: 'titre_conge' },
  { label: "Certificat d'emploi",    value: 'certificat_emploi' },
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function DemandeDocument() {
  const location = useLocation();

  const [typeDocument, setTypeDocument] = useState('');
  const [delivery, setDelivery]         = useState('email');
  const [submitted, setSubmitted]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  // ---- resolve rh contact email from localStorage ----
  let rhEmail   = 'rh.support@honoris.net';

  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.rh_email)                    rhEmail = user.rh_email;
      else if (user.profile?.rh_email)      rhEmail = user.profile.rh_email;
    }
  } catch { /* fallback */ }

  // ---- submit handler ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    try {
      const res = await authFetch(
      `${API_BASE}/documents-rh/demandes/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type_document:  typeDocument,
            mode_livraison: delivery,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Une erreur est survenue. Veuillez réessayer.');
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      console.error('Erreur soumission demande :', err);
      setError('Impossible de joindre le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d] font-body">
      <Navbar />
      <main className="pt-32 pb-20 px-8 max-w-7xl mx-auto">

        {/* Breadcrumb */}
        <nav className="mb-12 flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
          <Link
            to="/welcome"
            className={`transition-colors ${
              location.pathname === '/welcome'
                ? 'text-[#7e0008]'
                : 'text-[#5a403e99] hover:text-[#7e0008]'
            }`}
          >
            Accueil
          </Link>
          <span className="material-symbols-outlined text-[14px] text-[#5a403e99]">chevron_right</span>
          <span className="text-[#5a403e]">Demande de document RH</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

          {/* ---- Main Form ---- */}
          <div className="lg:col-span-8">
            <header className="mb-10">
              <h1 className="text-5xl font-extrabold tracking-tight mb-4">
                Nouvelle Demande de Document
              </h1>
              <p className="text-lg text-[#5a403e] max-w-2xl leading-relaxed">
                Commandez vos documents administratifs RH en quelques clics.
              </p>
            </header>

            <div className="bg-white p-10 rounded-xl shadow-sm border border-[#e2beba1a]">

              {submitted && (
                <div className="demande-doc-alert demande-doc-alert-success">
                  <span className="material-symbols-outlined demande-doc-alert-icon">check_circle</span>
                  <div>
                    <p className="demande-doc-alert-title">Demande envoyée avec succès !</p>
                    <p className="demande-doc-alert-message">
                      Votre RH a été notifié(e) et vous recevrez un accusé de réception par e-mail.
                      Le traitement prend généralement 48 à 72 h ouvrables.
                    </p>
                  </div>
             
                </div>
              )}

              {error && !submitted && (
                <div className="demande-doc-alert demande-doc-alert-error">
                  <span className="material-symbols-outlined demande-doc-alert-icon">error</span>
                  <div>
                    <p className="demande-doc-alert-title">Erreur</p>
                    <p className="demande-doc-alert-message">{error}</p>
                  </div>
                </div>
              )}

              <form className="space-y-12" onSubmit={handleSubmit}>

                  {/* Document Type */}
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest mb-4">
                      Type de Document
                    </label>
                    <div className="relative group">
                      <select
                        className="w-full bg-transparent border-0 border-b-2 border-[#7e0008] py-4 px-0
                                   focus:ring-0 focus:border-[#7e0008] transition-all appearance-none
                                   cursor-pointer text-lg font-medium custom-select"
                        value={typeDocument}
                        onChange={e => setTypeDocument(e.target.value)}
                        required
                        style={{ background: 'none', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                      >
                        <option disabled value="">Sélectionnez un document...</option>
                        {DOCUMENTS.map(doc => (
                          <option key={doc.value} value={doc.value}>{doc.label}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2
                                       pointer-events-none text-[#7e0008] text-2xl">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Delivery Mode */}
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest mb-6">
                      Mode de délivrance
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                      {/* Email */}
                      <label className="cursor-pointer group">
                        <input
                          className="hidden peer"
                          name="delivery"
                          type="radio"
                          value="email"
                          checked={delivery === 'email'}
                          onChange={() => setDelivery('email')}
                        />
                        <div className="flex items-center gap-5 p-6 rounded-xl border-2 border-[#e7e8e9]
                                        group-hover:bg-[#f3f4f5] peer-checked:border-[#7e0008]
                                        peer-checked:bg-[#ffb4ab1a] transition-all h-full">
                          <div className="w-12 h-12 rounded-full bg-[#7e0008]/10 flex items-center justify-center text-[#7e0008] shrink-0">
                            <span className="material-symbols-outlined text-2xl">mail</span>
                          </div>
                          <div>
                            <div className="font-bold text-lg">Email (PDF)</div>
                            <div className="text-xs text-[#5a403e] mt-1">Envoi numérique rapide</div>
                          </div>
                        </div>
                      </label>

                      {/* Retrait */}
                      <label className="cursor-pointer group">
                        <input
                          className="hidden peer"
                          name="delivery"
                          type="radio"
                          value="retrait"
                          checked={delivery === 'retrait'}
                          onChange={() => setDelivery('retrait')}
                        />
                        <div className="flex items-center gap-5 p-6 rounded-xl border-2 border-[#e7e8e9]
                                        group-hover:bg-[#f3f4f5] peer-checked:border-[#7e0008]
                                        peer-checked:bg-[#ffb4ab1a] transition-all h-full">
                          <div className="w-12 h-12 rounded-full bg-[#3f6653]/10 flex items-center justify-center text-[#3f6653] shrink-0">
                            <span className="material-symbols-outlined text-2xl">business</span>
                          </div>
                          <div>
                            <div className="font-bold text-lg">Retrait au siège</div>
                            <div className="text-xs text-[#5a403e] mt-1">Document physique original</div>
                          </div>
                        </div>
                      </label>

                    </div>
                  </div>

                  {/* Submit */}
                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto bg-gradient-to-br from-[#7e0008] to-[#a31919] text-white
                                 px-14 py-5 rounded-xl font-bold text-base hover:scale-[1.02] active:scale-95
                                 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3
                                 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                    >
                      {loading ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                          Envoi en cours…
                        </>
                      ) : (
                        <>
                          Envoyer la demande
                          <span className="material-symbols-outlined">send</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              
            </div>
          </div>

          {/* ---- Sidebar ---- */}
          <aside className="lg:col-span-4">
            <div className="sticky top-32 space-y-8">

              {/* Info card */}
              <div className="bg-white overflow-hidden rounded-xl border border-[#e2beba1a] shadow-sm">
                <div className="h-2 bg-[#7e0008]"></div>
                <div className="p-8">
                  <h2 className="text-xl font-extrabold mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#7e0008]">info</span>
                    Informations Pratiques
                  </h2>
                  <div className="space-y-8">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#f3f4f5] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#5a403e]">schedule</span>
                      </div>
                      <div>
                        <div className="text-sm font-bold uppercase tracking-tighter mb-1">Délai de traitement</div>
                        <p className="text-sm text-[#5a403e] leading-relaxed">
                          Les demandes sont traitées dans un délai de <strong>48 h à 72 h</strong> ouvrables.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#f3f4f5] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#5a403e]">support_agent</span>
                      </div>
                      <div>
                        <div className="text-sm font-bold uppercase tracking-tighter mb-1">Support RH</div>
                        <p className="text-sm text-[#5a403e] leading-relaxed">
                          Besoin d&apos;assistance ? Contactez le service RH au <strong>{rhEmail}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual card */}
              <div className="relative h-64 rounded-xl overflow-hidden group shadow-lg">
                <img
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  alt="Modern office interior"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCxBdAGxbjY9yA8C0sf4UGBGzze5VlVFXrSBhiWeZii_Bygw1SpG9ZD489q8QYHCmxrFd22YZdMv2gDaIBKqrH3swht7_L7LRU_pt4xq7FZwuwp_wWN7BztIQ9rZfLBPrVEXzaeqWH0SaDOx1o3r5VK3knPK5LUBJAr4VC4s6VfqjGWM6wK9ok0FgF0Dg8oYUNX97ceIo86WHehk_PDs3mpxNt7FjdyIz_LKyE4dZWahUDXcXz68jY-9z7BL11g_C4UqzFUl-RBRU8"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#7e0008]/90 via-[#7e0008]/40 to-transparent p-8 flex flex-col justify-end">
                  <h3 className="text-white font-bold text-lg mb-2 uppercase tracking-tight">Services RH</h3>
                </div>
              </div>

            </div>
          </aside>
        </div>
      </main>

      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
    </div>
  );
}