import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from './components/navbar';
import { authFetch } from '../api/authFetch.js';
import './frontcss/demandeDocument.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const STATUS_COLORS = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  en_cours:   'bg-blue-100 text-blue-700',
  traite:     'bg-green-100 text-green-700',
  approuve:   'bg-green-100 text-green-700',
  refuse:     'bg-red-100 text-red-700',
};

const MODE_LABELS = {
  email:   { label: 'Email',   icon: 'alternate_email', color: 'text-green-700 bg-green-100' },
  retrait: { label: 'Retrait', icon: 'front_hand',       color: 'text-blue-700 bg-blue-100' },
};

const STATUT_OPTIONS = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'en_cours',   label: 'En cours' },
  { value: 'traite',     label: 'Traité' },
  { value: 'refuse',     label: 'Refusé' },
];

// Statuts considérés comme "terminés" → on affiche ⋯ au lieu de Répondre
const DONE_STATUTS = ['traite', 'approuve', 'refuse'];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function GestionDemandes() {
  const location = useLocation();

  const [demandes, setDemandes]         = useState([]);
  const [search, setSearch]             = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [loading, setLoading]           = useState(true);

  // ── Fetch ──
  const fetchDemandes = async () => {
    setLoading(true);
    try {
      const url = filterStatut
        ? `${API_BASE}/documents-rh/demandes/rh/?statut=${filterStatut}`
        : `${API_BASE}/documents-rh/demandes/rh/`;
      const res  = await authFetch(url);
      const data = await res.json();
      if (data.success) setDemandes(data.demandes || []);
    } catch (e) {
      console.error('Erreur fetch demandes:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDemandes(); }, [filterStatut]);

  // ── Client-side search ──
  const filtered = demandes.filter(d => {
    const statutOk = !filterStatut || d.statut === filterStatut;
    const searchOk = !search ||
      d.demandeur_fullname?.toLowerCase().includes(search.toLowerCase()) ||
      d.demandeur_matricule?.toLowerCase().includes(search.toLowerCase()) ||
      String(d.id).includes(search);
    return statutOk && searchOk;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-body text-[#191c1d]">
      <Navbar />
      <main className="pt-32 pb-16 px-8 max-w-7xl mx-auto">

        {/* ── Breadcrumb & Header ── */}
        <section className="mb-12">
          <nav className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider mb-6">
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
            <span className="material-symbols-outlined text-xs text-[#5a403e99]">chevron_right</span>
            <span className="text-[#5a403e]">Gestion des demandes</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="font-black text-[#7e0008] text-5xl mb-4 tracking-tight">
                Gestion des Demandes
              </h1>
              <p className="text-[#5a403e] leading-relaxed">
                Interface de pilotage pour la validation et le suivi des documents administratifs
                sollicités par les collaborateurs.
              </p>
            </div>

            {/* Counter badge */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-[#e2beba1a]">
              <span className="material-symbols-outlined text-yellow-600 text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
              <div>
                <div className="text-[0.65rem] uppercase font-bold text-slate-400">En attente</div>
                <div className="text-2xl font-extrabold text-[#191c1d]">
                  {demandes.filter(d => d.statut === 'en_attente').length}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Table card ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#e2beba1a]">

          {/* Toolbar */}
          <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100">
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-[#f8f9fa] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7e0008]/30 rounded-lg text-sm"
                placeholder="Rechercher un collaborateur ou ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto relative">
              <div className="relative w-full md:w-auto">
                <select
                  className="custom-select-status w-full md:w-auto"
                  value={filterStatut}
                  onChange={e => setFilterStatut(e.target.value)}
                >
                  <option value="">Tous les statuts</option>
                  {STATUT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="custom-select-arrow">
                  <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                    <path d="M6 8L10 12L14 8" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">N°</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Collaborateur</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Type de document</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Mode</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Statut</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-14 text-slate-400">
                      <span className="material-symbols-outlined animate-spin text-3xl block mb-2">progress_activity</span>
                      Chargement…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-14 text-slate-400">
                      Aucune demande trouvée.
                    </td>
                  </tr>
                ) : filtered.map((d, idx) => {
                  const isDone = DONE_STATUTS.includes(d.statut);

                  return (
                    <tr key={d.id} className="hover:bg-[#f8f9fa] transition-colors group">

                      {/* N° */}
                      <td className="px-4 py-5 text-xs text-slate-400 font-bold">{idx + 1}</td>

                      {/* ID */}
                      <td className="px-6 py-5 font-mono text-sm text-slate-500">#{d.id}</td>

                      {/* Collaborateur */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#7e0008]/10 flex items-center justify-center text-[#7e0008] font-bold text-sm shrink-0">
                            {d.demandeur_avatar
                              ? <img className="w-full h-full object-cover rounded-full" src={d.demandeur_avatar} alt="" />
                              : (d.demandeur_fullname?.[0] || '?')}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-[#191c1d]">{d.demandeur_fullname || d.demandeur?.full_name || '—'}</div>
                            <div className="text-xs text-slate-400">{d.demandeur_matricule || '—'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Type document */}
                      <td className="px-6 py-5 text-sm font-medium text-slate-700">
                        {d.type_document_label || d.type_document}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-5 text-sm text-slate-500">{formatDate(d.date_demande)}</td>

                      {/* Mode */}
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${MODE_LABELS[d.mode_livraison]?.color || 'bg-slate-100 text-slate-600'}`}>
                          <span className="material-symbols-outlined text-sm">{MODE_LABELS[d.mode_livraison]?.icon || 'mail'}</span>
                          {MODE_LABELS[d.mode_livraison]?.label || d.mode_livraison}
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 w-fit ${STATUS_COLORS[d.statut] || 'bg-slate-100 text-slate-600'}`}>
                          {(d.statut === 'en_attente' || d.statut === 'en_cours') && (
                            <span className="material-symbols-outlined text-base align-middle">trending_flat</span>
                          )}
                          {d.statut_label || d.statut}
                        </span>
                      </td>

                      {/* ── Action : Répondre OU ⋯ ── */}
                      <td className="px-6 py-5">
                        {isDone ? (
                          /* Demande traitée → bouton "⋯" pour voir la réponse */
                          <Link
                            to={`/gestion-dem-document/repondre/${d.id}`}
                            title="Voir la réponse"
                            className="
                              inline-flex items-center justify-center
                              w-9 h-9 rounded-xl
                              bg-slate-100 text-slate-500
                              hover:bg-slate-200 hover:text-slate-700
                              transition-all font-black text-lg leading-none
                              tracking-widest
                            "
                          >
                            •••
                          </Link>
                        ) : (
                          /* Demande en attente / en cours → bouton Répondre */
                          <Link
                            to={`/gestion-dem-document/repondre/${d.id}`}
                            className="
                              inline-flex items-center gap-1.5
                              px-4 py-1.5 rounded-lg text-sm font-bold
                              bg-[#7e0008]/10 text-[#7e0008]
                              hover:bg-[#7e0008] hover:text-white
                              transition-all
                            "
                          >
                            <span className="material-symbols-outlined text-base">reply</span>
                            Répondre
                          </Link>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              {filtered.length} sur {demandes.length} demande{demandes.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Guidelines */}
        <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { color: 'green', icon: 'verified_user', title: 'Délais de traitement',
              text: 'Les demandes doivent être traitées sous 48 h ouvrables pour garantir la satisfaction des collaborateurs.' },
            { color: 'blue',  icon: 'info',          title: 'Confidentialité',
              text: 'Toutes les pièces générées doivent être strictement confidentielles et transmises uniquement au demandeur.' },
            { color: 'red',   icon: 'help',          title: 'Support RH',
              text: "En cas de difficulté technique avec le générateur, contactez l'équipe IT via le portail interne." },
          ].map(c => (
            <div key={c.title} className={`p-8 bg-${c.color}-50 rounded-2xl border-l-4 border-${c.color}-500`}>
              <h3 className={`font-bold text-${c.color}-700 mb-3 flex items-center gap-2`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{c.icon}</span>
                {c.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">{c.text}</p>
            </div>
          ))}
        </section>
      </main>

      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
    </div>
  );
}