import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { setNavigate } from './api/navigation'

import './App.css'
import Home from './frontoffic/Home'
import SignIn from './frontoffic/SignIn'
import Welcome from './frontoffic/Welcome'
import Chatbot from './frontoffic/chatbot'
import Manager from './frontoffic/manager'
import DemandeConge from './frontoffic/DemandeConge'
import GestionCongesManager from './frontoffic/GestionCongesManager'
import Reclamation from './frontoffic/reclamation'
import MesReclamations from './frontoffic/mes-reclamations'
import ReclamationDetail from './frontoffic/reclamation-detail'
import ReclamationRespons from './frontoffic/ReclamationRespons'
import ReclamationDetailRH from './frontoffic/ReclamationDetailRH'
import HistoriqueConges from './frontoffic/historique-conges'
import GestionDocumentsRH from './frontoffic/gestion-documents-rh'
import Procedure from './frontoffic/procedure'
import Conges from './frontoffic/Conges'
import CongeDetail from './frontoffic/CongeDetail'
import CreateReunion from './frontoffic/CreateReunion'
import Reunions from './frontoffic/Reunions'
import Dashboard from './frontoffic/Admin/Dashboard'
import UserManagement from './frontoffic/Admin/UserManagement'
import UserDetail from './frontoffic/Admin/UserDetail'
import CreateUser from './frontoffic/Admin/CreateUser'
import ReunionDetail from './frontoffic/DetailReunions'
import GoogleCallback from './frontoffic/GoogleCallback'
import DemandeDocument from './frontoffic/demandeDocument'
import GestionDemandes from './frontoffic/GestionDemDocument'
import RepondreDemandeDetail from './frontoffic/RepondreDemandeDetail'
import HistoriqueDemandeDocument from './frontoffic/historique-demande-document'
import DemandeCreditBancaire from './frontoffic/DemandeCreditBancaire'
import GestionDemandesCredit from './frontoffic/HistoriqueCredit'
import TraitementCredit from './frontoffic/TraitementCredit'
import DetailDemandeCredit from './frontoffic/DetailDemandeCredit'
import DemandeAvanceSalaire from './frontoffic/DemandeAvanceSalaire'
import GestionAvancesSalaire from './frontoffic/GestionAvancesSalaire'
import DetailAvanceSalaire from './frontoffic/DetailAvanceSalaire'
import HistoriqueAvanceSalaire from './frontoffic/HistoriqueAvanceSalaire'
import TraitementAvanceSalaire from './frontoffic/TraitementAvanceSalaire'

function DemandeCongeWrapper() {
  const { matricule } = useParams();
  const [username, setUsername] = useState(null);
  
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUsername(user.username);
      } catch (e) {
        console.error("Erreur parsing user:", e);
      }
    }
  }, []);
  
  if (!username) return <div>Chargement...</div>;
  
  return <DemandeConge username={username} matricule={matricule} />;
}

function GestionCongesWrapper() {
  const { matricule } = useParams();
  const [username, setUsername] = useState(null);
  const [userRole, setUserRole] = useState(null);
  
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUsername(user.username);
        setUserRole(user.role);
      } catch (e) {
        console.error("Erreur parsing user:", e);
      }
    }
  }, []);
  
  if (userRole && userRole !== 'ORGANIZER') {
    return <Navigate to="/welcome" replace />;
  }
  
  if (!username) return <div>Chargement...</div>;
  
  return <GestionCongesManager username={username} matricule={matricule} />;
}

function CongesWrapper() {
  const { matricule } = useParams();
  const [username, setUsername] = useState(null);
  
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUsername(user.username);
      } catch (e) {
        console.error("Erreur parsing user:", e);
      }
    }
  }, []);
  
  if (!username) return <div>Chargement...</div>;
  
  return <Conges username={username} matricule={matricule} />;
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated || !user?.email) {
    if (localStorage.getItem('user')) {
      // Données présentes mais invalides (ex: objet sans email) : on nettoie.
      logout();
    }
    return <Navigate to="/signin" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/dashboard' : '/welcome'} replace />;
  }

  return children;
}

