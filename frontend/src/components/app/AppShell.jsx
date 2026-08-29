import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LayoutGrid, Users, GitBranch, ListChecks, Mail, Sparkles, LogOut, LifeBuoy, Radio, Settings as SettingsIcon, MessageCircle, Megaphone, Inbox, FileText, Bot, Phone, Search, Plus, Menu, X } from "lucide-react";
import { useState } from "react";

const groups = [
    { label: "Overview", items: [{ to: "/app", label: "Today", icon: LayoutGrid, end: true, testid: "nav-dashboard" }, { to: "/app/analytics", label: "Analytics", icon: GitBranch, testid: "nav-analytics" }] },
    { label: "Customer growth", items: [{ to: "/app/contacts", label: "Customers", icon: Users, testid: "nav-contacts" }, { to: "/app/pipeline", label: "Leads & pipeline", icon: GitBranch, testid: "nav-pipeline" }, { to: "/app/activities", label: "Tasks & follow-ups", icon: ListChecks, testid: "nav-activities" }] },
    { label: "Communications", items: [{ to: "/app/inbox", label: "Unified inbox", icon: Inbox, testid: "nav-inbox" }, { to: "/app/whatsapp", label: "WhatsApp", icon: MessageCircle, testid: "nav-whatsapp" }, { to: "/app/emails", label: "Email", icon: Mail, testid: "nav-emails" }, { to: "/app/calls", label: "Calls & IVR", icon: Phone, testid: "nav-calls" }, { to: "/app/campaigns", label: "Campaigns", icon: Megaphone, testid: "nav-campaigns" }, { to: "/app/templates", label: "Templates", icon: FileText, testid: "nav-templates" }] },
    { label: "Operations", items: [{ to: "/app/tickets", label: "Tickets", icon: LifeBuoy, testid: "nav-tickets" }, { to: "/app/automations", label: "Automations", icon: Bot, testid: "nav-automations" }, { to: "/app/knowledge", label: "Knowledge base", icon: FileText, testid: "nav-knowledge" }, { to: "/app/channels", label: "Integrations", icon: Radio, testid: "nav-channels" }, { to: "/app/assistant", label: "AI assistant", icon: Sparkles, testid: "nav-assistant" }, { to: "/app/settings", label: "Settings", icon: SettingsIcon, testid: "nav-settings", perm: "settings.manage" }] },
];

const AppShell = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const initials = (user?.name || "?").slice(0, 1).toUpperCase();
    const nav = <>
        <div className="flex items-center justify-between border-b border-border p-5 md:p-6">
            <button onClick={() => navigate("/app")} className="flex items-center gap-3 text-left" aria-label="Go to dashboard">
                <span className="grid size-9 place-items-center rounded-xl bg-brand text-white font-heading font-black shadow-[3px_3px_0_var(--blue)]">B</span>
                <span><span className="block font-heading text-lg font-black tracking-tight">BillByteKOT</span><span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-inkSecondary">customer ops</span></span>
            </button>
            <button className="md:hidden text-inkSecondary" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-xs text-inkSecondary"><Search className="size-3.5" /><span>Search customers</span><kbd className="ml-auto rounded border border-border px-1.5 py-0.5 font-mono text-[9px]">⌘ K</kbd></div>
            {groups.map((group) => <div key={group.label} className="mb-5"><div className="px-3 pb-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-inkSecondary">{group.label}</div><div className="flex flex-col gap-1">{group.items.map(({ to, label, icon: Icon, end, testid, perm }) => { if (perm && !(user?.permissions || []).includes(perm)) return null; return <NavLink key={to} to={to} end={end} data-testid={testid} onClick={() => setMobileOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${isActive ? "bg-ink text-white" : "text-inkSecondary hover:bg-bg hover:text-ink"}`}><Icon className="size-4" strokeWidth={2.3} /><span>{label}</span></NavLink>; })}</div></div>)}
        </div>
        <div className="border-t border-border p-4"><button onClick={() => navigate("/app/contacts?new=1")} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 py-3 text-xs font-bold text-white hover:bg-brand-hover"><Plus className="size-4" /> Add customer</button><div className="mb-3 flex items-center gap-3 rounded-xl bg-bg p-3"><div className="grid size-8 place-items-center rounded-lg bg-ink font-heading font-bold text-white">{initials}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{user?.name}</div><div className="truncate font-mono text-[9px] text-inkSecondary">{user?.email}</div></div></div><button data-testid="logout-btn" onClick={() => { logout(); navigate("/"); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-xs font-bold text-inkSecondary hover:border-ink hover:bg-ink hover:text-white"><LogOut className="size-3.5" /> Sign out</button></div>
    </>;
    return <div className="min-h-screen bg-bg selection:bg-brand selection:text-white"><aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-border bg-surface md:flex">{nav}</aside>{mobileOpen && <aside className="fixed inset-0 z-40 flex w-[min(88vw,22rem)] flex-col border-r border-border bg-surface md:hidden">{nav}</aside>}<main className="min-w-0 md:pl-72"><header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:hidden"><button onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button><span className="font-heading font-black">BillByteKOT</span><button onClick={() => navigate("/app/contacts?new=1")} aria-label="Add customer"><Plus /></button></header><Outlet /></main></div>;
};
export default AppShell;
