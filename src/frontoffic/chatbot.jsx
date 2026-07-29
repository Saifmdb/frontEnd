import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { X, Paperclip } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/navbar";
import "./frontcss/chatbot-v2.css";
import "../frontoffic/frontcss/welcome.css";

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

function cleanBotText(text) {
  if (!text) return "";

  // 1. Extraire et protéger tous les tokens spéciaux [DOWNLOAD:...] et [LINK:...]
  //    pour qu'ils ne soient pas altérés par les remplacements suivants
  const tokens = [];
  let protected_text = text.replace(/\[(DOWNLOAD|LINK):[^\]]+\]/g, (match) => {
    const placeholder = `\x00TOKEN${tokens.length}\x00`;
    tokens.push(match);
    return placeholder;
  });

  // 2. Nettoyer le texte normal
  // Supprimer les titres markdown (###, ##, #)
  protected_text = protected_text.replace(/^\s*#{1,6}\s*/gm, "");

  // Remplacer le gras **texte** par texte
  protected_text = protected_text.replace(/\*\*(.+?)\*\*/g, "$1");

  // Convertir les puces markdown "- " ou "* " en puce simple •
  protected_text = protected_text.replace(/^\s*[-*]\s+/gm, "• ");

  protected_text = protected_text.replace(/\s*\(id:\s*\d+\)/gi, "");
  protected_text = protected_text.replace(/\s*id:\s*\d+\s*/gi, " ");

  // Supprimer les numéros en début de ligne style "1. "
  protected_text = protected_text.replace(/^\d+\.\s*/gm, "");

  // 3. Restaurer les tokens protégés
  // eslint-disable-next-line no-control-regex -- \x00 markers are intentional placeholders inserted above to protect tokens from text cleanup
  protected_text = protected_text.replace(/\x00TOKEN(\d+)\x00/g, (_, idx) => tokens[parseInt(idx)]);

  return protected_text.trim();
}

/**
 * Renders bot message text, converting tokens into interactive elements:
 *   [LINK:/path|label]       → bouton React Router (navigation interne)
 *   [DOWNLOAD:url|label]     → lien <a> qui ouvre le PDF dans un nouvel onglet
 */
function BotMessageContent({ text, onNavigate }) {
  if (!text) return null;

  // Split sur les deux formats : [LINK:...] et [DOWNLOAD:...]
  const parts = text.split(/(\[(?:LINK|DOWNLOAD):[^\]]+\])/g);

  return (
    <>
      {parts.map((part, i) => {
        // ── Lien de téléchargement PDF ───────────────────────────────────
        const mDownload = part.match(/^\[DOWNLOAD:([^|]+)\|(.+)\]$/);
        if (mDownload) {
          const url   = mDownload[1].trim();
          const label = mDownload[2];
          // Construire l'URL absolue vers le backend Django
          const fullUrl = url.startsWith("http")
            ? url
            : `${BACKEND_URL}${url}`;

          // Utiliser l'endpoint de téléchargement Django avec as_attachment=True
          // On passe par l'endpoint /telecharger/ si l'URL contient un document_id
          const docIdMatch = url.match(/\/(\d+)\//);
          const downloadUrl = docIdMatch
            ? `${BACKEND_URL}/api/documents/${docIdMatch[1]}/telecharger/`
            : fullUrl;

          return (
            <a
              key={i}
              href={downloadUrl}
              download
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  // Récupérer le token d'auth (JWT applicatif vérifié par le backend)
                  const token = localStorage.getItem('temp_token');
                  const headers = {};
                  if (token) headers['Authorization'] = `Bearer ${token}`;

                  const response = await fetch(downloadUrl, { headers, credentials: 'include' });
                  if (!response.ok) throw new Error(`HTTP ${response.status}`);

                  const blob = await response.blob();
                  const blobUrl = window.URL.createObjectURL(blob);

                  // Déterminer le nom du fichier depuis le header ou l'URL
                  const disposition = response.headers.get('content-disposition');
                  let filename = label.replace(/^📄\s*/, '').trim() || 'document.pdf';
                  if (disposition) {
                    const match = disposition.match(/filename[^;=\n]*=["']?([^"'\n]+)["']?/i);
                    if (match) filename = decodeURIComponent(match[1]);
                  }

                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(blobUrl);
                } catch (err) {
                  console.error('Erreur téléchargement:', err);
                  // Fallback: ouvrir dans un nouvel onglet
                  window.open(fullUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                marginTop: "10px",
                color: "#a31919",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "underline",
                backgroundColor: "transparent",
                border: "none",
                padding: "0",
              }}
            >
              Voir le document
            </a>
          );
        }

        // ── Lien de navigation interne React Router ──────────────────────
        const mLink = part.match(/^\[LINK:([^|]+)\|(.+)\]$/);
        if (mLink) {
          const path  = mLink[1];
          const label = mLink[2];
          return (
            <a
              key={i}
              href={path}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(path);
              }}
              style={{
                display: "inline-block",
                marginTop: "10px",
                color: "#1a73e8",
                textDecoration: "underline",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {label}
            </a>
          );
        }

        // ── Texte normal ─────────────────────────────────────────────────
        return (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>
            {part}
          </span>
        );
      })}
    </>
  );
}

