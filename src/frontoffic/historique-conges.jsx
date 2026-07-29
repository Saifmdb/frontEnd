import { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Navbar from "./components/navbar";
import { authFetch } from "../api/authFetch.js";
import "./frontcss/historique-conges-unique.css";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function HistoriqueConges() {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtres
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    searchEmployee: "",
    dateFrom: "",
    dateTo: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Chargement des données
  useEffect(() => {
    const fetchHistorique = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await authFetch(`${API_URL}/conges/historique-rh/`);

        if (!response.ok) {
          if (response.status === 401) throw new Error("Utilisateur non authentifié");
          if (response.status === 403) throw new Error("Accès non autorisé - vous devez être RH.");
          throw new Error(`Erreur ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) throw new Error(data.error || "Erreur de chargement");

        // Transformation des données pour le tableau
        const transformed = data.demandes.map(d => ({
          id: d.id,
          employeeName: d.demandeur.full_name || d.demandeur.username,
          employeeId: d.demandeur.username,
          departement: d.demandeur.departement || "Non spécifié",
          startDate: d.date_debut,
          endDate: d.date_fin,
          type: d.type_conge || "Non spécifié",
          motif: d.motif || "",
          status: d.statut,
          statusDisplay: d.statut_display || d.statut,
          createdDate: d.date_creation?.split('T')[0] || "",
          approvedBy: d.manager_approbateur?.full_name || null,
          approvedDate: d.date_reponse?.split('T')[0] || null,
          comment: d.commentaire_manager || "",
          nombreJours: d.nombre_jours,
        }));
        setDemandes(transformed);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistorique();
  }, []);

  const filteredDemandes = useMemo(() => {
    return demandes.filter(d => {
      if (filters.status && d.status !== filters.status) return false;
      if (filters.type && d.type !== filters.type) return false;
      if (filters.searchEmployee && !d.employeeName.toLowerCase().includes(filters.searchEmployee.toLowerCase())) return false;
      if (filters.dateFrom && new Date(d.startDate) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(d.endDate) > new Date(filters.dateTo)) return false;
      return true;
    });
  }, [filters, demandes]);


  // eslint-disable-next-line no-unused-vars -- not wired to a "clear filters" button yet
  const clearFilters = () => setFilters({ status: "", type: "", searchEmployee: "", dateFrom: "", dateTo: "" });

  // Pagination
  const totalPages = Math.ceil(filteredDemandes.length / itemsPerPage);
  const paginatedDemandes = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredDemandes.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredDemandes, currentPage]);

  const getInitials = (fullName) => {
    return fullName
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarClass = (initials) => {
    const initial = initials.charAt(0).toUpperCase();
    const mapping = { 'A': 'am', 'S': 'sb', 'Y': 'yk', 'L': 'ld' };
    return mapping[initial] || 'am';
  };

  const handleExport = () => {
    const headers = ["ID", "Employé", "Département", "Type", "Date Début", "Date Fin", "Statut", "Créé", "Approuvé par", "Motif"];
    const rows = filteredDemandes.map(d => [
      d.id, d.employeeName, d.departement, d.type, d.startDate, d.endDate,
      d.statusDisplay, d.createdDate, d.approvedBy || "-", d.motif
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historique-conges-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Historique des Demandes de Congé', 14, 18);
    doc.setFontSize(10);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 25);
    doc.text(`Total: ${filteredDemandes.length} demandes`, 14, 30);

    const headers = [['Employé', 'Département', 'Type', 'Date Début', 'Date Fin', 'Jours', 'Statut', 'Créé', 'Approuvé par', 'Motif']];
    const rows = filteredDemandes.map(d => [
      d.employeeName, d.departement, d.type, d.startDate, d.endDate,
      calculateDays(d.startDate, d.endDate), d.statusDisplay, d.createdDate,
      d.approvedBy || '-', d.motif || '-'
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 30 },
        9: { cellWidth: 40 },
      },
    });

    doc.save(`historique-conges-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getStatusBadgeClass = (status) => {
    if (status === "APPROUVE") return "hc-status-approved";
    if (status === "REFUSE") return "hc-status-refused";
    return "hc-status-pending";
  };

  const calculateDays = (start, end) => Math.ceil((new Date(end) - new Date(start)) / (1000*60*60*24)) + 1;

  if (loading) {
    return (
      <div className="hc-page-wrapper">
        <Navbar />
        <div className="hc-content" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="hc-spinner"></div>
          <p>Chargement de l&apos;historique...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hc-page-wrapper">
        <Navbar />
        <div className="hc-error-state">
          <h2>Erreur</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} style={{marginTop: '1rem', padding: '0.75rem 1.5rem', backgroundColor: '#7e0008', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer'}}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hc-page-wrapper">
      <Navbar />
      <main className="hc-content">
        {/* Breadcrumb */}
        <nav className="hc-breadcrumb">
          <ol>
            <li><a href="/welcome">Accueil</a></li>
            <li className="hc-current">
              <span className="material-symbols-outlined">chevron_right</span>
              <span>Historique conge</span>
            </li>
          </ol>
        </nav>

        {/* Header Section */}
        <div className="hc-header-section">
          <div className="hc-header-content">
            <h1 className="hc-header-title">Historique des Demandes de Congé</h1>
            <p className="hc-header-description">Consultez et gérez l&apos;ensemble des demandes de congés déposées par vos collaborateurs au sein du réseau Honoris.</p>
          </div>
          <div className="hc-header-actions">
            <button className="hc-btn-action" onClick={handleExport}>
              <span className="material-symbols-outlined">filter_list</span>
              Filtrer
            </button>
            <button className="hc-btn-action" onClick={handleExportPDF}>
              <span className="material-symbols-outlined">download</span>
              Exporter
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="hc-table-container">
          <div className="hc-table-wrapper">
            <table className="hc-table">
              <thead>
                <tr>
                  <th>Employé</th>
                  <th>Type de congé</th>
                  <th>Période</th>
                  <th style={{textAlign: 'center'}}>Jours</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDemandes.length ? paginatedDemandes.map(d => {
                  const initials = getInitials(d.employeeName);
                  const avatarClass = getAvatarClass(initials);
                  return (
                    <tr key={d.id}>
                      <td>
                        <div className="hc-employee-cell">
                          <div className={`hc-avatar hc-avatar-${avatarClass}`}>{initials}</div>
                          <div className="hc-employee-info">
                            <h3>{d.employeeName}</h3>
                            <p>{d.departement}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="hc-type-badge">{d.type}</span>
                      </td>
                      <td>
                        <div className="hc-period-main">{d.startDate.substring(0, 10)} - {d.endDate.substring(0, 10)}</div>
                        <div className="hc-period-sub">Soumis le {d.createdDate}</div>
                      </td>
                      <td>
                        <div className="hc-days-cell">{calculateDays(d.startDate, d.endDate)}</div>
                      </td>
                      <td>
                        <span className={`hc-status ${getStatusBadgeClass(d.status)}`}>
                          {d.statusDisplay}
                        </span>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="5" className="hc-empty-state">
                      <p>Aucune demande trouvée</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="hc-pagination-section">
            <div className="hc-pagination-info">Affichage de {currentPage > 0 ? (currentPage - 1) * itemsPerPage + 1 : 1}-{Math.min(currentPage * itemsPerPage, filteredDemandes.length)} sur {filteredDemandes.length} entrées</div>
            <div className="hc-pagination-buttons">
              <button
                className="hc-pagination-btn"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              {Array.from({length: totalPages}, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`hc-pagination-btn ${currentPage === page ? 'hc-pagination-btn-active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="hc-pagination-btn"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}