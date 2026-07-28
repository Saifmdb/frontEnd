import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/navbar";
import { authFetch } from "../api/authFetch.js";
import "./frontcss/mes-reclamations.css";

const API_BASE = "http://127.0.0.1:8000/api/reclamations";
const ITEMS_PER_PAGE = 6;

const normalizeStatus = (status) => {
  if (!status) return "EN_ATTENTE";
  if (status === "OUVERTE") return "EN_ATTENTE";
  if (status === "EN_COURS") return "EN_COURS";
  if (status === "RESOLUE" || status === "FERMEE") return "RESOLUE";
  return "EN_ATTENTE";
};

const statusMeta = {
  EN_ATTENTE: { label: "En attente", className: "status en-attente" },
  EN_COURS: { label: "En cours", className: "status en-cours" },
  RESOLUE: { label: "Résolue", className: "status resolue" },
};

export default function MesReclamations() {
  const navigate = useNavigate();
  const [reclamations, setReclamations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("TOUTES");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchMesReclamations = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${API_BASE}/mes/`);
      const data = await response.json();
      if (data.success) {
        const mapped = (data.reclamations || []).map((item) => ({
          ...item,
          normalizedStatus: normalizeStatus(item.statut),
        }));
        setReclamations(mapped);
      }
    } catch (error) {
      console.error("Erreur chargement réclamations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMesReclamations();
  }, []);

  const filteredReclamations = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return reclamations.filter((item) => {
      if (activeFilter !== "TOUTES" && item.normalizedStatus !== activeFilter) {
        return false;
      }

      if (!searchLower) return true;

      const code = `RECL-${item.date_creation ? new Date(item.date_creation).getFullYear() : "XXXX"}-${item.id}`.toLowerCase();
      const objet = (item.objet || "").toLowerCase();
      return code.includes(searchLower) || objet.includes(searchLower);
    });
  }, [reclamations, activeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredReclamations.length / ITEMS_PER_PAGE));

  const pagedReclamations = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredReclamations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredReclamations, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [activeFilter, search]);

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const buildTicketCode = (item) => {
    const year = item.date_creation ? new Date(item.date_creation).getFullYear() : "XXXX";
    return `#RECL-${year}-${String(item.id).padStart(3, "0")}`;
  };

  const handleOpenDetail = (item) => {
    navigate(`/mes-reclamations/${item.id}`);
  };

  const pageNumbers = useMemo(() => {
    const max = Math.min(totalPages, 5);
    const start = Math.max(1, Math.min(page - 2, totalPages - max + 1));
    return Array.from({ length: max }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <div className="mes-reclamations-page">
      <Navbar />

      <main className="mes-reclamations-main">
        <header className="mes-reclamations-header">
          <h1>Mes Réclamations</h1>
          <p>Gérez et suivez l&apos;évolution de vos demandes d&apos;assistance auprès du réseau Honoris.</p>
        </header>

        <section className="mes-reclamations-filters">
          <div className="filter-tabs">
            <button
              type="button"
              className={`filter-btn ${activeFilter === "TOUTES" ? "active" : ""}`}
              onClick={() => setActiveFilter("TOUTES")}
            >
              Toutes
            </button>
            <button
              type="button"
              className={`filter-btn ${activeFilter === "EN_COURS" ? "active" : ""}`}
              onClick={() => setActiveFilter("EN_COURS")}
            >
              En cours
            </button>
            <button
              type="button"
              className={`filter-btn ${activeFilter === "RESOLUE" ? "active" : ""}`}
              onClick={() => setActiveFilter("RESOLUE")}
            >
              Résolues
            </button>
            <button
              type="button"
              className={`filter-btn ${activeFilter === "EN_ATTENTE" ? "active" : ""}`}
              onClick={() => setActiveFilter("EN_ATTENTE")}
            >
              En attente
            </button>
          </div>

          <div className="search-box">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par ID ou objet..."
            />
          </div>
        </section>

        <section className="mes-reclamations-list">
          {loading ? (
            <div className="empty-state">Chargement...</div>
          ) : pagedReclamations.length === 0 ? (
            <div className="empty-state">Aucune réclamation trouvée.</div>
          ) : (
            pagedReclamations.map((item) => (
              <article key={item.id} className={`reclamation-item ${item.normalizedStatus === "RESOLUE" ? "resolved-border" : ""}`}>
                <div className="item-left">
                  <span className="ticket-code">{buildTicketCode(item)}</span>
                  <h3>{item.objet}</h3>
                  <div className="item-date">
                    <span className="material-symbols-outlined">calendar_today</span>
                    <span>{formatDate(item.date_creation)}</span>
                  </div>
                </div>

                <div className="item-right">
                  <span className={statusMeta[item.normalizedStatus]?.className || "status en-attente"}>
                    <span className="dot"></span>
                    {statusMeta[item.normalizedStatus]?.label || "En attente"}
                  </span>

                  <button type="button" className="detail-btn" onClick={() => handleOpenDetail(item)}>
                    Voir le détail
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>

                  <button type="button" className="delete-btn" aria-label="Supprimer" title="Supprimer">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="pagination-row">
          <button
            type="button"
            className="page-nav"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>

          {pageNumbers.map((n) => (
            <button
              key={n}
              type="button"
              className={`page-number ${page === n ? "active" : ""}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}

          <button
            type="button"
            className="page-nav"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </section>
      </main>

      <footer className="mes-reclamations-footer">
        <div className="footer-inner">
          <div className="footer-brand">Honoris United Universities</div>
          <nav>
            <a href="#">Mentions Légales</a>
            <a href="#">Politique de Confidentialité</a>
            <a href="#">Contact Support</a>
          </nav>
          <div className="footer-copy">© 2024 Honoris United Universities. All rights reserved.</div>
        </div>
      </footer>

      <button type="button" className="floating-add" title="Nouvelle réclamation" onClick={() => (window.location.href = "/reclamation")}>
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
  );
}
