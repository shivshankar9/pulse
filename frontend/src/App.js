import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
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
import Tickets from "./pages/Tickets";
import Channels from "./pages/Channels";
import PublicSupport from "./pages/PublicSupport";
import "./App.css";

const Protected = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="min-h-screen grid place-items-center font-mono text-sm">LOADING…</div>;
    if (!user) return <Navigate to="/auth" replace />;
    return children;
};

function App() {
    return (
        <AuthProvider>
            <Toaster position="top-right" toastOptions={{ style: { borderRadius: 0, border: '1px solid #0A0A0A', fontFamily: 'Satoshi' } }} />
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/support" element={<PublicSupport />} />
                    <Route element={<Protected><AppShell /></Protected>}>
                        <Route path="/app" element={<Dashboard />} />
                        <Route path="/app/contacts" element={<Contacts />} />
                        <Route path="/app/pipeline" element={<Pipeline />} />
                        <Route path="/app/activities" element={<Activities />} />
                        <Route path="/app/emails" element={<Emails />} />
                        <Route path="/app/tickets" element={<Tickets />} />
                        <Route path="/app/channels" element={<Channels />} />
                        <Route path="/app/assistant" element={<AIAssistant />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
