import { useMemo, useState, useEffect } from "react";
import Navbar from "./components/navbar.jsx";
import "../frontoffic/frontcss/welcome.css";

function getAuthHeaders() {
  const token =
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("temp_token");

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function formatReunionDate(dateStr, timeStr) {
  if (!dateStr) return "";
  const [day, month, year] = dateStr.split("/").map(Number);
  const eventDate = new Date(year, month - 1, day);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isToday = eventDate.toDateString() === today.toDateString();
  const isTomorrow = eventDate.toDateString() === tomorrow.toDateString();
  
  const startTime = timeStr ? timeStr.split(" - ")[0] : "";

  if (isToday) return `Aujourd'hui à ${startTime}`;
  if (isTomorrow) return `Demain à ${startTime}`;
  return `${dateStr} à ${startTime}`;
}

export default function Welcome() {
  const [nextReunion, setNextReunion] = useState(null);

  useEffect(() => {
    async function fetchNextReunion() {
      try {
        const now = new Date();
        let upcoming = [];

        // 1. Current month
        let year = now.getFullYear();
        let month = now.getMonth() + 1;
        let response = await fetch(`/api/reunions/calendar/?year=${year}&month=${month}`, {
          method: "GET",
          credentials: "include",
          headers: getAuthHeaders(),
        });
        let data = await response.json();
        if (response.ok && data.success && data.events) {
          upcoming = data.events.filter(event => new Date(event.date_debut) > now);
        }

        // 2. Next month fallback
        if (upcoming.length === 0) {
          let nextMonth = now.getMonth() + 2;
          let nextYear = now.getFullYear();
          if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
          }
          response = await fetch(`/api/reunions/calendar/?year=${nextYear}&month=${nextMonth}`, {
            method: "GET",
            credentials: "include",
            headers: getAuthHeaders(),
          });
          data = await response.json();
          if (response.ok && data.success && data.events) {
            upcoming = data.events.filter(event => new Date(event.date_debut) > now);
          }
        }

        if (upcoming.length > 0) {
          upcoming.sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut));
          setNextReunion(upcoming[0]);
        }
      } catch (err) {
        console.error("Erreur chargement prochaine échéance:", err);
      }
    }
    fetchNextReunion();
  }, []);

  const displayName = useMemo(() => {
    try {
      const rawUser = localStorage.getItem("user");
      if (!rawUser) return "Utilisateur";

      const user = JSON.parse(rawUser);
      const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
      return fullName || user?.username || "Utilisateur";
    } catch {
      return "Utilisateur";
    }
  }, []);

  return (
    <div className="welcome-dashboard">
      <Navbar />

      <main className="welcome-main">
        <section className="welcome-header">
          <div>
            <p className="welcome-kicker">Tableau de bord employe</p>
            <h1>
              Bienvenue sur votre Espace Employe, <span>{displayName}</span>
            </h1>
          </div>
          <div className="welcome-status-card">
            <div className="status-icon">
              <span className="material-symbols-outlined">person_celebrate</span>
            </div>
            <div>
              <p>Statut du jour</p>
              <strong>Disponible au bureau</strong>
            </div>
          </div>
        </section>

        <section className="welcome-hero">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNMCdNLxBpTNrRO9CT8bFMQHe73mWhRCOx6TWhgjXqg2tIIEBHJMuk26aJkyesz3aJ-qHhv3FcR7VPsjXyBmW44qxxHpEFezi3PFKbY9EGq0D-bzZi1_Wl0G3pP6AW4S5dt_MDaaRVNX5LR77AvQJyQB5CRhW6sVk2PJEysiljuySCQ8jobI8lgDkdTvjxxArXpRtyvY6PI9IQ7Cqn6sxxL6OazOltQ-n6tdzO14ISbDEREGFsNUtXSZMPXaLtJSLPiAMNjBWafZY"
            alt="Excellence academique"
          />
          <div className="welcome-hero-overlay">
            <span>Evenement reseau</span>
            <h2>L&apos;Excellence Academique au Coeur de Notre Mission</h2>
            <p>
              Decouvrez les nouvelles initiatives pedagogiques 2024 pour l&apos;ensemble du reseau Honoris United Universities.
            </p>
            <button type="button">En savoir plus →</button>
          </div>
        </section>

        <section className="welcome-services">
          <div className="welcome-section-head">
            <h3>Mes Services RH</h3>
            <div className="line"></div>
            <button type="button">Voir tout l&apos;annuaire</button>
          </div>

          <div className="welcome-services-grid">
            <article className="welcome-service-card">
              <div className="welcome-service-icon"><span className="material-symbols-outlined">calendar_month</span></div>
              <h4>Gestion des Conges</h4>
              <p>Poser et suivre mes absences</p>
            </article>
            <article className="welcome-service-card">
              <div className="welcome-service-icon"><span className="material-symbols-outlined">payments</span></div>
              <h4>Ma Paie</h4>
              <p>Fiches de paie et primes</p>
            </article>
            <article className="welcome-service-card">
              <div className="welcome-service-icon"><span className="material-symbols-outlined">description</span></div>
              <h4>Documents RH</h4>
              <p>Contrats et attestations</p>
            </article>
            <article className="welcome-service-card">
              <div className="welcome-service-icon"><span className="material-symbols-outlined">school</span></div>
              <h4>Formation</h4>
              <p>E-learning et certifications</p>
            </article>
            <article className="welcome-service-card">
              <div className="welcome-service-icon"><span className="material-symbols-outlined">support_agent</span></div>
              <h4>Reclamation RH</h4>
              <p>Suivi des demandes et reclamations</p>
            </article>
          </div>
        </section>

        <section className="welcome-columns">
          <div className="news-column">
            <h3>Dernieres Actualites Honoris</h3>

            <article className="welcome-news-card">
              <img
                src="/images/image1.png"
                alt="Actualite Honoris"
              />
              <div>
                <div className="news-meta">
                  <span className="welcome-tag">Reseau</span>
                  <small>Il y a 2 heures</small>
                </div>
                <h4>Nouveau partenariat strategique avec l&apos;universite de Cape Town</h4>
                <p>
                  L&apos;initiative vise a renforcer les echanges academiques et la recherche conjointe dans le domaine des sciences.
                </p>
              </div>
            </article>

            <article className="welcome-news-card">
              <img
                src="/images/image222.png"
                alt="Innovation Honoris"
              />
              <div>
                <div className="news-meta">
                  <span className="welcome-tag welcome-tag-red">Innovation</span>
                  <small>Hier</small>
                </div>
                <h4>Lancement du Hub d&apos;Innovation Digitale a Casablanca</h4>
                <p>
                  Un espace dedie a la creativite et au developpement de nouvelles solutions pour l&apos;education en Afrique.
                </p>
              </div>
            </article>
          </div>

          <aside className="summary-column">
            <h3>Ma Synthese</h3>
            <div className="summary-card highlight">
              <p className="summary-title">Notifications (3)</p>
              <ul>
                <li>Votre demande de conge pour aout a ete approuvee.</li>
                <li>Mise a jour annuelle du code de conduite disponible.</li>
                <li>Rappel: Completez votre formation RGPD avant vendredi.</li>
              </ul>
            </div>

            <div className="summary-card">
              <p className="summary-title dark">Prochaines Echeances</p>
              {nextReunion ? (
                <div className="summary-row">
                  <span>{nextReunion.titre}</span>
                  <small>{formatReunionDate(nextReunion.date_label, nextReunion.time_label)}</small>
                </div>
              ) : (
                <p className="empty-state" style={{ fontSize: '0.85rem', color: 'var(--cb-on-surface-variant)', marginTop: '8px' }}>
                  Aucune réunion prévue
                </p>
              )}
            </div>
          </aside>
        </section>
      </main>

      <footer className="welcome-footer">
        <p>© 2024 Honoris United Universities. Education for Impact.</p>
        <div>
          <a href="#">Politique de confidentialite</a>
          <a href="#">Conditions d&apos;utilisation</a>
          <a href="#">Support Academique</a>
        </div>
      </footer>
    </div>
  );
}