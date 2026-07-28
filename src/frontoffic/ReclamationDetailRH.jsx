import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "./components/navbar.jsx";
import { authFetch } from "../api/authFetch.js";
import "./frontcss/reclamation-detail-rh.css";

const API_BASE = "http://127.0.0.1:8000/api/reclamations";

export default function ReclamationDetailRH() {
  const { id } = useParams();
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reponse, setReponse] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [markAsUrgent, setMarkAsUrgent] = useState(false);
  const [notifySupervisor, setNotifySupervisor] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);

  // Charger les détails de la réclamation
  useEffect(() => {
    const fetchComplaintDetails = async () => {
      setLoading(true);

      try {
        const response = await authFetch(`${API_BASE}/${id}/`);

        if (response.status === 401) {
          navigate('/signin', { replace: true });
          return;
        }
        
        if (response.status === 403) {
          navigate('/welcome', { replace: true });
          return;
        }

        const data = await response.json();

        if (data.success) {
          setComplaint({
            id: data.reclamation.id,
            reference: `#REC-${String(data.reclamation.id).padStart(5, '0')}`,
            date: new Date(data.reclamation.date_creation).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }),
            priority: data.reclamation.priorite,
            subject: data.reclamation.objet,
            description: data.reclamation.description,
            employee_name: data.reclamation.demandeur?.full_name || data.reclamation.demandeur?.username || 'Inconnu',
            employee_avatar: data.reclamation.demandeur?.profile_picture || null,
            type: data.reclamation.type_reclamation,
            status: data.reclamation.statut,
            attachment: data.reclamation.piece_jointe,
            attachment_name: data.reclamation.piece_jointe_nom,
            submitted_at: new Date(data.reclamation.date_creation).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            existing_response: data.reclamation.reponse_rh,
            response_date: data.reclamation.date_resolution ? 
              new Date(data.reclamation.date_resolution).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
              }) : null
          });
        } else {
          setMessage({ type: "error", text: data.error || "Erreur lors du chargement" });
        }
      } catch (error) {
        console.error("Erreur API:", error);
        setMessage({ type: "error", text: "Erreur de connexion au serveur" });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchComplaintDetails();
    }
  }, [id, navigate]);

  // Soumettre la réponse
  const handleSubmitResponse = async () => {
    if (!reponse.trim()) {
      setMessage({ type: "error", text: "Veuillez entrer une réponse" });
      return;
    }

    setSubmitLoading(true);

    try {
      // Créer FormData pour supporter l'upload de fichiers
      const formData = new FormData();
      formData.append('reponse', reponse);
      formData.append('marquer_urgent', markAsUrgent);
      formData.append('notifier_superviseur', notifySupervisor);
      formData.append('resoudre', 'true');

      // Ajouter le fichier s'il y a one
      if (attachedFiles.length > 0) {
        formData.append('fichier', attachedFiles[0]); // Prendre le premier fichier
      }

      const response = await authFetch(
        `${API_BASE}/rh/${id}/repondre-fichier/`,
        {
          method: 'POST',
          body: formData
          // Note: Ne pas définir Content-Type, le navigateur le fera automatiquement
        }
      );
      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Réponse envoyée avec succès" });
        setReponse("");
        setAttachedFiles([]);
        setTimeout(() => {
          navigate('/reclamation-responsable');
        }, 2000);
      } else {
        setMessage({ type: "error", text: data.error || "Erreur lors de l'envoi" });
      }
    } catch (error) {
      console.error("Erreur:", error);
      setMessage({ type: "error", text: "Erreur lors de l'envoi de la réponse" });
    } finally {
      setSubmitLoading(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    }
  };

  // Enregistrer comme brouillon
  const handleSaveDraft = () => {
    localStorage.setItem(`draft_${id}`, reponse);
    setMessage({ type: "success", text: "Brouillon sauvegardé" });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  // Format text functions
  const formatText = (before, after = '') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = reponse.substring(start, end) || 'texte';
    const newText = reponse.substring(0, start) + before + selectedText + after + reponse.substring(end);
    setReponse(newText);
    
    setTimeout(() => {
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selectedText.length;
      textarea.focus();
    }, 0);
  };

  const handleBold = () => formatText('**', '**');
  const handleItalic = () => formatText('_', '_');
  const handleList = () => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const before = reponse.substring(0, start);
    const after = reponse.substring(start);
    const newText = before + '\n• ';
    setReponse(newText + after);
    setTimeout(() => {
      textarea.selectionStart = newText.length;
      textarea.focus();
    }, 0);
  };

  const handleLink = () => {
    const url = prompt('Entrez l\'URL:');
    if (url) formatText('[', `](${url})`);
  };

  // Handle file attachment
  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files);
    setAttachedFiles([...attachedFiles, ...files]);
  };

  const removeAttachedFile = (index) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="rh-detail-page">
        <Navbar />
        <div className="rh-detail-loading">
          <div className="rh-spinner"></div>
          <p>Chargement de la réclamation...</p>
        </div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="rh-detail-page">
        <Navbar />
        <div className="rh-detail-error">
          <span className="material-symbols-outlined">error</span>
          <p>Réclamation non trouvée</p>
          <button className="rh-detail-btn-back" onClick={() => navigate('/reclamation-responsable')}>
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rh-detail-page">
      <Navbar />

      {/* Breadcrumb */}
      <div className="rh-detail-breadcrumb">
        <button onClick={() => navigate('/')}>Accueil</button>
        <span>/</span>
        <button onClick={() => navigate('/reclamation-responsable')}>Réclamations</button>
        <span>/</span>
        <span>Répondre</span>
      </div>

      <main className="rh-detail-main">
        <section className="rh-detail-section">
          {/* Alert Message */}
          {message.text && (
            <div className={`rh-detail-alert rh-detail-alert-${message.type}`}>
              <span className="material-symbols-outlined">
                {message.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{message.text}</span>
            </div>
          )}

          {/* Complaint Header */}
          <header className="rh-detail-header">
            <div className="rh-detail-meta">
              <span className="rh-detail-badge">{complaint.reference}</span>
              <span className="rh-detail-date-item">
                <span className="material-symbols-outlined">calendar_today</span>
                {complaint.date}
              </span>
              <span className={`rh-detail-priority ${complaint.priority.toLowerCase()}`}>
                <span className="material-symbols-outlined">priority_high</span>
                Priorité {complaint.priority}
              </span>
            </div>
            <h1 className="rh-detail-title">{complaint.subject}</h1>
            <p className="rh-detail-description">{complaint.description}</p>
          </header>

          {/* Conversation Thread */}
          <div className="rh-detail-divider">
            <span>Fil de discussion</span>
          </div>

          {/* Employee Message */}
          <div className="rh-detail-message rh-detail-message-employee">
            <div className="rh-detail-avatar">
              {complaint.employee_avatar ? (
                <img src={complaint.employee_avatar} alt="Avatar employé" />
              ) : (
                <span>{complaint.employee_name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="rh-detail-message-content">
              <div className="rh-detail-message-bubble">
                <p>{complaint.description}</p>
              </div>
              <span className="rh-detail-timestamp">Hier, {complaint.submitted_at}</span>
            </div>
          </div>

          {/* Existing Response (if any) */}
          {complaint.existing_response && (
            <div className="rh-detail-message rh-detail-message-rh">
              <div className="rh-detail-avatar rh-detail-avatar-rh">RH</div>
              <div className="rh-detail-message-content rh-detail-message-content-rh">
                <div className="rh-detail-message-bubble rh-detail-message-bubble-rh">
                  <p>{complaint.existing_response}</p>
                </div>
                <span className="rh-detail-timestamp">Réponse envoyée le {complaint.response_date}</span>
              </div>
            </div>
          )}

          {/* Draft Message (if not responded yet) */}
          {complaint.status !== 'RESOLUE' && complaint.status !== 'FERMEE' && (
            <div className="rh-detail-message rh-detail-message-rh rh-detail-message-draft">
              <div className="rh-detail-avatar rh-detail-avatar-rh">RH</div>
              <div className="rh-detail-message-content rh-detail-message-content-rh">
                <div className="rh-detail-message-bubble rh-detail-message-bubble-draft">
                  <p>Votre réponse est en cours de rédaction...</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Editor and Sidebar Layout */}
        <div className="rh-detail-editor-layout">
          {/* Rich Text Editor (only if not resolved) */}
          {complaint.status !== 'RESOLUE' && complaint.status !== 'FERMEE' && (
            <div className="rh-detail-editor-section">
              <div className="rh-detail-editor-wrapper">
                {/* Editor Toolbar */}
                <div className="rh-detail-editor-toolbar">
                  <button 
                    type="button"
                    title="Gras (Ctrl+B)"
                    onClick={handleBold}
                    className="rh-editor-btn"
                  >
                    <span className="material-symbols-outlined">format_bold</span>
                  </button>
                  <button 
                    type="button"
                    title="Italique (Ctrl+I)"
                    onClick={handleItalic}
                    className="rh-editor-btn"
                  >
                    <span className="material-symbols-outlined">format_italic</span>
                  </button>
                  <button 
                    type="button"
                    title="Liste à puces"
                    onClick={handleList}
                    className="rh-editor-btn"
                  >
                    <span className="material-symbols-outlined">format_list_bulleted</span>
                  </button>
                  <button 
                    type="button"
                    title="Ajouter un lien"
                    onClick={handleLink}
                    className="rh-editor-btn"
                  >
                    <span className="material-symbols-outlined">link</span>
                  </button>
                  <div className="rh-detail-editor-divider"></div>
                  <button 
                    type="button"
                    title="Pièce jointe"
                    onClick={() => fileInputRef.current?.click()}
                    className="rh-editor-btn"
                  >
                    <span className="material-symbols-outlined">attach_file</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileAttach}
                    style={{ display: 'none' }}
                    accept="*"
                  />
                </div>

                {/* Attached Files Preview */}
                {attachedFiles.length > 0 && (
                  <div className="rh-attached-files-preview">
                    <div className="rh-attached-files-title">Fichiers à joindre:</div>
                    <div className="rh-attached-files-list">
                      {attachedFiles.map((file, idx) => (
                        <div key={idx} className="rh-attached-file-item">
                          <span className="material-symbols-outlined">description</span>
                          <div className="rh-file-info">
                            <span className="rh-file-name">{file.name}</span>
                            <span className="rh-file-size">{formatFileSize(file.size)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachedFile(idx)}
                            className="rh-remove-file"
                            title="Supprimer"
                          >
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  className="rh-detail-editor-textarea"
                  placeholder="Rédigez votre réponse officielle ici... (Supportez **gras**, _italique_, [liens](url) et • listes)"
                  value={reponse}
                  onChange={(e) => setReponse(e.target.value)}
                  rows="10"
                ></textarea>

                {/* Footer */}
                <div className="rh-detail-editor-footer">
                  <div className="rh-detail-checkboxes">
                    <label>
                      <input
                        type="checkbox"
                        checked={markAsUrgent}
                        onChange={(e) => setMarkAsUrgent(e.target.checked)}
                      />
                      <span>Marquer comme urgent</span>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={notifySupervisor}
                        onChange={(e) => setNotifySupervisor(e.target.checked)}
                      />
                      <span>Notifier superviseur</span>
                    </label>
                  </div>

                  <div className="rh-detail-actions">
                    <button 
                      className="rh-detail-btn-draft"
                      onClick={handleSaveDraft}
                      type="button"
                    >
                      Brouillon
                    </button>
                    <button
                      className="rh-detail-btn-submit"
                      onClick={handleSubmitResponse}
                      disabled={submitLoading}
                      type="button"
                    >
                      {submitLoading ? "Envoi..." : "Envoyer la réponse"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resolved State */}
          {(complaint.status === 'RESOLUE' || complaint.status === 'FERMEE') && (
            <div className="rh-detail-resolved">
              <span className="material-symbols-outlined">check_circle</span>
              <p>Cette réclamation a déjà reçu une réponse</p>
            </div>
          )}

          {/* Right Sidebar - Employee Uploaded Files */}
          <aside className="rh-detail-sidebar">
            <div className="rh-detail-sidebar-card">
              <h3 className="rh-sidebar-title">
                <span className="material-symbols-outlined">folder_open</span>
                Fichiers de la demande
              </h3>
              
              {complaint.attachment ? (
                <div className="rh-sidebar-files">
                  <div className="rh-sidebar-file-item">
                    <div className="rh-sidebar-file-icon">
                      <span className="material-symbols-outlined">
                        {complaint.attachment.includes('.pdf') ? 'picture_as_pdf' : 'description'}
                      </span>
                    </div>
                    <div className="rh-sidebar-file-details">
                      <p className="rh-sidebar-file-name">{complaint.attachment_name || complaint.attachment.split('/').pop()}</p>
                      <p className="rh-sidebar-file-path">Pièce jointe</p>
                    </div>
                    <a 
                      href={complaint.attachment} 
                      download
                      className="rh-sidebar-download-btn"
                      title="Télécharger"
                    >
                      <span className="material-symbols-outlined">download</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="rh-sidebar-empty">
                  <span className="material-symbols-outlined">inbox</span>
                  <p>Aucun fichier joint</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
