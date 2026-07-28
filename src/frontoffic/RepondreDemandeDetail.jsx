// Pour corriger les liens de fichiers relatifs venant du backend
const FILE_BASE = import.meta.env.VITE_API_FILE_URL || 'http://localhost:8000';
import React, { useEffect, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Navbar from './components/navbar';
import { authFetch } from '../api/authFetch.js';
import './frontcss/RepondreDemandeDetail.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const STATUT_OPTIONS = [
  { value: 'traite',   label: 'Approuvée', icon: 'check_circle', color: 'secondary' },
  { value: 'refuse',   label: 'Refusée',   icon: 'cancel',       color: 'error'     }
];

const TYPE_LABELS = {
  attestation_travail: 'Attestation de travail',
  fiche_paie:          'Fiche de paie',
  titre_conge:         'Titre de congé',
  certificat_emploi:   "Certificat d'emploi",
};

// Statuts considérés comme "terminés" — la page passe en mode lecture seule
const DONE_STATUTS = ['traite', 'approuve', 'refuse'];

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function RepondreDemandeDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  // ── State ──
  const [demande, setDemande]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);

  const [statut, setStatut]       = useState('traite');
  const [message, setMessage]     = useState('');
  const [fichiers, setFichiers]   = useState([]);
  const [dragOver, setDragOver]   = useState(false);
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [sendError, setSendError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fileInputRef = useRef();

  // ── Fetch demande ──
  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const res  = await authFetch(`${API_BASE}/documents-rh/demandes/${id}/statut/`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.demande) { setDemande(data.demande); return; }
        }
      } catch (_) {}

      try {
        const res  = await authFetch(`${API_BASE}/documents-rh/demandes/rh/`);
        const data = await res.json();
        if (data.success) {
          const found = (data.demandes || []).find(d => String(d.id) === String(id));
          if (found) { setDemande(found); }
          else        { setNotFound(true); }
        }
      } catch (_) { setNotFound(true); }
      finally     { setLoading(false); }
    })();
  }, [id]);

  useEffect(() => { if (demande) setLoading(false); }, [demande]);

  // ── File handlers ──
  const addFiles = (incoming) => {
    if (!incoming.length) return;
    setFichiers((prev) => [...prev, ...incoming]);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    addFiles(dropped);
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    addFiles(selected);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setFichiers((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFichiers([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submit ──
  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true); setSendError('');
    if (statut === 'refuse' && !message.trim()) {
      setSendError('La justification est obligatoire pour un refus.');
      setSending(false);
      return;
    }
    if (isByEmail && statut === 'traite' && fichiers.length === 0) {
      setSendError('Veuillez joindre au moins un document pour un envoi par email.');
      setSending(false);
      return;
    }
    try {
      const formData = new FormData();
      formData.append('statut', statut);
      formData.append('commentaire_rh', message);
      fichiers.forEach((file) => formData.append('fichiers_reponse', file));

      const res  = await authFetch(
        `${API_BASE}/documents-rh/demandes/${id}/statut/`,
        { method: 'POST', body: formData }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSendError(data.error || 'Une erreur est survenue.');
      } else {
        if (data.demande) {
          setDemande(data.demande);
        }
        setSuccessMessage('Réponse enregistrée avec succès. Vous serez redirigé vers la liste des demandes.');
        setSent(true);
        setTimeout(() => {
          navigate('/gestion-demande-document', { state: { responseSuccess: true } });
        }, 2200);
      }
    } catch (_) {
      setSendError('Impossible de joindre le serveur. Vérifiez votre connexion.');
    }
    setSending(false);
  };

  const isByEmail = demande?.mode_livraison === 'email';

  useEffect(() => {
    if (!isByEmail) {
      clearFiles();
    }
  }, [isByEmail]);

  useEffect(() => {
    if (statut === 'refuse') {
      clearFiles();
    }
  }, [statut]);

  // ── La demande est-elle déjà traitée ? ──
  const isDone = demande ? DONE_STATUTS.includes(demande.statut) : false;

  // ── Helper: couleur du statut ──
  const statutColorClass = (s) => {
    if (s === 'en_attente') return 'bg-yellow-100 text-yellow-700';
    if (s === 'en_cours')   return 'bg-blue-100 text-blue-700';
    if (s === 'traite' || s === 'approuve') return 'bg-green-100 text-green-700';
    if (s === 'refuse')     return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-600';
  };

  // ═══════════════════════════════
  //  LOADING
  // ═══════════════════════════════
  if (loading) return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <span className="material-symbols-outlined animate-spin text-5xl text-[#7e0008]/40">progress_activity</span>
          <p className="text-sm font-medium">Chargement de la demande…</p>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════
  //  NOT FOUND
  // ═══════════════════════════════
  if (notFound || (!loading && !demande)) return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">find_in_page</span>
          <h2 className="text-xl font-bold text-slate-600 mb-2">Demande introuvable</h2>
          <p className="text-sm text-slate-400 mb-6">La demande #{id} n'existe pas ou vous n'y avez pas accès.</p>
      
        </div>
      </div>
    </div>
  );


  const demandeur = demande?.demandeur || {};
  const responseFiles = [];
  const seenFiles = new Set();
  if (demande?.fichiers_reponse?.length) {
    demande.fichiers_reponse.forEach((item) => {
      if (!item?.url || seenFiles.has(item.url)) return;
      seenFiles.add(item.url);
      responseFiles.push({
        name: item.name?.split('/').pop() || 'Document',
        url: item.url,
      });
    });
  }
  if (demande?.fichier_reponse && !seenFiles.has(demande.fichier_reponse)) {
    seenFiles.add(demande.fichier_reponse);
    responseFiles.push({
      name: demande?.fichier_reponse_name || demande.fichier_reponse.split('/').pop() || 'Document',
      url: demande.fichier_reponse,
    });
  }
  const initiale  = (demande?.demandeur_fullname || demandeur?.full_name || '?')[0]?.toUpperCase();

  // ═══════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════
  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d] font-body flex flex-col">
      <Navbar />

      <main className="flex-1 pt-32 pb-20 px-6 md:px-10 max-w-7xl mx-auto w-full">

        {/* ── Breadcrumb ── */}
        <nav className="mb-10 flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-[#5a403e99]">
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
          <span className="material-symbols-outlined text-[13px]">chevron_right</span>
          <Link
            to="/gestion-demande-document"
            className={`transition-colors ${
              location.pathname === '/gestion-demande-document'
                ? 'text-[#7e0008]'
                : 'text-slate-400 hover:text-[#7e0008]'
            }`}
          >
            Documents
          </Link>
          <span className="material-symbols-outlined text-[13px]">chevron_right</span>
          <span className="text-[#7e0008]">{isDone ? 'Voir la réponse' : 'Répondre'}</span>
        </nav>

        {/* ── Page header ── */}
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-extrabold tracking-tight">
              {isDone ? 'Détail de la réponse' : 'Réponse à la demande'}
            </h1>
            {/* Badge "Traitée" visible en mode lecture */}
            {isDone && (
              <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-tight ${statutColorClass(demande?.statut)}`}>
                {demande?.statut_label || demande?.statut}
              </span>
            )}
          </div>
          <p className="text-[#5a403e] max-w-2xl leading-relaxed text-sm">
            {isDone
              ? 'Cette demande a déjà été traitée. Vous pouvez consulter la réponse enregistrée ci-dessous.'
              : "Traitement de la demande de document administratif pour le collaborateur. Assurez-vous de vérifier toutes les pièces jointes avant l'envoi."}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

          {/* ═══════════════════════════════
              LEFT — Employee info
          ═══════════════════════════════ */}
          <aside className="lg:col-span-4 space-y-6">

            {/* Profile card */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-28 h-28 bg-[#3f6653]/5 rounded-full -mr-14 -mt-14 transition-transform group-hover:scale-110 pointer-events-none" />

              <div className="flex items-center gap-5 mb-7 relative z-10">
                <div className="w-20 h-20 rounded-full bg-[#7e0008]/10 flex items-center justify-center text-[#7e0008] text-2xl font-black border-4 border-white shadow-md shrink-0">
                  {initiale}
                </div>
                <div>
                  <h2 className="font-extrabold text-xl text-[#191c1d] leading-tight">
                    {demande?.demandeur_fullname || demandeur?.full_name || demandeur?.username || '—'}
                  </h2>
                  {demande?.demandeur_matricule && (
                    <p className="text-[#3f6653] font-semibold text-sm mt-0.5">Matricule : {demande.demandeur_matricule}</p>
                  )}
                  {demandeur?.email && (
                    <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">alternate_email</span>
                      {demandeur.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-4 relative z-10">
                <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-4">Détails de la demande</p>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Date de demande</span>
                  <span className="font-bold text-sm">{formatDate(demande?.date_demande)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Type de document</span>
                  <span className="bg-[#735c00]/10 text-[#735c00] px-3 py-1 rounded-full text-xs font-bold">
                    {demande?.type_document_label || TYPE_LABELS[demande?.type_document] || demande?.type_document}
                  </span>
                </div>

                {/* Mode de délivrance */}
                <div className={`mt-4 rounded-xl p-4 flex items-start gap-3 ${isByEmail ? 'bg-[#3f6653]/8' : 'bg-[#7e0008]/5'}`}>
                  <span className={`material-symbols-outlined text-xl mt-0.5 ${isByEmail ? 'text-[#3f6653]' : 'text-[#7e0008]'}`}
                        style={{ fontVariationSettings: "'FILL' 1" }}>
                    {isByEmail ? 'mail' : 'location_on'}
                  </span>
                  <div>
                    <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-0.5">Mode de délivrance</p>
                    <p className={`font-bold text-sm ${isByEmail ? 'text-[#3f6653]' : 'text-[#7e0008]'}`}>
                      {isByEmail ? 'Email (PDF)' : 'Retrait au siège'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isByEmail
                        ? "Le document uploadé sera envoyé automatiquement à l'employé par e-mail."
                        : "L'employé se présentera au siège pour récupérer son document."}
                    </p>
                  </div>
                </div>

                {/* Statut actuel */}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-500 text-sm">Statut actuel</span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${statutColorClass(demande?.statut)}`}>
                    {demande?.statut_label || demande?.statut}
                  </span>
                </div>

                {/* Date de traitement si disponible */}
                {isDone && demande?.date_traitement && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Traitée le</span>
                    <span className="font-bold text-sm">{formatDate(demande.date_traitement)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hint card */}
            {!isDone && (isByEmail ? (
              <div className="bg-[#3f6653]/8 border border-[#3f6653]/20 rounded-xl p-5 flex gap-3">
                <span className="material-symbols-outlined text-[#3f6653] text-xl shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                <div>
                  <p className="text-sm font-bold text-[#3f6653] mb-1">Envoi automatique par e-mail</p>
                  <p className="text-xs text-[#3f6653]/70 leading-relaxed">
                    Si vous uploadez un document, il sera joint à l'e-mail de réponse envoyé à l'employé. Assurez-vous que le fichier est signé et finalisé.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#7e0008]/5 border border-[#7e0008]/15 rounded-xl p-5 flex gap-3">
                <span className="material-symbols-outlined text-[#7e0008] text-xl shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>business</span>
                <div>
                  <p className="text-sm font-bold text-[#7e0008] mb-1">Retrait physique au siège</p>
                  <p className="text-xs text-[#7e0008]/60 leading-relaxed">
                    L'employé sera notifié par e-mail de votre réponse et devra se présenter au service RH muni d'une pièce d'identité.
                  </p>
                </div>
              </div>
            ))}
          </aside>

          {/* ═══════════════════════════════
              RIGHT — Form OR Read-only view
          ═══════════════════════════════ */}
          <section className="lg:col-span-8">
            <div className="bg-white rounded-xl p-10 shadow-sm border border-slate-100">

              {/* ─────────────────────────────
                  MODE LECTURE (isDone = true)
              ───────────────────────────── */}
              {isDone ? (
                <>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-extrabold text-[#191c1d]">Réponse RH enregistrée</h2>
                    <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-tight ${statutColorClass(demande?.statut)}`}>
                      {demande?.statut_label || demande?.statut}
                    </span>
                  </div>

                  <div className="space-y-8">

                    {/* Décision */}
                    <div>
                      <p className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 mb-5">Statut de la décision</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {STATUT_OPTIONS.map(opt => {
                          const isThis = demande?.statut === opt.value || (opt.value === 'traite' && demande?.statut === 'approuve');
                          const colorMap = {
                            secondary: { ring: 'border-[#3f6653]', bg: 'bg-[#3f6653]/5', icon: 'text-[#3f6653]' },
                            error:     { ring: 'border-red-500',   bg: 'bg-red-50',       icon: 'text-red-500' },
                            tertiary:  { ring: 'border-[#735c00]', bg: 'bg-[#735c00]/5', icon: 'text-[#735c00]' },
                          }[opt.color];
                          return (
                            <div
                              key={opt.value}
                              className={`relative flex flex-col items-center justify-center gap-2 p-5 border-2 rounded-xl
                                ${isThis ? `${colorMap.ring} ${colorMap.bg}` : 'border-slate-100 opacity-40'}`}
                            >
                              <span
                                className={`material-symbols-outlined text-3xl ${isThis ? colorMap.icon : 'text-slate-300'}`}
                                style={{ fontVariationSettings: isThis ? "'FILL' 1" : "'FILL' 0" }}
                              >
                                {opt.icon}
                              </span>
                              <span className={`font-bold text-sm ${isThis ? colorMap.icon : 'text-slate-400'}`}>{opt.label}</span>
                              {isThis && (
                                <span className="absolute top-2 right-2">
                                  <span className={`material-symbols-outlined text-sm ${colorMap.icon}`} style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Commentaire RH */}
                    <div>
                      <p className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 mb-3">Message d'accompagnement</p>
                      {demande?.commentaire_rh ? (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 text-sm text-[#191c1d] leading-relaxed whitespace-pre-wrap">
                          {demande.commentaire_rh}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">Aucun message enregistré.</p>
                      )}
                    </div>

                    {/* Fichier joint */}
                    <div>
                      <p className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 mb-3">Documents joints</p>
                      {(demande?.statut === 'traite' || demande?.statut === 'approuve') && responseFiles.length ? (
                        <div className="rdd-attachments-list">
                          {responseFiles.map((file, index) => (
                            <a
                              key={`${file.url}-${index}`}
                              href={file.url.startsWith('http') ? file.url : `${FILE_BASE}${file.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rdd-attachment"
                            >
                              <div className="rdd-attachment__icon">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                              </div>
                              <div className="rdd-attachment__content">
                                <p className="rdd-attachment__name">{file.name}</p>
                                <p className="rdd-attachment__meta">Cliquez pour ouvrir dans un nouvel onglet</p>
                              </div>
                              <span className="material-symbols-outlined rdd-attachment__open">open_in_new</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">Aucun document joint.</p>
                      )}
                    </div>

                
                  </div>
                </>
              ) : (

              /* ─────────────────────────────
                 MODE FORMULAIRE (isDone = false)
              ───────────────────────────── */
              <>
                <h2 className="text-2xl font-extrabold text-[#191c1d] mb-8">Réponse RH</h2>

                <form className="space-y-10" onSubmit={handleSend}>

                  {/* Success banner */}
                  {sent && successMessage && (
                    <div className="rdd-success-banner">
                      <span className="material-symbols-outlined rdd-success-icon">check_circle</span>
                      <div>
                        <p className="rdd-success-title">Réponse envoyée</p>
                        <p className="rdd-success-message">{successMessage}</p>
                      </div>
                    </div>
                  )}

                  {/* Error banner */}
                  {sendError && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                      <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">error</span>
                      {sendError}
                    </div>
                  )}

                  {/* Statut */}
                  <div>
                    <label className="block text-[0.7rem] font-black uppercase tracking-widest text-slate-400 mb-5">
                      Statut de la décision
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {STATUT_OPTIONS.map(opt => {
                        const isChecked = statut === opt.value;
                        const colorMap = {
                          secondary: { ring: 'border-[#3f6653]', bg: 'bg-[#3f6653]/5', icon: 'text-[#3f6653]' },
                          error:     { ring: 'border-red-500',   bg: 'bg-red-50',       icon: 'text-red-500' },
                          tertiary:  { ring: 'border-[#735c00]', bg: 'bg-[#735c00]/5', icon: 'text-[#735c00]' },
                        }[opt.color];
                        return (
                          <label
                            key={opt.value}
                            className={`relative flex flex-col items-center justify-center gap-2 p-5 border-2 rounded-xl cursor-pointer transition-all
                              ${isChecked ? `${colorMap.ring} ${colorMap.bg}` : 'border-slate-200 hover:bg-slate-50'}`}
                          >
                            <input type="radio" name="statut" value={opt.value} checked={isChecked} onChange={() => setStatut(opt.value)} className="hidden" />
                            <span
                              className={`material-symbols-outlined text-3xl transition-transform ${isChecked ? colorMap.icon + ' scale-110' : 'text-slate-400'}`}
                              style={{ fontVariationSettings: isChecked ? "'FILL' 1" : "'FILL' 0" }}
                            >
                              {opt.icon}
                            </span>
                            <span className={`font-bold text-sm ${isChecked ? colorMap.icon : 'text-slate-500'}`}>{opt.label}</span>
                            {isChecked && (
                              <span className="absolute top-2 right-2">
                                <span className={`material-symbols-outlined text-sm ${colorMap.icon}`} style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-[0.7rem] font-black uppercase tracking-widest text-slate-400 mb-3">
                      Message d'accompagnement
                    </label>
                    <textarea
                      rows={5}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder={statut === 'refuse' ? "Justification obligatoire en cas de refus." : "Saisissez votre message ici..."}
                      className="w-full bg-transparent border-0 border-b-2 border-slate-200 focus:border-[#7e0008] focus:ring-0 px-0 py-3 text-[#191c1d] placeholder:text-slate-300 transition-all resize-none text-sm outline-none"
                    />
                  </div>

                  {/* Upload */}
                  <div>
                    <label className="block text-[0.7rem] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Téléverser le document
                      {isByEmail
                        ? <span className="ml-2 text-[#3f6653] normal-case font-semibold tracking-normal text-xs">— sera envoyé par e-mail à l'employé</span>
                        : <span className="ml-2 text-[#7e0008]/60 normal-case font-semibold tracking-normal text-xs">— non requis pour retrait</span>
                      }
                    </label>

                    {isByEmail ? (
                      statut === 'refuse' ? (
                        <div className="rdd-upload-disabled">
                          <span className="material-symbols-outlined">block</span>
                          <p>Le téléversement est désactivé pour les réponses refusées.</p>
                        </div>
                      ) : fichiers.length === 0 ? (
                        <div
                          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={handleFileDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all
                            ${dragOver ? 'border-[#7e0008] bg-[#7e0008]/5 scale-[1.01]' : 'border-slate-200 hover:border-[#7e0008]/40 hover:bg-slate-50'}`}
                        >
                          <span className={`material-symbols-outlined text-4xl mb-4 transition-all ${dragOver ? 'text-[#7e0008] -translate-y-1' : 'text-slate-400'}`}>cloud_upload</span>
                          <p className="font-bold text-sm text-[#191c1d] mb-1">
                            {dragOver ? 'Déposez le fichier ici' : 'Cliquez pour téléverser ou glissez-déposez'}
                          </p>
                          <p className="text-xs text-slate-400">PDF, DOCX jusqu'à 10 MB</p>
                          <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.doc" className="hidden" onChange={handleFileChange} />
                        </div>
                      ) : (
                        <div className="rdd-file-list">
                          {fichiers.map((file, index) => (
                            <div className="rdd-file-item" key={`${file.name}-${file.size}-${index}`}>
                              <div className="rdd-file-item__icon">
                                <span className="material-symbols-outlined">description</span>
                              </div>
                              <div className="rdd-file-item__info">
                                <p className="rdd-file-item__name">{file.name}</p>
                                <p className="rdd-file-item__size">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="rdd-file-item__remove"
                              >
                                Supprimer
                              </button>
                            </div>
                          ))}
                          <div className="rdd-file-actions">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="rdd-file-action">Ajouter</button>
                            <button type="button" onClick={clearFiles} className="rdd-file-action rdd-file-action--remove">Tout supprimer</button>
                            <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.doc" className="hidden" onChange={handleFileChange} />
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="rdd-upload-notice">
                        <span className="material-symbols-outlined">info</span>
                        <p>Cette demande est en retrait local. Le téléversement de document n'est pas nécessaire.</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-6 pt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => navigate('/gestion-demande-document')}
                      className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all text-sm"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={sending || sent}
                      className="bg-gradient-to-br from-[#7e0008] to-[#a31919] text-white px-10 py-4 rounded-xl font-bold shadow-lg shadow-[#7e0008]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                    >
                      {sending ? (
                        <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Envoi en cours…</>
                      ) : (
                        <><span className="material-symbols-outlined text-xl">send</span>Envoyer la réponse</>
                      )}
                    </button>
                  </div>

                </form>
              </>
              )}
            </div>
          </section>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-slate-100 border-t border-slate-200 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-10 py-7 gap-4 max-w-7xl mx-auto">
          <p className="text-xs text-slate-400">© 2024 Honoris United Universities. Réseau d'enseignement supérieur privé panafricain.</p>
          <div className="flex gap-6">
            {['Politique de confidentialité', "Conditions d'utilisation", 'Support technique'].map(t => (
              <a key={t} href="#" className="text-xs text-slate-400 hover:text-[#7e0008] transition-colors">{t}</a>
            ))}
          </div>
        </div>
      </footer>

      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
    </div>
  );
}