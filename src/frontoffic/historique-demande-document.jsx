import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "./components/navbar";
import { authFetch } from "../api/authFetch.js";
import "./frontcss/historique-demande-document.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const FILE_BASE = import.meta.env.VITE_API_FILE_URL || "http://localhost:8000";
const ITEMS_PER_PAGE = 4;

const STATUS_CONFIG = {
  en_attente: { label: "En attente", className: "doc-status-pending" },
  en_cours: { label: "En cours", className: "doc-status-progress" },
  traite: { label: "Pret", className: "doc-status-ready" },
  refuse: { label: "Rejete", className: "doc-status-rejected" },
};

const MODE_CONFIG = {
  email: { label: "Email Digital", icon: "alternate_email" },
  retrait: { label: "Retrait sur place", icon: "mail" },
};

const DOCUMENT_META = {
  attestation_travail: {
    icon: "description",
    tone: "doc-icon-ruby",
    department: "Departement RH",
  },
  fiche_paie: {
    icon: "article",
    tone: "doc-icon-amber",
    department: "Comptabilite",
  },
  titre_conge: {
    icon: "history_edu",
    tone: "doc-icon-ruby",
    department: "Departement RH",
  },
  certificat_emploi: {
    icon: "assignment_ind",
    tone: "doc-icon-blue",
    department: "Departement RH",
  },
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  const raw = date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const parts = raw.split(" ");
  if (parts.length < 3) return raw;
  const [day, month, year] = parts;
  return `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
};

const getResponseFiles = (demande) => {
  const files = [];
  const seen = new Set();

  if (demande?.fichiers_reponse?.length) {
    demande.fichiers_reponse.forEach((item) => {
      if (!item?.url || seen.has(item.url)) return;
      seen.add(item.url);
      files.push({
        name: item.name?.split("/").pop() || "Document",
        url: item.url,
      });
    });
  }

  if (demande?.fichier_reponse && !seen.has(demande.fichier_reponse)) {
    seen.add(demande.fichier_reponse);
    files.push({
      name:
        demande?.fichier_reponse_name ||
        demande.fichier_reponse.split("/").pop() ||
        "Document",
      url: demande.fichier_reponse,
    });
  }

  return files;
};

export default function HistoriqueDemandeDocument() {
  const location = useLocation();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchDemandes = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await authFetch(
          `${API_BASE}/documents-rh/demandes/mes-demandes/`
        );

        if (!response.ok) {
          setError("Erreur lors du chargement des demandes.");
          setDemandes([]);
          return;
        }

        const data = await response.json();

        if (!data.success) {
          setError(data.error || "Erreur lors du chargement des demandes.");
          setDemandes([]);
          return;
        }

        setDemandes(data.demandes || []);
      } catch (err) {
        console.error("Erreur fetch demandes:", err);
        setError("Impossible de charger l'historique. Verifiez votre connexion.");
      } finally {
        setLoading(false);
      }
    };

    fetchDemandes();
  }, []);

  const totalPages = Math.max(1, Math.ceil(demandes.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedDemandes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return demandes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, demandes]);

  const renderStatus = (statut) => {
    const config = STATUS_CONFIG[statut] || {
      label: statut || "—",
      className: "doc-status-neutral",
    };
    return <span className={`doc-status ${config.className}`}>{config.label}</span>;
  };

  const renderMode = (mode) => {
    const config = MODE_CONFIG[mode] || { label: mode || "—", icon: "mail" };
    return (
      <span className="doc-mode">
        <span className="material-symbols-outlined">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  return (
    <div className="doc-history-page">
      <Navbar />
      <main className="doc-history-main">
        <section className="doc-history-header">
          <nav className="doc-history-breadcrumb">
            <Link
              to="/welcome"
              className={location.pathname === "/welcome" ? "active" : ""}
            >
              Accueil
            </Link>
            <span className="material-symbols-outlined">chevron_right</span>
           
            <span className="current">Historique</span>
          </nav>

          <div className="doc-history-header-row">
            <div className="doc-history-title">
              <h1>Historique des demandes</h1>
            
            </div>
            <div className="doc-history-actions">
              <button className="doc-history-btn" type="button">
                <span className="material-symbols-outlined">filter_list</span>
                Filtrer
              </button>
              <Link className="doc-history-btn doc-history-btn-primary" to="/demande-document">
                <span className="material-symbols-outlined">add</span>
                Nouvelle demande
              </Link>
            </div>
          </div>
        </section>

        <section className="doc-history-table-section">
          <div className="doc-history-table-card">
            <div className="doc-history-table-wrapper">
              <table className="doc-history-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Document</th>
                    <th>Date de demande</th>
                    <th>Mode de livraison</th>
                    <th className="text-center">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="doc-history-empty">
                        <span className="material-symbols-outlined loading">progress_activity</span>
                        Chargement de l'historique...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="doc-history-empty">
                        {error}
                      </td>
                    </tr>
                  ) : paginatedDemandes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="doc-history-empty">
                        Aucune demande trouvee.
                      </td>
                    </tr>
                  ) : (
                    paginatedDemandes.map((demande) => {
                      const meta = DOCUMENT_META[demande.type_document] || {
                        icon: "description",
                        tone: "doc-icon-neutral",
                        department: "Service RH",
                      };
                      const responseFiles = getResponseFiles(demande);
                      const showAttachments =
                        (demande.statut === "traite" || demande.statut === "approuve") &&
                        demande.mode_livraison === "email" &&
                        responseFiles.length > 0;
                      return (
                        <tr key={demande.id}>
                          <td className="doc-id">#DOC-{String(demande.id).padStart(4, "0")}</td>
                          <td>
                            <div className="doc-info">
                              <div className={`doc-icon ${meta.tone}`}>
                                <span
                                  className="material-symbols-outlined"
                                  style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                  {meta.icon}
                                </span>
                              </div>
                              <div>
                                <div className="doc-title">
                                  {demande.type_document_label || demande.type_document}
                                </div>
                                <div className="doc-subtitle">{meta.department}</div>
                                {showAttachments && (
                                  <div className="doc-attachments">
                                    {responseFiles.map((file, index) => (
                                      <a
                                        key={`${file.url}-${index}`}
                                        href={file.url.startsWith("http") ? file.url : `${FILE_BASE}${file.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="doc-attachment"
                                      >
                                        <span className="material-symbols-outlined">description</span>
                                        {file.name}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="doc-date">{formatDate(demande.date_demande)}</td>
                          <td>{renderMode(demande.mode_livraison)}</td>
                          <td className="text-center">{renderStatus(demande.statut)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="doc-history-pagination">
              <span>
                Affichage de {demandes.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}-
                {Math.min(currentPage * ITEMS_PER_PAGE, demandes.length)} sur {demandes.length} demandes
              </span>
              <div className="doc-pagination-controls">
                <button
                  className="doc-page-btn"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  type="button"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    className={`doc-page-btn ${page === currentPage ? "active" : ""}`}
                    onClick={() => setCurrentPage(page)}
                    type="button"
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="doc-page-btn"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  type="button"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="doc-history-cards">
          <div className="doc-assist-card">
            <div className="doc-assist-content">
              <h3>Besoin d'assistance ?</h3>
              <p>
                Si votre demande prend plus de 48h a etre traitee ou si vous avez
                une question specifique sur un document, contactez directement le support administratif.
              </p>
              <button className="doc-assist-link" type="button">
                Ouvrir un ticket de support
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
            <div className="doc-assist-image">
              <img
                alt="Architecture moderne universitaire"
                src="https://lh3.googleusercontent.com/aida/ADBb0uhIXZ4JdFAxZ7iN9mkI85sGoAdjRtlQk2YhdIa4YOrigcxXEWFbbDcGFiXLR3_yZLmemiYPfueKczqxA78dx_3HhQACaDTSYxedt7updz7d7djAbMerISa4WbX1inf3Sk1JTXznyJKHzUtMRUrDuGdfIAieiUe_OEu9MMTGvd4IbkfeGVxUXa9r-xYx1KmPLClURX9Jg5iDivtULOaQE71exmoFikmAuY8HujI-4-us2koe5IPyhDuq_TdIxY0kAelbgqu5o0Dy"
              />
            </div>
          </div>

          <div className="doc-security-card">
            <div>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified_user
              </span>
              <h3>Securite des donnees</h3>
              <p>
                Vos documents sont proteges par le protocole de chiffrement Honoris Securitas.
              </p>
            </div>
            <div className="doc-security-bar">
              <div className="doc-security-bar-fill"></div>
              <span>Systeme operationnel</span>
            </div>
          </div>
        </section>
      </main>

      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />
    </div>
  );
}
