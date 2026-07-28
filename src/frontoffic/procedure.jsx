import { useEffect, useMemo, useState } from "react";
import { FolderOpen, FileText, Trash2, Download, CalendarDays, UserCircle2, ChevronDown } from "lucide-react";
import Navbar from "./components/navbar";
import { authFetch } from "../api/authFetch.js";
import "./frontcss/procedure.css";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function Procedure() {
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [openFolders, setOpenFolders] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      let rhAllParam = "";

      // Pour les utilisateurs RH, on ajoute un flag "all"
      // pour demander l'historique global si le backend le supporte.
      const userData = localStorage.getItem("user");
      if (userData) {
        try {
          const user = JSON.parse(userData);
          const dept = (user.depatement || user.profile?.depatement || "").toUpperCase();
          if (user.role === "RH" || dept === "RH") {
            rhAllParam = "all=true";
          }
        } catch (e) {
          console.error("Erreur parsing user pour role RH (Procedure):", e);
        }
      }

      const query = [rhAllParam].filter(Boolean).join("&");
      const docsUrl = query ? `${API_URL}/documents-rh/?${query}` : `${API_URL}/documents-rh/`;

      const [categoriesRes, docsRes] = await Promise.all([
        authFetch(`${API_URL}/documents-rh/categories/`),
        authFetch(docsUrl),
      ]);

      const categoriesData = await categoriesRes.json();
      const docsData = await docsRes.json();

      if (categoriesData.success) {
        setCategories(categoriesData.categories || []);
      }

      if (docsData.success) {
        setDocuments(docsData.documents || []);
      }
    } catch (error) {
      console.error("Erreur chargement Procedure:", error);
      alert("Impossible de charger les documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const groupedByCategory = useMemo(() => {
    const groups = new Map();

    categories.forEach((cat) => {
      groups.set(cat.code, {
        code: cat.code,
        label: cat.label,
        documents: [],
      });
    });

    documents.forEach((doc) => {
      const code = doc.categorie?.code || "SANS_CATEGORIE";

      if (!groups.has(code)) {
        groups.set(code, {
          code,
          label: doc.categorie?.label || "Sans catégorie",
          documents: [],
        });
      }

      groups.get(code).documents.push(doc);
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.documents.length === 0 && b.documents.length > 0) return 1;
      if (a.documents.length > 0 && b.documents.length === 0) return -1;
      return a.label.localeCompare(b.label, "fr", { sensitivity: "base" });
    });
  }, [categories, documents]);

  useEffect(() => {
    setOpenFolders((prev) => {
      const next = {};
      groupedByCategory.forEach((group) => {
        // Dossiers fermes par defaut; conserve l'etat s'il existe deja.
        next[group.code] = prev[group.code] ?? false;
      });
      return next;
    });
  }, [groupedByCategory]);

  const toggleFolder = (code) => {
    setOpenFolders((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await authFetch(`${API_URL}/documents-rh/${id}/supprimer/`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      } else {
        alert(data.error || "Erreur lors de la suppression.");
      }
    } catch (error) {
      console.error("Erreur suppression document:", error);
      alert("Erreur réseau lors de la suppression.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (doc) => {
    window.open(`${API_URL}/documents-rh/${doc.id}/telecharger/`, "_blank");
  };

  return (
    <div className="procedure-container">
      <Navbar />

      <div className="procedure-content">
     

        {loading ? (
          <div className="procedure-loading">Chargement des dossiers...</div>
        ) : (
          <div className="folders-grid">
            {groupedByCategory.map((group) => (
              <section className="folder-card" key={group.code}>
                <header className="folder-header">
                  <div className="folder-title-wrap">
                    <FolderOpen size={22} />
                    <div>
                      <h2>{group.label}</h2>
                      <p>{group.documents.length} document{group.documents.length > 1 ? "s" : ""}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`folder-toggle ${openFolders[group.code] ? "open" : ""}`}
                    onClick={() => toggleFolder(group.code)}
                    aria-label={openFolders[group.code] ? "Masquer le dossier" : "Afficher le dossier"}
                    title={openFolders[group.code] ? "Masquer" : "Afficher"}
                  >
                    <ChevronDown size={20} className="toggle-chevron" />
                  </button>
                </header>

                {openFolders[group.code] ? (
                  <div className="folder-body">
                    {group.documents.length === 0 ? (
                      <div className="folder-empty">Aucun document dans ce dossier.</div>
                    ) : (
                      group.documents.map((doc) => (
                        <article className="doc-row" key={doc.id}>
                          <div className="doc-main">
                            <div className="doc-icon">
                              <FileText size={18} />
                            </div>

                            <div className="doc-info">
                              <h3>{doc.nom}</h3>
                              {doc.description ? <p>{doc.description}</p> : null}

                              <div className="doc-meta">
                                <span>
                                  <CalendarDays size={14} />
                                  {doc.date_upload?.split("T")[0] || "-"}
                                </span>
                                <span>
                                  <UserCircle2 size={14} />
                                  {doc.uploade_par?.full_name || doc.uploade_par?.username || "Inconnu"}
                                </span>
                                <span>{doc.taille || "-"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="doc-actions">
                            <button
                              type="button"
                              className="doc-btn download"
                              onClick={() => handleDownload(doc)}
                              title="Télécharger"
                            >
                              <Download size={16} />
                              <span>Télécharger</span>
                            </button>
                            <button
                              type="button"
                              className="doc-btn delete"
                              onClick={() => handleDelete(doc.id)}
                              title="Supprimer"
                              disabled={deletingId === doc.id}
                            >
                              <Trash2 size={16} />
                              <span>Supprimer</span>
                            </button>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
