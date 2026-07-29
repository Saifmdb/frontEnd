import { useState, useRef, useEffect, useMemo } from "react";
import { Upload, FileText, UserCircle2, Download } from "lucide-react";
import Navbar from "./components/navbar";
import { Link } from "react-router-dom";
import { authFetch } from "../api/authFetch.js";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function GestionDocumentsRH() {
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState([]);
  // eslint-disable-next-line no-unused-vars -- populated from API response, not wired to UI yet
  const [statsCategories, setStatsCategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const [uploadForm, setUploadForm] = useState({
    nom: "",
    categorie: "",
    description: "",
  });

  // Charger les catégories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await authFetch(`${API_URL}/documents-rh/categories/`);
        const data = await res.json();
        if (data.success) setCategories(data.categories);
      } catch (err) {
        console.error("Erreur chargement catégories:", err);
      }
    };
    fetchCategories();
  }, []);

  // Charger les statistiques + documents
  const fetchData = async () => {
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
          console.error("Erreur parsing user pour role RH:", e);
        }
      }

      const query = [rhAllParam].filter(Boolean).join("&");
      const url = query ? `${API_URL}/documents-rh/?${query}` : `${API_URL}/documents-rh/`;
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents || []);
        setStatsCategories(data.stats_categories || []);
      }
    } catch (err) {
      console.error("Erreur chargement documents:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uploadHistory = useMemo(() => {
    return [...documents].sort((a, b) => {
      const da = new Date(a.date_upload || 0).getTime();
      const db = new Date(b.date_upload || 0).getTime();
      return db - da;
    });
  }, [documents]);

  const filteredHistory = useMemo(() => {
    return uploadHistory.filter((doc) => {
      const matchCategory =
        !filterCategory || doc.categorie?.code === filterCategory;
      const search = filterSearch.trim().toLowerCase();
      const matchSearch =
        !search ||
        doc.nom?.toLowerCase().includes(search) ||
        doc.description?.toLowerCase().includes(search) ||
        doc.categorie?.label?.toLowerCase().includes(search);
      return matchCategory && matchSearch;
    });
  }, [uploadHistory, filterCategory, filterSearch]);

  const formatUploadDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewDocument = (doc) => {
    if (!doc?.id) return;
    window.open(`${API_URL}/documents-rh/${doc.id}/telecharger/`, "_blank");
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !uploadForm.categorie) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("fichier", selectedFile);
      formData.append("categorie", uploadForm.categorie);
      formData.append("description", uploadForm.description || "");
      formData.append("nom", uploadForm.nom || selectedFile.name);

      const res = await authFetch(`${API_URL}/documents-rh/upload/`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setUploadForm({ nom: "", categorie: "", description: "" });
        setSelectedFile(null);
        fileInputRef.current.value = "";
        fetchData();
        alert("Document uploadé avec succès!");
      } else {
        alert(data.error || "Erreur lors de l'upload");
      }
    } catch (err) {
      console.error("Erreur upload document:", err);
      alert("Erreur réseau lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-background font-body text-on-surface flex flex-col min-h-screen">
      <Navbar />

      <main className="pt-24 pb-16 flex-grow container mx-auto px-8 max-w-7xl">
        {/* Breadcrumb */}
        <nav className="mb-10 flex items-center gap-2 text-xs font-label uppercase tracking-widest text-on-surface-variant">
          <Link
            to="/welcome"
            className="text-primary hover:text-primary cursor-pointer transition-colors"
          >
            Accueil
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-primary font-bold">Upload</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Side: Editorial Context */}
          <div className="lg:col-span-4 space-y-6">
            <h1 className="font-headline font-extrabold text-5xl leading-tight text-on-surface tracking-tighter">
              Portail de <span className="text-primary">Dépôt RH</span>
            </h1>
            <p className="text-lg text-on-surface-variant leading-relaxed font-body">
              Transmettez vos documents administratifs de manière sécurisée. Notre service de curateur académique assure la confidentialité et le traitement prioritaire de vos pièces.
            </p>
            <div className="p-6 bg-surface-container rounded-xl space-y-4">
              <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-secondary flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                Sécurité Garantie
              </h3>
              <p className="text-sm text-on-surface-variant italic">
                &quot;Toutes les données sont cryptées conformément aux protocoles RGPD en vigueur au sein du réseau Honoris.&quot;
              </p>
            </div>
          </div>

          {/* Right Side: Upload Form Section */}
          <div className="lg:col-span-8">
            <div className="bg-surface-container-lowest p-10 rounded-xl shadow-[0_12px_32px_rgba(25,28,29,0.04)] border-b-4 border-primary">
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Category Selection */}
                <div className="space-y-2">
                  <label className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant">
                    Catégorie du document
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-surface-container border-none rounded-lg py-4 px-4 text-on-surface font-body appearance-none focus:ring-2 focus:ring-primary/20 transition-all"
                      value={uploadForm.categorie}
                      onChange={(e) => setUploadForm({ ...uploadForm, categorie: e.target.value })}
                    >
                      <option value="">Sélectionnez une catégorie</option>
                      {categories.map((cat) => (
                        <option key={cat.code} value={cat.code}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Reference Field */}
                <div className="space-y-2">
                  <label className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant">
                    Référence (Optionnel)
                  </label>
                  <input
                    className="w-full bg-surface-container border-none rounded-lg py-4 px-4 text-on-surface font-body focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Ex: MOIS_JANVIER_2024"
                    type="text"
                    value={uploadForm.nom}
                    onChange={(e) => setUploadForm({ ...uploadForm, nom: e.target.value })}
                  />
                </div>
              </div>

              {/* Description Field */}
              <div className="mb-6 space-y-2">
                <label className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant">
                  Description
                </label>
                <textarea
                  className="w-full bg-surface-container border-none rounded-lg py-4 px-4 text-on-surface font-body focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  placeholder="Décrivez le contenu et l'objectif de ce document..."
                  rows={3}
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                />
              </div>

              {/* Drag & Drop Area */}
              <div
                className="group relative border-2 border-dashed border-outline-variant rounded-xl p-16 flex flex-col items-center justify-center text-center hover:border-primary hover:bg-primary/[0.02] transition-all cursor-pointer mb-8"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Upload className="text-primary" size={40} />
                </div>
                <h4 className="font-headline font-bold text-xl mb-2">Glissez-déposez vos fichiers ici</h4>
                <p className="text-on-surface-variant font-body mb-6">
                  ou <span className="text-primary font-bold underline cursor-pointer">parcourez vos dossiers</span>
                </p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-label">
                  PDF, JPG, PNG (Max 10MB)
                </p>
                {selectedFile ? (
                  <p className="mt-4 text-xs text-on-surface-variant">
                    Fichier choisi: <span className="font-semibold text-on-surface">{selectedFile.name}</span>
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end">
                <button
                  className="bg-primary text-white font-headline font-bold px-12 py-4 rounded-lg flex items-center gap-3 hover:bg-primary-container transition-colors shadow-lg shadow-primary/10 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handleUploadSubmit}
                  disabled={!uploadForm.categorie || !selectedFile || uploading}
                >
                  <span>{uploading ? "Upload en cours..." : "Upload"}</span>
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </div>
          </div>
        </div>

        {/* History Table Section */}
        <section className="mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="font-headline font-extrabold text-3xl tracking-tight">Historique des Uploads</h2>
              <p className="text-on-surface-variant mt-2">Suivez le statut de vos documents soumis récemment.</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="bg-surface-container rounded-lg px-4 py-2 flex items-center gap-2 hover:bg-surface-container-high cursor-pointer transition-colors"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                title="Filtrer l'historique"
              >
                <span className="material-symbols-outlined text-sm">filter_list</span>
                <span className="text-xs font-bold uppercase tracking-tighter">Filtrer</span>
              </button>
            </div>
          </div>

          {isFilterOpen && (
            <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center bg-surface-container rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  Catégorie
                </span>
                <select
                  className="bg-surface-container-lowest border border-outline-variant/40 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">Toutes</option>
                  {categories.map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 flex items-center gap-2 w-full">
                <input
                  type="text"
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Rechercher par nom, description, catégorie..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                />
                {(filterCategory || filterSearch) && (
                  <button
                    type="button"
                    className="text-xs font-headline font-bold text-primary hover:underline"
                    onClick={() => {
                      setFilterCategory("");
                      setFilterSearch("");
                    }}
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-4">
              <thead>
                <tr className="text-xs font-headline font-extrabold uppercase tracking-widest text-on-surface-variant">
                  <th className="px-6 py-4">Nom du Document</th>
                  <th className="px-6 py-4">Catégorie</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Uploadé par</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="font-body text-sm">
                {filteredHistory.length === 0 ? (
                  <tr className="bg-surface-container-lowest">
                    <td className="px-6 py-6 rounded-xl text-center text-on-surface-variant" colSpan={5}>
                      Aucun upload trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((doc) => (
                    <tr
                      key={doc.id}
                      className="bg-surface-container-lowest hover:bg-white transition-colors"
                    >
                      <td className="px-6 py-6 rounded-l-xl font-semibold flex items-center gap-3">
                        <span className="text-primary">
                          <FileText size={18} />
                        </span>
                        <div>
                          <div>{doc.nom}</div>
                          {doc.description ? (
                            <div className="text-xs text-on-surface-variant mt-1">{doc.description}</div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-on-surface-variant">
                        {doc.categorie?.label || "Sans catégorie"}
                      </td>
                      <td className="px-6 py-6 text-on-surface-variant">
                        {formatUploadDateTime(doc.date_upload)}
                      </td>
                      <td className="px-6 py-6">
                        <span className="flex items-center gap-2 text-on-surface-variant">
                          <UserCircle2 size={16} />
                          {doc.uploade_par?.full_name || doc.uploade_par?.username || "Inconnu"}
                        </span>
                      </td>
                      <td className="px-6 py-6 rounded-r-xl text-right">
                        <button
                          className="bg-primary text-white text-xs font-headline font-bold px-5 py-2 rounded-full inline-flex items-center justify-end gap-1 shadow-md shadow-primary/20 hover:bg-primary-container transition-colors"
                          onClick={() => handleViewDocument(doc)}
                        >
                          Télécharger
                          <Download size={16} className="text-white" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="bg-surface-container w-full mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 py-12 w-full gap-4 max-w-full mx-auto">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-headline font-bold text-primary text-lg">Honoris United Universities</span>
            <p className="font-body text-xs text-on-surface">
              © 2024 Honoris United Universities. Education for Impact.
            </p>
          </div>
          <div className="flex gap-8 font-body text-xs">
            <a className="text-slate-600 hover:text-primary transition-colors" href="#">
              Privacy Policy
            </a>
            <a className="text-slate-600 hover:text-primary transition-colors" href="#">
              Terms of Service
            </a>
            <a className="text-slate-600 hover:text-primary transition-colors" href="#">
              Contact RH
            </a>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-primary hover:text-white transition-all cursor-pointer">
              <span className="material-symbols-outlined text-sm">language</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-primary hover:text-white transition-all cursor-pointer">
              <span className="material-symbols-outlined text-sm">share</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
