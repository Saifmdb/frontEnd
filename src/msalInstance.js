// src/msalInstance.js
import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID || import.meta.env.REACT_APP_MSAL_CLIENT_ID,
    authority: import.meta.env.VITE_MSAL_AUTHORITY || import.meta.env.REACT_APP_MSAL_AUTHORITY || "https://login.microsoftonline.com/common",
    redirectUri: import.meta.env.VITE_MSAL_REDIRECT_URI || import.meta.env.REACT_APP_MSAL_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: false, // IMPORTANT: Empêche la double redirection
  },
  cache: {
    cacheLocation: import.meta.env.VITE_MSAL_CACHE_LOCATION || import.meta.env.REACT_APP_MSAL_CACHE_LOCATION || "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error("[MSAL Error]", message);
            break;
          case LogLevel.Warning:
            console.warn("[MSAL Warning]", message);
            break;
          default:
            // Ne pas logger Info et Verbose pour réduire le bruit
            break;
        }
      },
      logLevel: LogLevel.Warning
    },
    allowRedirectInIframe: true,
  }
};

let msalInstance = null;

export const getMsalInstance = () => {
  if (!msalInstance) {
    throw new Error("MSAL not initialized. Call initializeMsal first.");
  }
  return msalInstance;
};

export const initializeMsal = async () => {
  if (msalInstance) {
    console.log("✅ MSAL already initialized");
    return msalInstance;
  }
  
  try {
    const clientId = import.meta.env.VITE_MSAL_CLIENT_ID || import.meta.env.REACT_APP_MSAL_CLIENT_ID;
    
    if (!clientId) {
      throw new Error("MSAL Client ID is not defined. Please check your .env file.");
    }
    
    console.log("🔧 Initializing MSAL...");
    
    msalInstance = new PublicClientApplication(msalConfig);
    
    await msalInstance.initialize();
    
    console.log("✅ MSAL initialized successfully");
    
    return msalInstance;
  } catch (error) {
    console.error("❌ MSAL initialization failed:", error);
    throw error;
  }
};

export const msalLogout = async () => {
  try {
    console.log("🔓 MSAL local logout started...");
    clearMsalCache();
    console.log("✅ MSAL local logout successful");
  } catch (error) {
    console.error("❌ MSAL logout error:", error);
    clearMsalCache();
  }
};

export const clearMsalCache = () => {
  console.log("🧹 Clearing MSAL cache...");
  
  // Nettoyer sessionStorage
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('msal.') || key.includes('adal') || key.includes('azure')) {
      sessionStorage.removeItem(key);
    }
  });
  
  // Nettoyer localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.includes('msal.') || key.includes('adal') || key.includes('azure')) {
      localStorage.removeItem(key);
    }
  });
  
  console.log("✅ MSAL cache cleared");
};