function App() {
  // Import classique du composant GoogleCallback
  const navigate = useNavigate();
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/oauth2callback" element={<GoogleCallback />} />
      <Route path="/" element={<Home />} />
      

      
      <Route path="/signin" element={
        <PublicOnlyRoute>
          <SignIn />
        </PublicOnlyRoute>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/demande-document" element={
        <ProtectedRoute>
          <DemandeDocument />
        </ProtectedRoute>
      } />

      <Route path="/credit-bancaire" element={
        <ProtectedRoute>
          <DemandeCreditBancaire />
        </ProtectedRoute>
      } />

      <Route path="/gestion-demandes-credit" element={
        <ProtectedRoute>
          <GestionDemandesCredit />
        </ProtectedRoute>
      } />

      <Route path="/traitement-credit/:id" element={
        <ProtectedRoute>
          <TraitementCredit />
        </ProtectedRoute>
      } />

      <Route path="/detail-demande-credit/:id" element={
        <ProtectedRoute>
          <DetailDemandeCredit />
        </ProtectedRoute>
      } />

      <Route path="/historique-credit" element={
        <Navigate to="/gestion-demandes-credit" replace />
      } />

      <Route path="/avance-salaire" element={
        <ProtectedRoute>
          <DemandeAvanceSalaire />
        </ProtectedRoute>
      } />

      <Route path="/gestion-avances-salaire" element={
        <ProtectedRoute>
          <GestionAvancesSalaire />
        </ProtectedRoute>
      } />

      <Route path="/detail-avance/:id" element={
        <ProtectedRoute>
          <DetailAvanceSalaire />
        </ProtectedRoute>
      } />

      <Route path="/traitement-avance/:id" element={
        <ProtectedRoute>
          <TraitementAvanceSalaire />
        </ProtectedRoute>
      } />

      <Route path="/historique-avance" element={
        <ProtectedRoute>
          <HistoriqueAvanceSalaire />
        </ProtectedRoute>
      } />

      <Route path="/historique-avance-salaire" element={
        <Navigate to="/historique-avance" replace />
      } />

      <Route path="/historique-demande-document" element={
        <ProtectedRoute>
          <HistoriqueDemandeDocument />
        </ProtectedRoute>
      } />

       <Route path="/gestion-demande-document" element={
        <ProtectedRoute>
          <GestionDemandes />
        </ProtectedRoute>
      } />

      <Route path="/reclamation" element={
        <ProtectedRoute>
         <Reclamation />
        </ProtectedRoute>
      } />

       <Route path="/gestion-dem-document/repondre/:id" element={
        <ProtectedRoute>
          <RepondreDemandeDetail />
        </ProtectedRoute>
      } />
      
      <Route path="/mes-reclamations" element={
        <ProtectedRoute>
         <MesReclamations />
        </ProtectedRoute>
      } />
      <Route path="/reunions/:id" element={
        <ProtectedRoute>
         <ReunionDetail />
        </ProtectedRoute>
      } />
      <Route path="/mes-reclamations/:id" element={
        <ProtectedRoute>
          <ReclamationDetail />
        </ProtectedRoute>
      } />
      <Route path="/reclamation-responsable" element={
        <ProtectedRoute>
          <ReclamationRespons />
        </ProtectedRoute>
      } />
      <Route path="/reclamation-responsable/:id" element={
        <ProtectedRoute>
          <ReclamationDetailRH />
        </ProtectedRoute>
      } />
      
      <Route path="/welcome" element={
        <ProtectedRoute>
          <Welcome />
        </ProtectedRoute>
      } />
      
      <Route path="/chatbot" element={
        <ProtectedRoute>
          <Chatbot />
        </ProtectedRoute>
      } />
      <Route path="/historique-conges" element={
        <ProtectedRoute>
          <HistoriqueConges />
        </ProtectedRoute>
      } />
       <Route path="/gestion-documents-rh" element={
        <ProtectedRoute>
          <GestionDocumentsRH />
        </ProtectedRoute>
      } />
      <Route path="/procedure" element={
        <ProtectedRoute>
          <Procedure />
        </ProtectedRoute>
      } />
      <Route path="/conges" element={
        <ProtectedRoute>
         <Conges />
        </ProtectedRoute>
      } />
       <Route path="/user-manager" element={
        <ProtectedRoute>
         <UserManagement />
        </ProtectedRoute>
      } />
      <Route path="/user-manager/:userId" element={
        <ProtectedRoute>
         <UserDetail />
        </ProtectedRoute>
      } />
      <Route path="/user-manager/create" element={
        <ProtectedRoute>
         <CreateUser />
        </ProtectedRoute>
      } />
      <Route path="/conges/:id" element={
        <ProtectedRoute>
         <CongeDetail />
        </ProtectedRoute>
      } />
      <Route path="/manager" element={
        <ProtectedRoute>
          <Manager />
        </ProtectedRoute>
      } />

      <Route path="/reunions/create" element={
        <ProtectedRoute>
          <CreateReunion />
        </ProtectedRoute>
      } />

      <Route path="/reunions" element={
        <ProtectedRoute>
          <Reunions />
        </ProtectedRoute>
      } />
      
      <Route path="/demande-conge" element={
        <ProtectedRoute>
          <DemandeConge />
        </ProtectedRoute>
      } />
      
      <Route path="/demande-conge/:matricule" element={
        <ProtectedRoute>
          <DemandeCongeWrapper />
        </ProtectedRoute>
      } />
      
      <Route path="/gestion-conges/:matricule" element={
        <ProtectedRoute>
          <GestionCongesWrapper />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App