BotMessageContent.propTypes = {
  text: PropTypes.string,
  onNavigate: PropTypes.func,
};

function getAuthToken() {
  // Seul temp_token est un JWT applicatif que le backend sait vérifier —
  // les autres clés (token Microsoft, etc.) ne sont pas des JWT signés par nous.
  return localStorage.getItem('temp_token') || null;
}

function getAuthHeaders() {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

function getUserId() {
  const numericId = localStorage.getItem('userId_numeric');
  if (numericId) {
    console.log("👤 Utilisation de l'ID numérique:", numericId);
    return numericId;
  }
  
  const username = localStorage.getItem('userId');
  console.log("👤 Utilisation du username:", username || "anonymous");
  return username || "anonymous";
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default function Chatbot() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(
    localStorage.getItem("conversationId") || null
  );
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Bienvenu tu des questions ?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [untitledConversationId, setUntitledConversationId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const activeRequestIdRef = useRef(0);
  const pendingUserMessageIdRef = useRef(null);
  const currentRequestTokenRef = useRef("");

  const notifyBackendCancel = async (requestToken) => {
    if (!requestToken) return;
    try {
      await fetch(`${BACKEND_URL}/api/chatbot/cancel/`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ requestId: requestToken }),
      });
    } catch (err) {
      console.warn("⚠️ [notifyBackendCancel] Échec notification cancel:", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);



  const loadConversations = async () => {
    console.log("🔄 [loadConversations] Démarrage du chargement");
    setLoading(true);
    
    try {
      const userId = getUserId();
      console.log("👤 [loadConversations] userId utilisé:", userId);
      
      const convId = localStorage.getItem("conversationId");
      if (convId && convId.startsWith("anonymous")) {
        console.log("🗑️ [loadConversations] Conversation anonyme détectée et supprimée:", convId);
        localStorage.removeItem("conversationId");
        setCurrentConversation(null);
      }

      const headers = getAuthHeaders();
      const url = `${BACKEND_URL}/api/chatbot/conversations/?userId=${encodeURIComponent(userId)}`;
      console.log("🌐 [loadConversations] URL:", url);

      const response = await fetchWithTimeout(url, {
        headers: headers,
        credentials: 'include'
      });

      console.log("📥 [loadConversations] Statut réponse:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ [loadConversations] Conversations chargées:", data);
        setConversations(data.conversations || []);
      } else if (response.status === 403) {
        console.log("⚠️ [loadConversations] Accès refusé, tentative sans token...");
        const response2 = await fetchWithTimeout(url, {
          credentials: 'include'
        });
        if (response2.ok) {
          const data = await response2.json();
          console.log("✅ [loadConversations] Conversations chargées sans token:", data);
          setConversations(data.conversations || []);
        }
      } else {
        console.log("❌ [loadConversations] Erreur:", response.status);
        setConversations([]);
      }
    } catch (err) {
      if (err?.name === "AbortError") {
        console.warn("⚠️ [loadConversations] Timeout réseau, chargement interrompu");
        return;
      }
      console.error("❌ [loadConversations] Erreur:", err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const onFocus = () => {
      console.log("🔍 Focus détecté, rechargement des conversations");
      loadConversations();
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const isAuthenticated = () => {
    const token = getAuthToken();
    const userId = localStorage.getItem('userId');
    const userData = localStorage.getItem('user');
    
    console.log("🔐 [isAuthenticated] Vérification:", {
      hasToken: !!token,
      userId: userId,
      hasUserData: !!userData,
      isAnonymous: userId === 'anonymous'
    });
    
    if (token) return true;
    if (userData) return true;
    if (userId && userId !== 'anonymous') return true;
    return false;
  };

  const loadConversationMessages = async (conversationId) => {
    console.log("📖 [loadConversationMessages] Chargement de la conversation:", conversationId);
    const userId = getUserId();
    
    if (conversationId && conversationId.startsWith('anonymous') && !isAuthenticated()) {
      console.log("⛔ [loadConversationMessages] Conversation anonyme sans authentification");
      alert('Veuillez vous connecter pour ouvrir cette conversation.');
      return;
    }

    try {
      const headers = getAuthHeaders();
      const url = `${BACKEND_URL}/api/chatbot/conversations/${conversationId}/?userId=${encodeURIComponent(userId)}`;
      console.log("🌐 [loadConversationMessages] URL:", url);
      
      const res = await fetch(url, {
        headers: headers,
        credentials: 'include'
      });
      
      console.log("📥 [loadConversationMessages] Statut réponse:", res.status);
      
      if (res.status === 403) {
        console.log("⛔ [loadConversationMessages] Accès refusé 403");
        alert('Accès refusé — veuillez vous connecter.');
        return;
      }
      
      const json = await res.json();
      console.log("📖 [loadConversationMessages] Données reçues:", json);
      
      if (json.messages) {
        console.log("✅ [loadConversationMessages] Messages chargés:", json.messages.length);
        const msgs = json.messages.map((m, i) => ({
          id: i + 1,
          text: m.text,
          sender: m.sender,
          timestamp: new Date(m.created_at),
        }));
        setMessages(msgs);
        localStorage.setItem("conversationId", conversationId);
        setCurrentConversation(conversationId);
      }
    } catch (err) {
      console.error("❌ [loadConversationMessages] Erreur:", err);
    }
  };

  const createConversation = async (title) => {
    console.log("➕ [createConversation] Création d'une conversation:", title);
    
    if (!isAuthenticated()) {
      console.log("⛔ [createConversation] Non authentifié");
      alert('Veuillez vous connecter pour démarrer une nouvelle discussion.');
      return null;
    }

    const token = getAuthToken();
    const userId = getUserId();
    
    const requestBody = {
      title: title,
      userId: userId
    };
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const url = `${BACKEND_URL}/api/chatbot/conversations/`;
    console.log("🌐 [createConversation] URL:", url);
    
    const res = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
      credentials: "include",
    });
    
    console.log("📥 [createConversation] Statut réponse:", res.status);
    
    if (res.status === 403) {
      console.log("⛔ [createConversation] Accès refusé 403");
      
      const res2 = await fetch(url, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: "include",
      });
      
      if (res2.ok) {
        const json2 = await res2.json();
        if (json2.external_id) {
          setConversations((prev) => [{ external_id: json2.external_id, created_at: new Date().toISOString(), title }, ...prev]);
          localStorage.setItem("conversationId", json2.external_id);
          setCurrentConversation(json2.external_id);
          setMessages([]);
          if (title === "Nouvelle discussion") {
            setUntitledConversationId(json2.external_id);
          }
          return json2.external_id;
        }
      }
      return null;
    }
    
    const json = await res.json();
    
    if (json.external_id) {
      setConversations((prev) => [{ external_id: json.external_id, created_at: new Date().toISOString(), title }, ...prev]);
      localStorage.setItem("conversationId", json.external_id);
      setCurrentConversation(json.external_id);
      setMessages([]);
      if (title === "Nouvelle discussion") {
        setUntitledConversationId(json.external_id);
      }
      return json.external_id;
    }
    return null;
  };

  const updateConversationTitle = async (conversationId, title) => {
    console.log("✏️ [updateConversationTitle] Mise à jour du titre:", conversationId, title);
    
    try {
      const token = getAuthToken();
      const userId = getUserId();
      
      const requestBody = {
        title: title,
        userId: userId
      };
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const url = `${BACKEND_URL}/api/chatbot/conversations/${conversationId}/?userId=${encodeURIComponent(userId)}`;
      
      let res = await fetch(url, {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify(requestBody),
        credentials: "include",
      });
      
      if (res.status === 401 || res.status === 403) {
        const res2 = await fetch(url, {
          method: "PATCH",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          credentials: "include",
        });
        
        if (res2.ok) {
          setConversations((prev) => prev.map((c) => (c.external_id === conversationId ? { ...c, title } : c)));
          if (untitledConversationId === conversationId) setUntitledConversationId(null);
        }
      } else if (res.ok) {
        setConversations((prev) => prev.map((c) => (c.external_id === conversationId ? { ...c, title } : c)));
        if (untitledConversationId === conversationId) setUntitledConversationId(null);
      }
    } catch (err) {
      console.error("❌ [updateConversationTitle] Erreur:", err);
    }
  };

  const deleteConversation = async (conversationId) => {
    console.log("🗑️ [deleteConversation] Suppression de la conversation:", conversationId);
    const userId = getUserId();
    const url = `${BACKEND_URL}/api/chatbot/conversations/${conversationId}/?userId=${encodeURIComponent(userId)}`;
    let deletedOnServer = false;

    try {
      const headers = getAuthHeaders();
      const res = await fetch(url, {
        method: "DELETE",
        headers: headers,
        credentials: "include",
      });

      console.log("🗑️ [deleteConversation] Statut réponse:", res.status);

      if (res.ok) {
        deletedOnServer = true;
      } else if (res.status === 401 || res.status === 403) {
        // Retry sans Authorization header (mode fallback déjà utilisé ailleurs dans le composant)
        const res2 = await fetch(url, {
          method: "DELETE",
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });
        console.log("🗑️ [deleteConversation] Retry statut:", res2.status);
        deletedOnServer = res2.ok;
      }
    } catch (err) {
      console.warn("⚠️ [deleteConversation] Erreur:", err);
    } finally {
      if (deletedOnServer) {
        setConversations((prev) => prev.filter((c) => c.external_id !== conversationId));
        if (currentConversation === conversationId) {
          setCurrentConversation(null);
          localStorage.removeItem("conversationId");
          setMessages([]);
        }
        if (untitledConversationId === conversationId) setUntitledConversationId(null);
      } else {
        alert("Suppression refusée (403). Vérifiez votre authentification puis réessayez.");
      }
    }
  };

  const uploadPdfToConversation = async (file, conversationId) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", conversationId);

      const token = getAuthToken();
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BACKEND_URL}/api/chatbot/upload-pdf/`, {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      });

      const data = await res.json();
      if (data.success) {
        return data.message || "PDF chargé avec succès. Vous pouvez maintenant poser vos questions sur ce document.";
      }
      return null;
    } catch (err) {
      console.error("❌ [uploadPdfToConversation] Erreur:", err);
      return null;
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      // Auto-upload PDF immediately to conversation
      let conversationId = currentConversation;
      if (!conversationId) {
        conversationId = await createConversation("Nouvelle discussion");
        if (!conversationId) {
          alert("Impossible de créer une conversation. Veuillez réessayer.");
          return;
        }
      }

      // Show uploading indicator
      const uploadingMsg = {
        id: Date.now(),
        text: `📎 Chargement du PDF : ${file.name}…`,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, uploadingMsg]);

      const result = await uploadPdfToConversation(file, conversationId);
      if (result) {
        // Replace uploading message with success message
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== uploadingMsg.id),
          {
            id: Date.now() + 1,
            text: `✅ PDF « ${file.name} » chargé avec succès.\n${result}\n\nVous pouvez maintenant poser vos questions sur ce document, ou continuer à utiliser l'assistant RH normalement.`,
            sender: "bot",
            timestamp: new Date(),
            attachment: { name: file.name, size: file.size },
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== uploadingMsg.id),
          {
            id: Date.now() + 1,
            text: `❌ Impossible de traiter le PDF « ${file.name} ». Veuillez réessayer.`,
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
      }
      // Clear file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      // Non-PDF: attach to message as before
      setAttachedFile(file);
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault?.();

    if (isTyping) {
      const requestToken = currentRequestTokenRef.current;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      notifyBackendCancel(requestToken);
      activeRequestIdRef.current += 1;

      // Ne pas supprimer le message utilisateur déjà envoyé.
      // On garde une trace claire que la génération a été arrêtée.
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 3,
          text: " Génération arrêtée. Vous pouvez envoyer un nouveau message.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);

      pendingUserMessageIdRef.current = null;
      currentRequestTokenRef.current = "";
      setIsTyping(false);
      setInputValue("");
      setAttachedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const messageToSend = inputValue.trim();
    if (!messageToSend) {
      return;
    }

    const userId = getUserId();
    let conversationIdToUse = currentConversation;

    if (!conversationIdToUse) {
      const newId = await createConversation("Nouvelle discussion");
      if (newId) {
        conversationIdToUse = newId;
        setCurrentConversation(newId);
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        setIsTyping(false);
        return;
      }
    }

    const userMessageId = Date.now();
    const userMessage = {
      id: userMessageId,
      text: messageToSend,
      sender: "user",
      timestamp: new Date(),
      attachment: attachedFile ? { name: attachedFile.name, size: attachedFile.size } : null,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setIsTyping(true);
    pendingUserMessageIdRef.current = userMessageId;
    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;
    const requestToken = `${conversationIdToUse || "no-conv"}:${requestId}:${Date.now()}`;
    currentRequestTokenRef.current = requestToken;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const headers = getAuthHeaders();
      const url = `${BACKEND_URL}/api/chatbot/generate/`;
      
      const requestBody = {
        prompt: messageToSend,
        userId: userId,
        conversationId: conversationIdToUse,
        requestId: requestToken,
      };
      
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        credentials: "include",
        signal: controller.signal,
      });

      if (activeRequestIdRef.current !== requestId || controller.signal.aborted) {
        return;
      }

      const data = await res.json();

      if (activeRequestIdRef.current !== requestId || controller.signal.aborted) {
        return;
      }

      let botTextRaw = data.response || data.reply || data.error || "Réponse indisponible.";
      let botText = cleanBotText(botTextRaw);
      
      const botMessage = {
        id: Date.now() + 1,
        text: botText,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      pendingUserMessageIdRef.current = null;

      if (untitledConversationId && untitledConversationId === conversationIdToUse) {
        const title = messageToSend.slice(0, 80);
        await updateConversationTitle(conversationIdToUse, title);
      }
    } catch (err) {
      if (err?.name === "AbortError") {
        console.log("⏹️ [handleSendMessage] Requête annulée par l'utilisateur");
        return;
      }

      if (activeRequestIdRef.current !== requestId) {
        return;
      }

      console.error("❌ [handleSendMessage] Erreur serveur:", err);
      const botMessage = {
        id: Date.now() + 2,
        text: "Désolé, le serveur est indisponible pour le moment.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      if (activeRequestIdRef.current === requestId) {
        setIsTyping(false);
        abortControllerRef.current = null;
        pendingUserMessageIdRef.current = null;
        currentRequestTokenRef.current = "";
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const uploadedFiles = messages
    .filter((m) => m.attachment && m.sender === 'user')
    .map((m) => ({
      ...m.attachment,
      uploadedAt: m.timestamp || m.created_at || null,
    }))
    .reverse();

  const formatUploadedAt = (rawDate) => {
    if (!rawDate) return "Date inconnue";
    const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (Number.isNaN(d.getTime())) return "Date inconnue";
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="cb-page-root">
      <Navbar hideDisconnectBtn={false} />
      
      <main className="cb-main-wrapper">
        {/* Left Sidebar */}
        <aside className="cb-sidebar-left">
          <div>
            <h2 style={{fontSize:'1.125rem', fontWeight:800, color:'var(--cb-honoris-burgundy)', fontFamily:'var(--cb-font-headline)'}}>RH ChatBot</h2>
            <p style={{fontSize:'0.75rem', color:'var(--cb-on-surface-variant)', fontWeight:500}}>Assistance Employé</p>
          </div>
          
          <button className="cb-new-btn" onClick={() => createConversation("Nouvelle discussion")}>
            <span className="material-symbols-outlined" style={{fontSize:'14px'}}>add</span>
            Nouvelle Discussion
          </button>
          
          <nav style={{flex:1, display:'flex', flexDirection:'column', gap:'1.5rem', overflowY:'auto'}} className="cb-custom-scrollbar">
            <div>
              <p className="cb-nav-group-title">Navigation</p>
              <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                <a href="#" style={{display:'flex', alignItems:'center', gap:'12px', padding:'10px', color:'inherit', textDecoration:'none'}}>
                  <span className="material-symbols-outlined">history</span>
                  <span style={{fontSize:'14px'}}>Historique</span>
                </a>
              </div>
            </div>
            
            <div>
              <p className="cb-nav-group-title">Historique des conversations</p>
              <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                {loading ? (
                  <p style={{fontSize:'12px', color:'var(--cb-on-surface-variant)'}}>Chargement...</p>
                ) : conversations.length === 0 ? (
                  <p style={{fontSize:'12px', color:'var(--cb-on-surface-variant)'}}>Aucune conversation</p>
                ) : (
                  conversations.map((c) => (
                    <div 
                      key={c.external_id} 
                      className={`cb-history-item ${(c.external_id === currentConversation) ? 'active' : ''}`}
                      onClick={() => loadConversationMessages(c.external_id)}
                    >
                      <div className="cb-history-title">
                        <span style={{paddingRight:'8px', textOverflow:'ellipsis', overflow:'hidden', flex:1}}>{c.title || 'Nouvelle discussion'}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteConversation(c.external_id); }}
                          style={{border:'none', background:'transparent', cursor:'pointer', color:'var(--cb-on-surface-variant)'}}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <span className="cb-history-time">{new Date(c.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Chat Area */}
        <section className="cb-chat-area">
          {/* Header */}
          <header className="cb-chat-header">
            <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
              <div style={{width:'40px', height:'40px', borderRadius:'8px', backgroundColor:'rgba(163, 25, 25, 0.1)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <span className="material-symbols-outlined" style={{color:'var(--cb-honoris-burgundy)', fontVariationSettings:"'FILL' 1"}}>smart_toy</span>
              </div>
              <div>
                <h1 style={{fontFamily:'var(--cb-font-headline)', fontWeight:700, fontSize:'1.125rem', margin:0}}>Assistant RH Virtuel</h1>
                <span style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'0.75rem', color:'#3f6653', fontWeight:500, marginTop:'4px'}}>
                  <span style={{width:'6px', height:'6px', borderRadius:'50%', backgroundColor:'#3f6653'}}></span> En ligne
                </span>
              </div>
            </div>
          </header>

          {/* Messages */}
          <div className="cb-messages-stream cb-custom-scrollbar">
            {(!messages || messages.length === 0 || (messages.length === 1 && messages[0].sender === 'bot' && !currentConversation)) && (
              <div style={{display:'flex', flexDirection:'column', alignItems:'center', marginBottom:'1rem', paddingTop:'3rem'}}>
                <h3 style={{fontFamily:'var(--cb-font-headline)', fontWeight:800, fontSize:'1.5rem', textAlign:'center'}}>Bonjour !</h3>
                <p style={{color:'var(--cb-on-surface-variant)', textAlign:'center', maxWidth:'400px', marginTop:'0.5rem', fontSize:'14px'}}>
                  Je suis votre assistant Honoris. Comment puis-je vous accompagner dans vos démarches administratives aujourd&apos;hui ?
                </p>
              </div>
            )}
            
            {messages.map((m) => (
              <div key={m.id} className={`cb-msg-row ${m.sender}`}>
                {m.sender === 'bot' && (
                  <div style={{width:'32px', height:'32px', borderRadius:'8px', backgroundColor:'rgba(163, 25, 25, 0.1)', display:'flex', alignItems:'center', justifyContent:'center', marginRight:'1rem', flexShrink:0}}>
                    <span className="material-symbols-outlined" style={{color:'var(--cb-honoris-burgundy)', fontSize:'16px'}}>smart_toy</span>
                  </div>
                )}
                <div className="cb-msg-bubble" style={{whiteSpace:"pre-wrap"}}>
                  {m.sender === 'bot' ? (
                    <BotMessageContent
                      text={m.text}
                      onNavigate={(path) => navigate(path)}
                    />
                  ) : (
                    m.text
                  )}
                  {m.attachment && (
                     <div style={{marginTop:'8px', display:'flex', alignItems:'center', gap:'4px', fontSize:'12px', backgroundColor:'rgba(255,255,255,0.2)', padding:'4px 8px', borderRadius:'4px', width:'fit-content'}}>
                       <Paperclip size={12} /> {m.attachment.name}
                     </div>
                  )}
                  <span className="cb-msg-time" style={{textAlign: m.sender==='user'?'right':'left'}}>{m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="cb-msg-row bot">
                 <div style={{width:'32px', height:'32px', borderRadius:'8px', backgroundColor:'rgba(163, 25, 25, 0.1)', display:'flex', alignItems:'center', justifyContent:'center', marginRight:'1rem', flexShrink:0}}>
                    <span className="material-symbols-outlined" style={{color:'var(--cb-honoris-burgundy)', fontSize:'16px'}}>smart_toy</span>
                  </div>
                  <div className="cb-msg-bubble" style={{display:'flex', alignItems:'center', gap:'4px'}}>
                    <span style={{width:'8px', height:'8px', backgroundColor:'var(--cb-on-surface-variant)', borderRadius:'50%', animation:'bounce 1s infinite'}}></span>
                    <span style={{width:'8px', height:'8px', backgroundColor:'var(--cb-on-surface-variant)', borderRadius:'50%', animation:'bounce 1s infinite 0.2s'}}></span>
                    <span style={{width:'8px', height:'8px', backgroundColor:'var(--cb-on-surface-variant)', borderRadius:'50%', animation:'bounce 1s infinite 0.4s'}}></span>
                  </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <footer className="cb-chat-footer">
            <div style={{maxWidth:'896px', margin:'0 auto'}}>
               {attachedFile && (
                  <div style={{display:'flex', alignItems:'center', gap:'8px', padding:'8px 12px', backgroundColor:'var(--cb-surface-container)', borderRadius:'8px', width:'fit-content', marginBottom:'8px', fontSize:'12px', border:'1px solid var(--cb-outline-variant)'}}>
                    <Paperclip size={14} />
                    <span>{attachedFile.name}</span>
                    <button type="button" onClick={removeAttachedFile} style={{background:'none', border:'none', cursor:'pointer', display:'flex'}}><X size={14}/></button>
                  </div>
                )}
              <div className="cb-input-wrapper">
                <textarea 
                  className="cb-textarea cb-custom-scrollbar" 
                  placeholder="Posez votre question à l'assistant RH..."
                  rows="1"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                ></textarea>
                <div style={{display:'flex', alignItems:'center', gap:'4px', paddingRight:'8px', paddingBottom:'4px'}}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{display: 'none'}}
                    onChange={handleFileSelect}
                  />
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={{background:'transparent', border:'none', cursor:'pointer', padding:'8px', color:'var(--cb-on-surface-variant)'}}>
                    <span className="material-symbols-outlined">attach_file</span>
                  </button>
                  <button 
                    onClick={handleSendMessage}
                    className={`cb-send-btn ${isTyping ? 'is-stop' : ''}`}
                    aria-label={isTyping ? "Arrêter" : "Envoyer"}
                    title={isTyping ? "Arrêter" : "Envoyer"}
                  >
                    {isTyping ? (
                      <img src="/images/stop-button.png" alt="Stop" className="cb-stop-icon" />
                    ) : (
                      <span className="material-symbols-outlined" style={{fontVariationSettings:"'FILL' 1"}}>send</span>
                    )}
                  </button>
                </div>
              </div>
              <p style={{fontSize:'10px', textAlign:'center', color:'var(--cb-on-surface-variant)', marginTop:'12px', fontWeight:500}}>
                L&apos;IA peut faire des erreurs. Veuillez vérifier les informations importantes auprès du département RH.
              </p>
            </div>
          </footer>
        </section>

        {/* Right Sidebar */}
        <aside className="cb-sidebar-right">
          <div className="cb-upload-panel">
            <h3 className="cb-upload-title">Liste des fichiers uploadés</h3>
            <p className="cb-upload-subtitle">Documents envoyés dans cette conversation</p>

            {uploadedFiles.length === 0 ? (
              <div className="cb-upload-empty">
                <span className="material-symbols-outlined">upload_file</span>
                <p>Aucun fichier uploadé pour le moment.</p>
              </div>
            ) : (
              <ul className="cb-upload-list">
                {uploadedFiles.map((file, idx) => (
                  <li key={`${file.name}-${idx}`} className="cb-upload-item">
                    <div className="cb-upload-file-meta">
                      <span className="material-symbols-outlined cb-upload-file-icon">description</span>
                      <div className="cb-upload-file-texts">
                        <span className="cb-upload-file-name" title={file.name}>{file.name}</span>
                        <span className="cb-upload-file-date">{formatUploadedAt(file.uploadedAt)}</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined cb-upload-file-action">folder_open</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div style={{marginTop:'auto', backgroundColor:'rgba(237, 238, 239, 0.5)', padding:'1.25rem', borderRadius:'0.75rem', border:'1px solid var(--cb-outline-variant)'}}>
            <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px'}}>
              <div style={{width:'32px', height:'32px', backgroundColor:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--cb-honoris-burgundy)', boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>
                <span className="material-symbols-outlined" style={{fontSize:'18px'}}>support_agent</span>
              </div>
              <h4 style={{fontFamily:'var(--cb-font-headline)', fontWeight:700, fontSize:'14px', margin:0}}>Besoin d&apos;aide ?</h4>
            </div>
            <p style={{fontSize:'11px', color:'var(--cb-on-surface-variant)', marginBottom:'1rem', lineHeight:1.5}}>
              Si l&apos;assistant ne peut pas répondre à votre demande, nos experts RH sont disponibles.
            </p>
            <button style={{width:'100%', padding:'10px', backgroundColor:'white', border:'1px solid var(--cb-honoris-burgundy)', color:'var(--cb-honoris-burgundy)', borderRadius:'8px', fontSize:'12px', fontWeight:700, cursor:'pointer'}}>
              Contacter le Support RH
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}