import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  Link2,
  Copy,
  Pencil,
  Trash2,
  UserPlus,
  X,
  Save,
  Building2,
  Video,
  ChevronRight,
  Check,
  AlertTriangle,
  Users,
} from "lucide-react";

import Navbar from "./components/navbar.jsx";
import "./frontcss/reunion-detail.css";

function getAuthHeaders() {
  const token =
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("temp_token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function toInputDate(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function toInputTime(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(11, 16);
}

function toIso(date, time) {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function ReunionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);

  const isOrganizer = user?.role === "ORGANIZER";

  const [reunion, setReunion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  // Edit fields
  const [editTitre, setEditTitre] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editHeureDebut, setEditHeureDebut] = useState("");
  const [editHeureFin, setEditHeureFin] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editParticipantIds, setEditParticipantIds] = useState([]);

  // Participants pool
  const [allParticipants, setAllParticipants] = useState([]);
  const [searchParticipants, setSearchParticipants] = useState("");
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Delete / cancel modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteAction, setDeleteAction] = useState("cancel"); // "cancel" | "delete"

  // Copied link
  const [copied, setCopied] = useState(false);

  // ─── Load reunion detail ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/reunions/${id}/`, {
          method: "GET",
          credentials: "include",
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Chargement impossible.");
        setReunion(data.reunion);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Populate edit fields when reunion loads
  useEffect(() => {
    if (!reunion) return;
    setEditTitre(reunion.titre || "");
    setEditDate(toInputDate(reunion.date_debut));
    setEditHeureDebut(toInputTime(reunion.date_debut));
    setEditHeureFin(toInputTime(reunion.date_fin));
    setEditDescription(reunion.description || "");
    setEditParticipantIds(reunion.participants.map((p) => p.id));
  }, [reunion]);

  // Load assignable participants when edit mode opens
  useEffect(() => {
    if (!editMode) return;
    async function loadPool() {
      try {
        setLoadingParticipants(true);
        const res = await fetch("/api/reunions/assignable-users/", {
          method: "GET",
          credentials: "include",
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.success) setAllParticipants(data.participants || []);
      } catch (_) {/* ignore */} finally {
        setLoadingParticipants(false);
      }
    }
    loadPool();
  }, [editMode]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleCopyLink = () => {
    if (reunion?.teams_join_url) {
      navigator.clipboard.writeText(reunion.teams_join_url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleParticipant = (uid) => {
    setEditParticipantIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  const handleSave = async () => {
    setSaveError("");
    setSaveSuccess("");
    const startsAt = toIso(editDate, editHeureDebut);
    const endsAt = toIso(editDate, editHeureFin);

    if (!editTitre.trim()) { setSaveError("Le titre est obligatoire."); return; }
    if (!startsAt || !endsAt) { setSaveError("Dates invalides."); return; }
    if (new Date(endsAt) <= new Date(startsAt)) { setSaveError("L'heure de fin doit être après le début."); return; }
    if (editParticipantIds.length === 0) { setSaveError("Sélectionnez au moins un participant."); return; }

    try {
      setSaveLoading(true);
      const res = await fetch(`/api/reunions/${id}/update/`, {
        method: "PATCH",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          titre: editTitre.trim(),
          description: editDescription.trim(),
          starts_at: startsAt,
          ends_at: endsAt,
          participant_ids: editParticipantIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Erreur lors de la sauvegarde.");
      setReunion(data.reunion);
      setSaveSuccess("Modifications sauvegardées avec succès.");
      setEditMode(false);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteOrCancel = async () => {
    try {
      setDeleteLoading(true);
      const endpoint =
        deleteAction === "delete"
          ? `/api/reunions/${id}/delete/`
          : `/api/reunions/${id}/cancel/`;
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Erreur.");
      navigate("/reunions", { replace: true });
    } catch (e) {
      setSaveError(e.message);
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelEdit = () => {
    if (!reunion) return;
    setEditTitre(reunion.titre || "");
    setEditDate(toInputDate(reunion.date_debut));
    setEditHeureDebut(toInputTime(reunion.date_debut));
    setEditHeureFin(toInputTime(reunion.date_fin));
    setEditDescription(reunion.description || "");
    setEditParticipantIds(reunion.participants.map((p) => p.id));
    setSaveError("");
    setEditMode(false);
  };

  const filteredPool = useMemo(() => {
    if (!searchParticipants.trim()) return allParticipants;
    const q = searchParticipants.toLowerCase();
    return allParticipants.filter(
      (p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q)
    );
  }, [allParticipants, searchParticipants]);

  const selectedPool = useMemo(
    () => allParticipants.filter((p) => editParticipantIds.includes(p.id)),
    [allParticipants, editParticipantIds]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rd-page">
        <Navbar />
        <div className="rd-loading-screen">
          <div className="rd-spinner" />
          <p>Chargement de la réunion…</p>
        </div>
      </div>
    );
  }

  if (error || !reunion) {
    return (
      <div className="rd-page">
        <Navbar />
        <div className="rd-error-screen">
          <AlertTriangle size={40} />
          <p>{error || "Réunion introuvable."}</p>
          <Link to="/reunions">← Retour au calendrier</Link>
        </div>
      </div>
    );
  }

  const isCancelled = reunion.status === "ANNULEE";

  return (
    <div className="rd-page">
      <Navbar />

      <main className="rd-main">
        {/* Breadcrumb */}
        <nav className="rd-breadcrumb" aria-label="Fil d'ariane">
          <Link to="/welcome">Accueil</Link>
          <ChevronRight size={14} />
          <Link to="/reunions">Réunions</Link>
          <ChevronRight size={14} />
          <strong>Détail de la réunion</strong>
        </nav>

        {/* Top action bar */}
        <div className="rd-action-bar">
          <div className="rd-action-bar-left">
            <span className={`rd-status-badge ${isCancelled ? "cancelled" : "active"}`}>
              {isCancelled ? "Annulée" : "Programmée"}
            </span>
            <span className="rd-platform-badge">
              <Video size={13} /> Google Meet
            </span>
          </div>

          {isOrganizer && !isCancelled && (
            <div className="rd-action-bar-right">
              {!editMode ? (
                <>
                  <button
                    className="rd-btn rd-btn-danger"
                    onClick={() => { setDeleteAction("cancel"); setShowDeleteModal(true); }}
                  >
                    <Trash2 size={16} />
                    Supprimer / Annuler
                  </button>
                  <button
                    className="rd-btn rd-btn-primary"
                    onClick={() => setEditMode(true)}
                  >
                    <Pencil size={16} />
                    Activer la modification
                  </button>
                </>
              ) : (
                <>
                  <button className="rd-btn rd-btn-ghost" onClick={cancelEdit}>
                    <X size={16} /> Annuler
                  </button>
                  <button
                    className="rd-btn rd-btn-save"
                    onClick={handleSave}
                    disabled={saveLoading}
                  >
                    <Save size={16} />
                    {saveLoading ? "Sauvegarde…" : "Sauvegarder"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {saveSuccess && <div className="rd-alert rd-success"><Check size={16} />{saveSuccess}</div>}
        {saveError && <div className="rd-alert rd-error"><AlertTriangle size={16} />{saveError}</div>}

        {/* Bento layout */}
        <div className="rd-bento">

          {/* ── Main card ─────────────────────────────────────────── */}
          <section className="rd-card rd-card-main">

            <div className="rd-field-group">
              <label className="rd-label">Titre de la réunion</label>
              {editMode ? (
                <input
                  className="rd-input rd-input-title"
                  value={editTitre}
                  onChange={(e) => setEditTitre(e.target.value)}
                  placeholder="Titre de la réunion"
                />
              ) : (
                <h1 className="rd-title">{reunion.titre}</h1>
              )}
            </div>

            <div className="rd-grid-3">
              {/* Date */}
              <div className="rd-field-group">
                <label className="rd-label"><Calendar size={14} /> Date</label>
                {editMode ? (
                  <input
                    type="date"
                    className="rd-input"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                ) : (
                  <p className="rd-value">{formatDateTime(reunion.date_debut)}</p>
                )}
              </div>

              {/* Heure début */}
              <div className="rd-field-group">
                <label className="rd-label"><Clock size={14} /> Début</label>
                {editMode ? (
                  <input
                    type="time"
                    className="rd-input"
                    value={editHeureDebut}
                    onChange={(e) => setEditHeureDebut(e.target.value)}
                  />
                ) : (
                  <p className="rd-value rd-time">{formatTime(reunion.date_debut)}</p>
                )}
              </div>

              {/* Heure fin */}
              <div className="rd-field-group">
                <label className="rd-label"><Clock size={14} /> Fin</label>
                {editMode ? (
                  <input
                    type="time"
                    className="rd-input"
                    value={editHeureFin}
                    onChange={(e) => setEditHeureFin(e.target.value)}
                  />
                ) : (
                  <p className="rd-value rd-time">{formatTime(reunion.date_fin)}</p>
                )}
              </div>
            </div>

            {/* Meet link */}
            <div className="rd-field-group">
              <label className="rd-label"><Link2 size={14} /> Lien de la réunion</label>
              <div className="rd-link-row">
                <a
                  href={reunion.teams_join_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rd-meet-link"
                >
                  {reunion.teams_join_url || "Aucun lien disponible"}
                </a>
                {reunion.teams_join_url && (
                  <button className="rd-copy-btn" onClick={handleCopyLink} title="Copier le lien">
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ── Description card ──────────────────────────────────── */}
          <section className="rd-card rd-card-desc">
            <div className="rd-card-head">
              <h2>Ordre du jour &amp; Description</h2>
            </div>
            {editMode ? (
              <textarea
                className="rd-textarea"
                rows={8}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Ordre du jour, objectifs, points à traiter…"
              />
            ) : (
              <p className="rd-description">
                {reunion.description || <em>Aucune description renseignée.</em>}
              </p>
            )}
          </section>

          {/* ── Department card ───────────────────────────────────── */}
          <section className="rd-card rd-card-dept">
            <label className="rd-label">Département concerné</label>
            <div className="rd-dept-box">
              <div className="rd-dept-icon">
                <Building2 size={20} />
              </div>
              <div>
                <strong>{reunion.departement || "—"}</strong>
                <span>Organisateur : {reunion.manager?.full_name || reunion.manager?.username || "—"}</span>
              </div>
            </div>
          </section>

          {/* ── Participants card ─────────────────────────────────── */}
          <section className="rd-card rd-card-participants">
            <div className="rd-card-head">
              <h2><Users size={17} /> Participants</h2>
              {editMode && (
                <span className="rd-count-badge">{editParticipantIds.length} sélectionné(s)</span>
              )}
            </div>

            {!editMode ? (
              /* Read-only participant list */
              <div className="rd-participant-list">
                {reunion.participants.length === 0 && (
                  <p className="rd-empty-state">Aucun participant assigné.</p>
                )}
                {reunion.participants.map((p) => (
                  <div key={p.id} className="rd-participant-item">
                    <div className="rd-avatar">{getInitials(p.full_name || p.username)}</div>
                    <div>
                      <strong>{p.full_name || p.username}</strong>
                      <small>{p.email}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Edit participant selection */
              <div className="rd-participant-edit">
                {/* Search */}
                <div className="rd-search-field">
                  <UserPlus size={16} />
                  <input
                    type="text"
                    placeholder="Rechercher par nom ou email…"
                    value={searchParticipants}
                    onChange={(e) => setSearchParticipants(e.target.value)}
                  />
                </div>

                {/* Chips of selected */}
                {selectedPool.length > 0 && (
                  <div className="rd-chips">
                    {selectedPool.map((p) => {
                      const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.username;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className="rd-chip"
                          onClick={() => toggleParticipant(p.id)}
                        >
                          {name} <X size={12} />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Scrollable pool list */}
                <div className="rd-pool-list">
                  {loadingParticipants && <p className="rd-empty-state">Chargement…</p>}
                  {!loadingParticipants && filteredPool.length === 0 && (
                    <p className="rd-empty-state">Aucun participant trouvé.</p>
                  )}
                  {!loadingParticipants && filteredPool.map((p) => {
                    const checked = editParticipantIds.includes(p.id);
                    const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.username;
                    return (
                      <label key={p.id} className={`rd-pool-item ${checked ? "selected" : ""}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleParticipant(p.id)}
                        />
                        <div className="rd-avatar sm">{getInitials(name)}</div>
                        <div>
                          <strong>{name}</strong>
                          <small>{p.email}{p.role ? ` • ${p.role}` : ""}</small>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ── Delete / Cancel Modal ──────────────────────────────────────── */}
      {showDeleteModal && (
        <div className="rd-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="rd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rd-modal-icon">
              <AlertTriangle size={32} />
            </div>
            <h3>Action irréversible</h3>
            <p>Choisissez l'action à effectuer sur cette réunion.</p>

            <div className="rd-modal-options">
              <label className={`rd-modal-option ${deleteAction === "cancel" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="deleteAction"
                  value="cancel"
                  checked={deleteAction === "cancel"}
                  onChange={() => setDeleteAction("cancel")}
                />
                <div>
                  <strong>Annuler la réunion</strong>
                  <small>La réunion reste visible avec le statut "Annulée"</small>
                </div>
              </label>
              <label className={`rd-modal-option ${deleteAction === "delete" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="deleteAction"
                  value="delete"
                  checked={deleteAction === "delete"}
                  onChange={() => setDeleteAction("delete")}
                />
                <div>
                  <strong>Supprimer définitivement</strong>
                  <small>La réunion sera supprimée de la base de données</small>
                </div>
              </label>
            </div>

            <div className="rd-modal-actions">
              <button
                className="rd-btn rd-btn-ghost"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                Annuler
              </button>
              <button
                className="rd-btn rd-btn-danger"
                onClick={handleDeleteOrCancel}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Traitement…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="rd-footer">
        <p>© 2026 Honoris United Universities. Education for Impact.</p>
        <div>
          <a href="#">Contact</a>
          <a href="#">Mentions Légales</a>
          <a href="#">Confidentialité</a>
        </div>
      </footer>
    </div>
  );
}