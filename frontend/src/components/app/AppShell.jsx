import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LayoutGrid, Users, GitBranch, ListChecks, Mail, Sparkles, LogOut, LifeBuoy, Radio, Settings as SettingsIcon, MessageCircle } from "lucide-react";

const navItems = [
    { to: "/app", label: "Dashboard", icon: LayoutGrid, end: true, testid: "nav-dashboard" },
    { to: "/app/contacts", label: "Contacts", icon: Users, testid: "nav-contacts" },
    { to: "/app/pipeline", label: "Pipeline", icon: GitBranch, testid: "nav-pipeline" },
    { to: "/app/activities", label: "Activities", icon: ListChecks, testid: "nav-activities" },
    { to: "/app/emails", label: "Emails", icon: Mail, testid: "nav-emails" },
    { to: "/app/tickets", label: "Tickets", icon: LifeBuoy, testid: "nav-tickets" },
    { to: "/app/whatsapp", label: "WhatsApp", icon: MessageCircle, testid: "nav-whatsapp" },
    { to: "/app/channels", label: "Channels", icon: Radio, testid: "nav-channels" },
    { to: "/app/assistant", label: "AI Assistant", icon: Sparkles, testid: "nav-assistant" },
    { to: "/app/settings", label: "Settings", icon: SettingsIcon, testid: "nav-settings", perm: "settings.manage" },
];

const AppShell = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-bg flex selection:bg-brand selection:text-white">
            {/* Sidebar */}
            <aside className="w-72 bg-surface border-r border-border flex flex-col sticky top-0 h-screen shadow-[8px_0_30px_rgba(23,33,43,0.04)]">
                <div className="p-6 border-b border-border">
                    <div className="font-heading font-black text-xl flex items-center gap-3 tracking-tight">
                        <span className="inline-grid place-items-center size-8 rounded-lg bg-brand text-white text-xs font-mono">P</span> PULSE
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-inkSecondary mt-2">revenue operations / live</div>
                </div>
                <nav className="flex-1 p-4 flex flex-col gap-1">
                    {navItems.map(({ to, label, icon: Icon, end, testid, perm }) => {
                        if (perm && !(user?.permissions || []).includes(perm)) return null;
                        return (
                            <NavLink
                                key={to}
                                to={to}
                                end={end}
                                data-testid={testid}
                                className={({ isActive }) =>
                                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold tracking-wide transition-all ${
                                        isActive
                                            ? "bg-ink text-white shadow-[3px_3px_0_var(--primary)]"
                                            : "text-inkSecondary hover:text-ink hover:bg-bg"
                                    }`
                                }
                            >
                                <Icon className="w-4 h-4" strokeWidth={2.5} />
                                <span className="text-xs">{label}</span>
                            </NavLink>
                        );
                    })}
                </nav>
                <div className="border-t-2 border-ink p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-ink text-white grid place-items-center font-heading font-bold text-sm">
                            {(user?.name || "?").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate" data-testid="user-name">{user?.name}</div>
                            <div className="text-[10px] font-mono text-inkSecondary truncate">{user?.email}</div>
                            {user?.role_label && <div className="text-[9px] font-mono uppercase tracking-widest text-brand mt-0.5" data-testid="user-role">● {user.role_label}</div>}
                        </div>
                    </div>
                    <button
                        data-testid="logout-btn"
                        onClick={() => { logout(); navigate("/"); }}
                        className="w-full flex items-center justify-center gap-2 border-2 border-ink py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-white transition-colors"
                    >
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 min-w-0 animate-fade-in">
                <Outlet />
            </main>
        </div>
    );
};

export default AppShell;
