import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "sonner";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AppShell from "./components/app/AppShell";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Pipeline from "./pages/Pipeline";
import Activities from "./pages/Activities";
import Emails from "./pages/Emails";
import AIAssistant from "./pages/AIAssistant";
import Tickets from "./pages/TicketsComplex";
import Channels from "./pages/Channels";
import WhatsAppInbox from "./pages/WhatsApp";
import Settings from "./pages/Settings";
import CRMWorkspace from "./pages/CRMWorkspace";
import PublicSupport from "./pages/PublicSupport";
import AcceptInvite from "./pages/AcceptInvite";
import "./App.css";

const Protected = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="min-h-screen grid place-items-center font-mono text-sm">LOADING…</div>;
    if (!user) return <Navigate to="/auth" replace />;
    return children;
};

function App() {
    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

    if (!googleClientId) {
        console.warn("REACT_APP_GOOGLE_CLIENT_ID not set in environment variables");
    }

    return (
        <GoogleOAuthProvider clientId={googleClientId}>
            <AuthProvider>
                <Toaster position="top-right" toastOptions={{ style: { borderRadius: 0, border: '1px solid #0A0A0A', fontFamily: 'Satoshi' } }} />
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/support" element={<PublicSupport />} />
                        <Route path="/accept-invite" element={<AcceptInvite />} />
                        <Route element={<Protected><AppShell /></Protected>}>
                            <Route path="/app" element={<Dashboard />} />
                            <Route path="/app/contacts" element={<Contacts />} />
                            <Route path="/app/pipeline" element={<Pipeline />} />
                            <Route path="/app/activities" element={<Activities />} />
                            <Route path="/app/emails" element={<Emails />} />
                            <Route path="/app/tickets" element={<Tickets />} />
                            <Route path="/app/channels" element={<Channels />} />
                            <Route path="/app/whatsapp" element={<WhatsAppInbox />} />
                            <Route path="/app/settings" element={<Settings />} />
                            <Route path="/app/assistant" element={<AIAssistant />} />
                            <Route path="/app/inbox" element={<CRMWorkspace type="inbox" />} />
                            <Route path="/app/campaigns" element={<CRMWorkspace type="campaigns" />} />
                            <Route path="/app/templates" element={<CRMWorkspace type="templates" />} />
                            <Route path="/app/analytics" element={<CRMWorkspace type="analytics" />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </GoogleOAuthProvider>
    );
}

export default App;
