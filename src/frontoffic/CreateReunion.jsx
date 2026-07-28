import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Lightbulb, UserPlus } from "lucide-react";

import Navbar from "./components/navbar.jsx";
import "./frontcss/reunion-create.css";

const DEFAULT_TIPS = [
  "Prevoyez 5 minutes en fin de seance pour recapitulatif des actions.",
  "Verifiez que le lien de reunion est accessible a tous les invites externes.",
  "Partagez l'ordre du jour au moins 24h avant la reunion.",
];

// ✅ FIX: Ne pas convertir en UTC, garder l'heure locale
function toIsoFromDateTime(date, time) {
  if (!date || !time) return null;
  const timeStr = time.length === 5 ? `${time}:00` : time;
  return `${date}T${timeStr}`; // ex: "2026-04-25T10:11:00" sans conversion UTC
}

function getAuthHeaders() {
  const token =
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("temp_token");

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export default function CreateReunion() {
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const [titre, setTitre] = useState("");
  const [date, setDate] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [description, setDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [formErrors, setFormErrors] = useState({
    titre: "",
    date: "",
    heureDebut: "",
    heureFin: "",
    participants: "",
  });

  useEffect(() => {
    async function loadAssignableParticipants() {
      try {
        setLoadingParticipants(true);
        setError("");

        const response = await fetch("/api/reunions/assignable-users/", {
          method: "GET",
          credentials: "include",
          headers: getAuthHeaders(),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Impossible de charger les participants.");
        }

        setParticipants(data.participants || []);
      } catch (err) {
        setError(err.message || "Erreur de chargement.");
      } finally {
        setLoadingParticipants(false);
      }
    }

    loadAssignableParticipants();
  }, []);

  const filteredParticipants = useMemo(() => {
    if (!searchTerm.trim()) return participants;
    const query = searchTerm.toLowerCase();
    return participants.filter((emp) => {
      const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
      return (
        fullName.includes(query) ||
        (emp.username || "").toLowerCase().includes(query) ||
        (emp.email || "").toLowerCase().includes(query)
      );
    });
  }, [participants, searchTerm]);

  const selectedParticipants = useMemo(() => {
    const selectedSet = new Set(selectedParticipantIds);
    return participants.filter((emp) => selectedSet.has(emp.id));
  }, [participants, selectedParticipantIds]);

  const toggleParticipant = (userId) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
    setFormErrors((prev) => ({ ...prev, participants: "" }));
  };

  const removeParticipant = (userId) => {
    setSelectedParticipantIds((prev) => prev.filter((id) => id !== userId));
  };

  const validateForm = () => {
    const nextErrors = {
      titre: "",
      date: "",
      heureDebut: "",
      heureFin: "",
      participants: "",
    };

    if (!titre.trim()) {
      nextErrors.titre = "Le titre est obligatoire.";
    }

    if (!date) {
      nextErrors.date = "La date est obligatoire.";
    }

    if (!heureDebut) {
      nextErrors.heureDebut = "L'heure de debut est obligatoire.";
    }

    if (!heureFin) {
      nextErrors.heureFin = "L'heure de fin est obligatoire.";
    }

    // ✅ FIX: Comparer les heures locales directement (pas de conversion UTC)
    if (date && heureDebut && heureFin) {
      const startsAt = toIsoFromDateTime(date, heureDebut);
      const endsAt = toIsoFromDateTime(date, heureFin);

      if (endsAt <= startsAt) {
        nextErrors.heureFin = "L'heure de fin doit etre apres l'heure de debut.";
      }

      // Comparer avec la date/heure locale actuelle
      const now = new Date();
      const localNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;

      if (startsAt <= localNow) {
        nextErrors.heureDebut = "La date et l'heure de debut doivent etre dans le futur.";
      }
    }

    if (selectedParticipantIds.length === 0) {
      nextErrors.participants = "Selectionnez au moins un participant.";
    }

    setFormErrors(nextErrors);
    return Object.values(nextErrors).every((item) => !item);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(null);

    if (!validateForm()) {
      setError("Veuillez corriger les erreurs du formulaire.");
      return;
    }

    // ✅ FIX: Utiliser date_debut / date_fin (noms du modèle Django)
    const payload = {
      titre: titre.trim(),
      description: description.trim(),
      date_debut: toIsoFromDateTime(date, heureDebut),
      date_fin: toIsoFromDateTime(date, heureFin),
      participant_ids: selectedParticipantIds,
    };

    console.log("Payload envoyé:", payload);

    try {
      setSubmitLoading(true);

      const response = await fetch("/api/reunions/create/", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Réponse backend:", data);

      if (!response.ok || !data.success) {
        throw new Error(data.details || data.error || "Erreur lors de la creation.");
      }

      setSuccess(data.reunion);
      setTitre("");
      setDate("");
      setHeureDebut("");
      setHeureFin("");
      setDescription("");
      setSelectedParticipantIds([]);
    } catch (err) {
      setError(err.message || "Erreur inconnue.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="meeting-page">
      <Navbar />

      <main className="meeting-main">
        <nav className="meeting-breadcrumb" aria-label="Fil d'ariane">
          <Link to="/welcome">Accueil</Link>
          <span>/</span>
          <Link to="/reunions">Reunion</Link>
          <span>/</span>
          <strong>Creer Reunion</strong>
        </nav>

        <header className="meeting-header">
          <h1>Planifier une reunion en ligne</h1>
          <p>
            Organisez votre prochaine session de travail virtuelle via Google Meet.
            Le systeme cree automatiquement le lien de reunion et notifie tous les participants affectes.
          </p>
        </header>

        {error && <div className="meeting-alert error">{error}</div>}

        {success && (
          <div className="meeting-alert success">
            Reunion creee avec succes !{" "}
            {success.teams_join_url && (
              <>
                Lien :{" "}
                <a href={success.teams_join_url} target="_blank" rel="noreferrer">
                  Ouvrir la reunion
                </a>
              </>
            )}
          </div>
        )}

        <section className="meeting-layout">
          <form className="meeting-form-card" onSubmit={handleSubmit} noValidate>

            {/* Titre */}
            <label>
              <span>Titre de la reunion</span>
              <input
                type="text"
                value={titre}
                onChange={(e) => {
                  setTitre(e.target.value);
                  if (formErrors.titre) setFormErrors((prev) => ({ ...prev, titre: "" }));
                }}
                placeholder="Ex: Revue Strategique Q3"
                className={formErrors.titre ? "meeting-field-invalid" : ""}
              />
              {formErrors.titre && <p className="meeting-field-error">{formErrors.titre}</p>}
            </label>

            {/* Date + Heures */}
            <div className="meeting-grid-3">
              <label>
                <span>Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (formErrors.date) setFormErrors((prev) => ({ ...prev, date: "" }));
                  }}
                  min={new Date().toISOString().slice(0, 10)}
                  className={formErrors.date ? "meeting-field-invalid" : ""}
                />
                {formErrors.date && <p className="meeting-field-error">{formErrors.date}</p>}
              </label>

              <label>
                <span>Heure de debut</span>
                <input
                  type="time"
                  value={heureDebut}
                  onChange={(e) => {
                    setHeureDebut(e.target.value);
                    if (formErrors.heureDebut) setFormErrors((prev) => ({ ...prev, heureDebut: "" }));
                  }}
                  className={formErrors.heureDebut ? "meeting-field-invalid" : ""}
                />
                {formErrors.heureDebut && <p className="meeting-field-error">{formErrors.heureDebut}</p>}
              </label>

              <label>
                <span>Heure de fin</span>
                <input
                  type="time"
                  value={heureFin}
                  onChange={(e) => {
                    setHeureFin(e.target.value);
                    if (formErrors.heureFin) setFormErrors((prev) => ({ ...prev, heureFin: "" }));
                  }}
                  className={formErrors.heureFin ? "meeting-field-invalid" : ""}
                />
                {formErrors.heureFin && <p className="meeting-field-error">{formErrors.heureFin}</p>}
              </label>
            </div>

            {/* Participants */}
            <label>
              <span>Participants</span>
              <div className="field-with-icon">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par nom ou email"
                />
                <UserPlus size={18} />
              </div>
            </label>

            <div className="meeting-participants-list">
              {loadingParticipants && (
                <p className="meeting-participants-state is-loading">Chargement des participants...</p>
              )}
              {!loadingParticipants && filteredParticipants.length === 0 && (
                <p className="meeting-participants-state is-empty">Aucun participant trouve.</p>
              )}
              {!loadingParticipants &&
                filteredParticipants.map((emp) => {
                  const checked = selectedParticipantIds.includes(emp.id);
                  const fullName =
                    `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.username;
                  return (
                    <label
                      key={emp.id}
                      className={`meeting-participant-item ${checked ? "is-selected" : ""}`}
                    >
                      <input
                        className="meeting-participant-checkbox"
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleParticipant(emp.id)}
                      />
                      <div className="meeting-participant-meta">
                        <strong className="meeting-participant-name">{fullName}</strong>
                        <small className="meeting-participant-email">
                          {emp.email}
                          {emp.role ? ` • ${emp.role}` : ""}
                          {emp.department ? ` • ${emp.department}` : ""}
                        </small>
                      </div>
                    </label>
                  );
                })}
            </div>

            {formErrors.participants && (
              <p className="meeting-field-error">{formErrors.participants}</p>
            )}

            {selectedParticipants.length > 0 && (
              <p className="meeting-participants-count">
                {selectedParticipants.length} participant(s) selectionne(s)
              </p>
            )}

            {selectedParticipants.length > 0 && (
              <div className="meeting-participants-chips">
                {selectedParticipants.map((emp) => {
                  const fullName =
                    `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.username;
                  return (
                    <button
                      className="meeting-participants-chip"
                      type="button"
                      key={emp.id}
                      onClick={() => removeParticipant(emp.id)}
                    >
                      {fullName}{" "}
                      <span className="meeting-participants-chip-close">x</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Description */}
            <label>
              <span>Ordre du jour / Description</span>
              <textarea
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Quels sont les objectifs de cette reunion ?"
              />
            </label>

            {/* Actions */}
            <div className="meeting-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => window.history.back()}
              >
                Annuler
              </button>
              <button type="submit" className="btn-primary" disabled={submitLoading}>
                {submitLoading ? "Creation..." : "Creer la reunion"}
              </button>
            </div>
          </form>

          {/* Sidebar */}
          <aside className="meeting-sidebar">
            <div className="tips-card">
              <h3>
                <Lightbulb size={18} /> Conseils de planification
              </h3>
              <ul>
                {DEFAULT_TIPS.map((tip, index) => (
                  <li key={tip}>
                    <span>{index + 1}</span>
                    <p>{tip}</p>
                  </li>
                ))}
              </ul>
            </div>

            <article className="hero-promo-card">
              <img
                src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop"
                alt="Espace collaboratif"
              />
              <div>
                <h4>Espaces Collaboratifs</h4>
                <p>Facilitez vos echanges a distance avec Google Meet.</p>
              </div>
            </article>
          </aside>
        </section>
      </main>

      <footer className="meeting-footer">
        <p>© 2026 Honoris United Universities. Education for Impact.</p>
        <div>
          <a href="#">Contact</a>
          <a href="#">Mentions Legales</a>
          <a href="#">Confidentialite</a>
        </div>
      </footer>
    </div>
  );
}