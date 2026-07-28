import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "./components/navbar.jsx";
import { authFetch } from "../api/authFetch.js";
import "./frontcss/reclamation-detail.css";

const API_BASE = "http://127.0.0.1:8000/api/reclamations";

export default function ReclamationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoadingMessages(true);
    try {
      const response = await authFetch(`${API_BASE}/${id}/messages/`);
      const data = await response.json();
      if (data.success && data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Erreur fetch messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, [id]);

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        const response = await authFetch(`${API_BASE}/${id}/`);
        const data = await response.json();

        if (data.success) {
          setComplaint(data.reclamation);
          // Fetch messages
          fetchMessages();
        } else {
          console.error("Erreur récupération détail:", data.error);
          navigate('/mes-reclamations');
        }
      } catch (error) {
        console.error("Erreur fetch détail:", error);
        navigate('/mes-reclamations');
      } finally {
        setLoading(false);
      }
    };

    fetchComplaint();
  }, [id, navigate, fetchMessages]);

  const getStatusBadge = (status) => {
    const statusMap = {
      "OUVERTE": { text: "Ouverte", className: "status-ouverte" },
      "EN_COURS": { text: "En cours", className: "status-en-cours" },
      "RESOLUE": { text: "Résolue", className: "status-resolue" },
      "FERMEE": { text: "Fermée", className: "status-fermee" },
    };
    return statusMap[status] || { text: "Inconnu", className: "status-unknown" };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();

    if (!commentText.trim()) return;

    setSubmittingComment(true);

    try {
      const response = await authFetch(`${API_BASE}/${id}/ajouter-comment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contenu: commentText }),
      });

      const data = await response.json();

      if (data.success) {
        setCommentText("");
        // Refresh complaint to show new comment
        const complaintResponse = await authFetch(`${API_BASE}/${id}/`);
        const complaintData = await complaintResponse.json();
        if (complaintData.success) {
          setComplaint(complaintData.reclamation);
        }
      }
    } catch (error) {
      console.error("Erreur ajout commentaire:", error);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="rd-page">
        <Navbar />
        <main className="rd-main">
          <div className="rd-loading">Chargement...</div>
        </main>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="rd-page">
        <Navbar />
        <main className="rd-main">
          <div className="rd-error">Réclamation non trouvée</div>
        </main>
      </div>
    );
  }

  const statusInfo = getStatusBadge(complaint.statut || "OUVERTE");

  return (
    <div className="rd-page">
      <Navbar />
      <main className="rd-main">
        {/* Header Section */}
        <div className="rd-header">
          <div>
            <nav className="rd-breadcrumb">
              <a href="/">Accueil</a>
              <span>/</span>
              <a href="/mes-reclamations">Mes Réclamations</a>
              <span>/</span>
              <span>Détails de la réclamation</span>
            </nav>
            <h1 className="rd-title">{complaint.code}</h1>
            <div className="rd-meta">
              <span className={`rd-status-badge ${statusInfo.className}`}>
                {statusInfo.text}
              </span>
              <span className="rd-date">Soumis le {formatDate(complaint.date_creation)}</span>
            </div>
          </div>
          <div className="rd-actions">
            <button className="rd-btn rd-btn-secondary">
              <span className="material-symbols-outlined">close</span>
              Clôturer
            </button>
            <button className="rd-btn rd-btn-primary">
              <span className="material-symbols-outlined">chat</span>
              Ajouter un commentaire
            </button>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="rd-grid">
          {/* Left Column */}
          <div className="rd-left">
            {/* General Info Card */}
            <section className="rd-card">
              <h2 className="rd-section-title">Informations Générales</h2>
              <div className="rd-info-grid">
                <div className="rd-info-item">
                  <p className="rd-label">Type de réclamation</p>
                  <p className="rd-value">{complaint.type_reclamation}</p>
                </div>
                <div className="rd-info-item">
                  <p className="rd-label">Niveau de priorité</p>
                  <p className="rd-value">{complaint.priorite}</p>
                </div>
                <div className="rd-info-item">
                  <p className="rd-label">Service assigné</p>
                  <p className="rd-value">{complaint.service_assign || "Non assigné"}</p>
                </div>
              </div>

              <div className="rd-content-section">
                <div>
                  <h3 className="rd-content-title">{complaint.objet}</h3>
                </div>
                <div>
                  <p className="rd-label">Description détaillée</p>
                  <div className="rd-description">
                    {complaint.description.split('\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Attachments Section */}
            {complaint.piece_jointe && (
              <section className="rd-card">
                <h2 className="rd-section-title">
                  <span className="material-symbols-outlined">attach_file</span>
                  Pièces Jointes
                </h2>
                <div className="rd-attachments">
                  <div className="rd-attachment-item">
                    <div className="rd-attachment-info">
                      <span className="material-symbols-outlined">picture_as_pdf</span>
                      <div>
                        <p className="rd-attachment-name">{complaint.piece_jointe.split('/').pop()}</p>
                        <p className="rd-attachment-size">Document joint</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined rd-download-icon">download</span>
                  </div>
                </div>
              </section>
            )}

            {/* Comments Section */}
            <section className="rd-card">
              <h2 className="rd-section-title">Commentaires du support</h2>
              
              <div className="rd-comments-list">
                <div className="rd-comment rd-comment-user">
                  <div className="rd-comment-avatar rd-avatar-user">
                    ME
                  </div>
                  <div className="rd-comment-content">
                    <div className="rd-comment-header">
                      <span className="rd-comment-author">Vous</span>
                      <span className="rd-comment-time">{formatDate(complaint.date_creation)}</span>
                    </div>
                    <div className="rd-comment-bubble rd-bubble-user">
                      {complaint.description}
                    </div>
                  </div>
                </div>

                {/* Messages from messaging service */}
                {loadingMessages ? (
                  <p style={{ textAlign: 'center', color: '#999' }}>Chargement des messages...</p>
                ) : messages.length > 0 ? (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`rd-comment ${msg.message_type === 'RH' ? 'rd-comment-rh' : 'rd-comment-user'}`}>
                      <div className={`rd-comment-avatar ${msg.message_type === 'RH' ? 'rd-avatar-rh' : 'rd-avatar-user'}`}>
                        {msg.message_type === 'RH' ? 'RH' : 'ME'}
                      </div>
                      <div className="rd-comment-content">
                        <div className="rd-comment-header">
                          <span className="rd-comment-author">
                            {msg.message_type === 'RH' ? 'Gestionnaire RH' : 'Moi'}
                          </span>
                          <span className="rd-comment-time">
                            {formatDate(msg.date_creation)}
                          </span>
                        </div>
                        <div className={`rd-comment-bubble ${msg.message_type === 'RH' ? 'rd-bubble-rh' : 'rd-bubble-user'}`}>
                          <p>{msg.contenu}</p>
                          
                          {/* File attachment */}
                          {msg.fichier && (
                            <div className="rd-message-file-attachment">
                              <span className="material-symbols-outlined">attach_file</span>
                              <div className="rd-file-details">
                                <a href={msg.fichier} download={msg.nom_fichier || 'fichier'}>
                                  {msg.nom_fichier || 'Télécharger'}
                                </a>
                              </div>
                            </div>
                          )}
                          
                          {/* Urgent flag */}
                          {msg.marque_urgent && (
                            <div className="rd-message-urgent-badge">
                              <span className="material-symbols-outlined">priority_high</span>
                              Marqué comme urgent
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : null}

                {/* Legacy RH response (for compatibility) */}
                {complaint.reponse_rh && messages.length === 0 && (
                  <div className="rd-comment rd-comment-rh">
                    <div className="rd-comment-avatar rd-avatar-rh">
                      RH
                    </div>
                    <div className="rd-comment-content">
                      <div className="rd-comment-header">
                        <span className="rd-comment-author">Gestionnaire RH</span>
                        <span className="rd-comment-time">
                          {complaint.date_resolution ? formatDate(complaint.date_resolution) : 'Réponse reçue'}
                        </span>
                      </div>
                      <div className="rd-comment-bubble rd-bubble-rh">
                        {complaint.reponse_rh}
                      </div>
                    </div>
                  </div>
                )}

                {!complaint.reponse_rh && messages.length === 0 && (
                  <p className="rd-no-comments">Aucun commentaire pour le moment</p>
                )}
              </div>

              {/* Comment Input - Only visible if RH has replied */}
              {(complaint.reponse_rh || messages.some(m => m.message_type === 'RH')) ? (
                <form className="rd-comment-form" onSubmit={handleAddComment}>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Écrivez votre message ici..."
                    className="rd-comment-input"
                    rows="4"
                  ></textarea>
                  <div className="rd-form-actions">
                    <button type="button" className="rd-attach-btn">
                      <span className="material-symbols-outlined">attach_file</span>
                    </button>
                    <button
                      type="submit"
                      className="rd-submit-btn"
                      disabled={submittingComment || !commentText.trim()}
                    >
                      {submittingComment ? "Envoi..." : "Envoyer"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="rd-comment-waiting" style={{
                  padding: '1.5rem', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '0.5rem',
                  textAlign: 'center',
                  color: '#5a403e',
                  borderTop: '1px solid #edeeef',
                  marginTop: '1rem',
                  fontSize: '0.875rem'
                }}>
                  <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>info</span>
                  Vous pourrez répondre une fois que le gestionnaire RH aura traité votre réclamation.
                </div>
              )}
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="rd-sidebar">
            {/* Timeline Section */}
            <section className="rd-card rd-timeline-section">
              <h2 className="rd-section-title">Historique</h2>
              <div className="rd-timeline">
                <div className="rd-timeline-item rd-completed">
                  <div className="rd-timeline-dot">
                    <span className="material-symbols-outlined">check</span>
                  </div>
                  <div className="rd-timeline-content">
                    <h3 className="rd-timeline-title">Demande reçue</h3>
                    <p className="rd-timeline-date">{formatDate(complaint.date_creation)}</p>
                  </div>
                </div>

                <div className={`rd-timeline-item ${complaint.statut && (complaint.statut === 'EN_COURS' || complaint.statut === 'RESOLUE' || complaint.statut === 'FERMEE') ? 'rd-completed' : 'rd-pending'}`}>
                  <div className="rd-timeline-dot">
                    <span className="material-symbols-outlined">sync</span>
                  </div>
                  <div className="rd-timeline-content">
                    <h3 className="rd-timeline-title">En cours de traitement</h3>
                    <p className="rd-timeline-date">Par le service RH</p>
                  </div>
                </div>

                <div className={`rd-timeline-item ${complaint.statut === 'RESOLUE' || complaint.statut === 'FERMEE' ? 'rd-completed' : 'rd-pending'}`}>
                  <div className="rd-timeline-dot">
                    <span className="material-symbols-outlined">pending</span>
                  </div>
                  <div className="rd-timeline-content">
                    <h3 className="rd-timeline-title">En attente de documents</h3>
                    <p className="rd-timeline-date">Prévu</p>
                  </div>
                </div>

                <div className={`rd-timeline-item ${complaint.statut === 'RESOLUE' || complaint.statut === 'FERMEE' ? 'rd-completed' : 'rd-pending'}`}>
                  <div className="rd-timeline-dot">
                    <span className="material-symbols-outlined">flag</span>
                  </div>
                  <div className="rd-timeline-content">
                    <h3 className="rd-timeline-title">Résolution finale</h3>
                    <p className="rd-timeline-date">Prévu</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Support Help Card */}
            <div className="rd-support">
              <div className="rd-support-content">
                <h3 className="rd-support-title">Besoin d&apos;aide ?</h3>
                <p className="rd-support-text">Notre équipe support RH est disponible pour répondre à vos questions urgentes par téléphone.</p>
                <a href="tel:+212522000000" className="rd-support-link">
                  <span className="material-symbols-outlined">call</span>
                  Contacter le support
                </a>
              </div>
              <div className="rd-support-icon">
                <span className="material-symbols-outlined">contact_support</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="rd-footer">
        <div className="rd-footer-inner">
          <div className="rd-footer-brand">Honoris United Universities</div>
          <nav className="rd-footer-links">
            <a href="#">Politique de Confidentialité</a>
            <a href="#">Conditions d&apos;Utilisation</a>
            <a href="#">Contact RH</a>
          </nav>
          <p className="rd-footer-copy">© 2024 Honoris United Universities. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
