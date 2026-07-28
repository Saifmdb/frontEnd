import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Video, Building2, PlusCircle } from "lucide-react";

import Navbar from "./components/navbar.jsx";
import "./frontcss/reunions-calendar.css";

const DAYS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
const MONTH_LABELS = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

const EVENT_TONES = ["tone-red", "tone-green", "tone-blue", "tone-gold"];

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
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "U";
}

function getEventToneClass(event) {
  const seed = `${event?.departement || ""}-${event?.titre || ""}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return EVENT_TONES[Math.abs(hash) % EVENT_TONES.length];
}

export default function Reunions() {
  const [cursorDate, setCursorDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const canCreateReunion = user?.role === "ORGANIZER";

  useEffect(() => {
    async function loadCalendar() {
      try {
        setLoading(true);
        setError("");

        const year = cursorDate.getFullYear();
        const month = cursorDate.getMonth() + 1;

        const response = await fetch(`/api/reunions/calendar/?year=${year}&month=${month}`, {
          method: "GET",
          credentials: "include",
          headers: getAuthHeaders(),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Impossible de charger les reunions.");
        }

        setEvents(data.events || []);
      } catch (err) {
        setError(err.message || "Erreur de chargement du calendrier.");
      } finally {
        setLoading(false);
      }
    }

    loadCalendar();
  }, [cursorDate]);

  const monthTitle = `${MONTH_LABELS[cursorDate.getMonth()]} ${cursorDate.getFullYear()}`;

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const event of events) {
      const day = Number(event.day);
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(event);
    }
    return map;
  }, [events]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return [...events]
      .filter((event) => new Date(event.date_fin) >= now)
      .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut))
      .slice(0, 4);
  }, [events]);

  const calendarCells = useMemo(() => {
    const year = cursorDate.getFullYear();
    const month = cursorDate.getMonth();
    const first = new Date(year, month, 1);
    const firstDay = (first.getDay() + 6) % 7;
    const lastDay = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDay; i += 1) {
      cells.push({ key: `empty-${i}`, empty: true });
    }

    const today = new Date();
    for (let day = 1; day <= lastDay; day += 1) {
      const isToday =
        today.getDate() === day &&
        today.getMonth() === month &&
        today.getFullYear() === year;

      cells.push({ key: `day-${day}`, empty: false, day, isToday, events: eventsByDay.get(day) || [] });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ key: `tail-${cells.length}`, empty: true });
    }

    return cells;
  }, [cursorDate, eventsByDay]);

  const goToPrevMonth = () => {
    setCursorDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCursorDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="rc-page">
      <Navbar />

      <main className="rc-main">
        <nav className="rc-breadcrumb" aria-label="Fil d'ariane">
          <Link to="/welcome">Accueil</Link>
          <span>›</span>
          <strong>Planification des reunions</strong>
        </nav>

        <div className="rc-layout">
          <section className="rc-core">
            <div className="rc-header">
              <div>
                <h1> Mon planning</h1>
                <p>Gerez les sessions de collaboration et les reunions strategiques de l&apos;Honoris Network.</p>
              </div>
              {canCreateReunion && (
                <Link className="rc-create-btn" to="/reunions/create">
                  <PlusCircle size={18} />
                  <span>Nouvelle Reunion</span>
                </Link>
              )}
            </div>

            <div className="rc-month-toolbar">
              <div className="rc-month-switcher">
                <button type="button" onClick={goToPrevMonth} aria-label="Mois precedent">
                  <ChevronLeft size={18} />
                </button>
                <span>{monthTitle}</span>
                <button type="button" onClick={goToNextMonth} aria-label="Mois suivant">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {error && <div className="rc-alert rc-error">{error}</div>}

            <div className="rc-calendar-shell">
              <div className="rc-days-header">
                {DAYS.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="rc-grid">
                {loading && <div className="rc-loading">Chargement des reunions...</div>}

                {!loading &&
                  calendarCells.map((cell) => {
                    if (cell.empty) {
                      return <div key={cell.key} className="rc-cell rc-empty" />;
                    }

                    const hasMeet = cell.events.length > 0;
                    const hasMultipleMeet = cell.events.length > 1;

                    return (
                      <div
                        key={cell.key}
                        className={`rc-cell ${cell.isToday ? "is-today" : ""} ${hasMeet ? "has-meet" : ""} ${hasMultipleMeet ? "has-multi" : ""}`}
                      >
                        <span className="rc-day-number">{String(cell.day).padStart(2, "0")}</span>

                        <div className="rc-cell-events">
                          {cell.events.slice(0, 2).map((event) => (
                            // CHANGED: was <a href={join_url}>, now navigates to detail page
                            <Link
                              key={event.id}
                              to={`/reunions/${event.id}`}
                              className={`rc-mini-event ${getEventToneClass(event)}`}
                              title={`${event.titre} - ${event.time_label}`}
                            >
                              {event.titre}
                            </Link>
                          ))}
                          {cell.events.length > 2 && (
                            <span className="rc-more">+{cell.events.length - 2} autres</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>

          <aside className="rc-side">
            <div className="rc-side-card">
              <div className="rc-side-head">
                <h2>Prochaines Reunions</h2>
                <span>LIVE</span>
              </div>

              {loading && <p className="rc-side-state">Chargement...</p>}
              {!loading && upcoming.length === 0 && (
                <p className="rc-side-state">Aucune reunion sur ce mois.</p>
              )}

              <div className="rc-upcoming-list">
                {upcoming.map((event) => {
                  const initials = event.participants_preview.map((item) => item.initials || getInitials(item.full_name));
                  return (
                    // CHANGED: entire article card is now a clickable link to detail
                    <Link
                      key={event.id}
                      to={`/reunions/${event.id}`}
                      className="rc-upcoming-item"
                      style={{ textDecoration: "none", color: "inherit", display: "block" }}
                    >
                      <div className="rc-upcoming-top">
                        <strong>{event.departement || "GENERAL"}</strong>
                        <small>{event.time_label}</small>
                      </div>

                      <h3>{event.titre}</h3>

                      <div className="rc-upcoming-bottom">
                        <div className="rc-avatars">
                          {initials.slice(0, 3).map((initial, idx) => (
                            <span key={`${event.id}-p-${idx}`} className="rc-avatar">{initial}</span>
                          ))}
                          {event.participants_total > 3 && (
                            <span className="rc-avatar rc-more-avatar">+{event.participants_total - 3}</span>
                          )}
                        </div>

                        {/* Video icon still opens Meet directly, stops propagation */}
                        {event.can_join ? (
                          <a
                            href={event.join_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rc-join-icon"
                            title="Rejoindre"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Video size={16} />
                          </a>
                        ) : (
                          <span className="rc-join-icon muted" title="Meeting non accessible">
                            <Building2 size={16} />
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="rc-help-card">
                <p>Besoin d&apos;aide ?</p>
                <strong>Consultez le guide utilisateur</strong>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="rc-footer">
        <div>
          <h4>Honoris United Universities</h4>
          <p>© 2023 Academic Management System. All rights reserved.</p>
        </div>
        <div className="rc-footer-links">
          <a href="#">Support</a>
          <a href="#">Politique RH</a>
          <a href="#">Securite</a>
        </div>
      </footer>
    </div>
  );
}