import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LayoutGrid, Users, GitBranch, ListChecks, Mail, Sparkles, LogOut } from "lucide-react";

const navItems = [
    { to: "/app", label: "Dashboard", icon: LayoutGrid, end: true, testid: "nav-dashboard" },
    { to: "/app/contacts", label: "Contacts", icon: Users, testid: "nav-contacts" },
    { to: "/app/pipeline", label: "Pipeline", icon: GitBranch, testid: "nav-pipeline" },
    { to: "/app/activities", label: "Activities", icon: ListChecks, testid: "nav-activities" },
    { to: "/app/emails", label: "Emails", icon: Mail, testid: "nav-emails" },
    { to: "/app/assistant", label: "AI Assistant", icon: Sparkles, testid: "nav-assistant" },
];

const AppShell = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-bg flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r-2 border-ink flex flex-col sticky top-0 h-screen">
                <div className="p-5 border-b-2 border-ink">
                    <div className="font-heading font-black text-xl flex items-center gap-2">
                        <span className="inline-block w-3 h-3 bg-brand"></span> PULSE/CRM
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-inkSecondary mt-1">v1.0 / operator</div>
                </div>
                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map(({ to, label, icon: Icon, end, testid }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            data-testid={testid}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 text-sm font-bold uppercase tracking-wider border-l-2 transition-all ${
                                    isActive
                                        ? "bg-bg border-brand text-ink"
                                        : "border-transparent text-inkSecondary hover:text-ink hover:bg-bg"
                                }`
                            }
                        >
                            <Icon className="w-4 h-4" strokeWidth={2.5} />
                            <span className="text-xs">{label}</span>
                        </NavLink>
                    ))}
                </nav>
                <div className="border-t-2 border-ink p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-ink text-white grid place-items-center font-heading font-bold text-sm">
                            {(user?.name || "?").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate" data-testid="user-name">{user?.name}</div>
                            <div className="text-[10px] font-mono text-inkSecondary truncate">{user?.email}</div>
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
