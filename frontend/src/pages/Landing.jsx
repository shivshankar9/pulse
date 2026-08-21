import { Link } from "react-router-dom";
import { ArrowUpRight, Check, ChevronRight, Circle, MessageCircle, Sparkles, Users, Zap } from "lucide-react";

const signals = [
    { label: "New conversations", value: "24", detail: "+18% this week", tone: "coral" },
    { label: "Pipeline influenced", value: "$184k", detail: "across 31 opportunities", tone: "blue" },
    { label: "Human time returned", value: "16.8h", detail: "this operating week", tone: "green" },
];

const features = [
    { icon: MessageCircle, title: "One customer thread", text: "WhatsApp, email, tickets, and notes converge into one calm workspace." },
    { icon: Sparkles, title: "Useful automation", text: "Agents surface the next action, draft the reply, and leave the decision with you." },
    { icon: Users, title: "A team memory", text: "Every touchpoint is captured so nobody has to ask what happened last." },
];

const Landing = () => (
    <div className="min-h-screen overflow-hidden bg-bg text-ink" data-testid="landing-page">
        <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
            <Link to="/" className="flex items-center gap-3 font-heading text-lg font-black tracking-tight">
                <span className="grid size-9 place-items-center rounded-xl bg-brand text-sm text-white shadow-[3px_3px_0_var(--blue)]">P</span>
                pulse<span className="font-mono text-xs text-inkSecondary">/ops</span>
            </Link>
            <nav className="hidden items-center gap-8 text-sm font-semibold text-inkSecondary md:flex">
                <a href="#signal" className="transition-colors hover:text-ink">The signal</a>
                <a href="#workflow" className="transition-colors hover:text-ink">How it works</a>
                <a href="#proof" className="transition-colors hover:text-ink">For teams</a>
            </nav>
            <div className="flex items-center gap-3">
                <Link to="/auth" className="hidden text-sm font-semibold text-inkSecondary hover:text-ink sm:block" data-testid="landing-login-link">Sign in</Link>
                <Link to="/auth?mode=register" className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5" data-testid="landing-cta-register">Open Pulse <ArrowUpRight data-icon="inline-end" /></Link>
            </div>
        </header>

        <main>
            <section className="relative mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-20">
                <div className="relative z-10">
                    <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-inkSecondary">
                        <Circle className="size-2 fill-brand text-brand" /> the operating layer for customer teams
                    </div>
                    <h1 className="max-w-3xl font-heading text-5xl font-black leading-[.98] tracking-[-.06em] sm:text-7xl lg:text-[86px]">Make every <span className="text-brand">conversation</span> count.</h1>
                    <p className="mt-7 max-w-xl text-lg leading-8 text-inkSecondary">Pulse turns scattered customer moments into a clear rhythm of follow-ups, decisions, and revenue—without making your team live inside a spreadsheet.</p>
                    <div className="mt-9 flex flex-wrap items-center gap-4">
                        <Link to="/auth?mode=register" className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-white shadow-[5px_5px_0_var(--ink)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_var(--ink)]" data-testid="landing-hero-cta">Start with your signal <ArrowUpRight data-icon="inline-end" /></Link>
                        <a href="#workflow" className="inline-flex items-center gap-2 px-2 py-3.5 text-sm font-bold text-inkSecondary hover:text-ink">See the rhythm <ChevronRight data-icon="inline-end" /></a>
                    </div>
                    <div className="mt-12 flex items-center gap-4 text-sm text-inkSecondary"><div className="flex -space-x-2"><span className="grid size-8 place-items-center rounded-full border-2 border-bg bg-ink text-xs font-bold text-white">AR</span><span className="grid size-8 place-items-center rounded-full border-2 border-bg bg-blue text-xs font-bold text-white">JM</span><span className="grid size-8 place-items-center rounded-full border-2 border-bg bg-brand text-xs font-bold text-white">SK</span></div><span>Built for teams who close the loop.</span></div>
                </div>

                <div className="relative min-h-[470px] lg:min-h-[540px]">
                    <div className="absolute -right-24 -top-16 size-72 rounded-full bg-blue/10 blur-3xl" aria-hidden="true" />
                    <div className="relative mt-8 rotate-1 rounded-[2rem] border border-border bg-surface p-3 shadow-[0_28px_70px_rgba(23,33,43,.14)] lg:mt-0">
                        <div className="rounded-[1.35rem] border border-border bg-bg p-5">
                            <div className="flex items-center justify-between border-b border-border pb-5"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-inkSecondary">Monday / 09:42</div><div className="mt-1 font-heading text-xl font-bold">Your signal, in focus</div></div><div className="grid size-9 place-items-center rounded-full bg-brand text-white"><Zap className="size-4 fill-current" /></div></div>
                            <div className="mt-5 grid gap-3">{signals.map((signal) => <div key={signal.label} className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4"><div><div className="text-sm font-semibold">{signal.label}</div><div className="mt-1 text-xs text-inkSecondary">{signal.detail}</div></div><div className={`font-heading text-2xl font-black ${signal.tone === "coral" ? "text-brand" : signal.tone === "blue" ? "text-blue" : "text-ok"}`}>{signal.value}</div></div>)}</div>
                            <div className="mt-5 rounded-2xl bg-ink p-4 text-white"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-brand"><Sparkles className="size-3.5" /></span> Pulse suggests</div><span className="font-mono text-[10px] uppercase tracking-widest text-white/50">next best action</span></div><p className="mt-4 text-sm leading-6 text-white/75">Follow up with Maya at Northstar while the buying signal is still warm.</p><button className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20">Draft follow-up <ArrowUpRight data-icon="inline-end" /></button></div>
                        </div>
                    </div>
                    <div className="absolute -bottom-2 -left-8 w-56 rounded-2xl border border-border bg-surface p-4 shadow-[0_20px_40px_rgba(23,33,43,.1)]"><div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-widest text-inkSecondary">Response health</span><span className="text-xs font-bold text-ok">Excellent</span></div><div className="mt-3 flex h-8 items-end gap-1">{[30,45,38,58,68,62,90,82,100].map((height, index) => <span key={index} className={`flex-1 rounded-sm ${index > 5 ? "bg-brand" : "bg-blue/30"}`} style={{ height: `${height}%` }} />)}</div></div>
                </div>
            </section>

            <section id="signal" className="border-y border-border bg-surface"><div className="mx-auto grid max-w-7xl gap-px bg-border md:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="bg-surface p-8 lg:p-10"><Icon className="size-5 text-brand" /><h2 className="mt-8 font-heading text-2xl font-bold tracking-tight">{title}</h2><p className="mt-3 max-w-sm leading-7 text-inkSecondary">{text}</p></article>)}</div></section>

            <section id="workflow" className="mx-auto max-w-7xl px-6 py-24 lg:px-10"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start"><div><div className="font-mono text-xs uppercase tracking-[.2em] text-brand">A calmer operating system</div><h2 className="mt-4 max-w-lg font-heading text-4xl font-black tracking-[-.04em] sm:text-6xl">Less hunting. More knowing.</h2><p className="mt-6 max-w-md leading-7 text-inkSecondary">Give your team a shared view of what matters now, what can wait, and where a human decision will unlock momentum.</p></div><div className="grid gap-3">{["Capture every customer moment", "Let Pulse find the thread", "Move with confidence"].map((title, index) => <div key={title} className="flex items-center gap-5 rounded-2xl border border-border bg-surface p-5"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue text-sm font-bold text-white">0{index + 1}</div><div className="flex-1"><div className="font-heading text-lg font-bold">{title}</div><div className="mt-1 text-sm text-inkSecondary">{["Messages, notes, deals, and tasks—without duplicate work.", "Signals are ranked so the important thing rises above the noise.", "Your team sees the context before they make the next move."][index]}</div></div><Check className="size-5 text-ok" /></div>)}</div></div></section>

            <section id="proof" className="mx-6 mb-10 rounded-[2rem] bg-ink px-7 py-14 text-white lg:mx-auto lg:max-w-7xl lg:px-14"><div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]"><div><div className="font-mono text-xs uppercase tracking-[.2em] text-brand">Ready when you are</div><h2 className="mt-4 max-w-2xl font-heading text-4xl font-black tracking-[-.04em] sm:text-6xl">Your best work is already in the room.</h2><p className="mt-5 max-w-xl leading-7 text-white/60">Pulse gives it a place to become visible, useful, and repeatable.</p></div><Link to="/auth?mode=register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-white hover:bg-white hover:text-ink" data-testid="landing-bottom-cta">Open your workspace <ArrowUpRight data-icon="inline-end" /></Link></div></section>
        </main>
        <footer className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 text-xs text-inkSecondary lg:px-10"><span className="font-heading font-bold text-ink">pulse/ops</span><span>Customer operations, with a pulse.</span></footer>
    </div>
);

export default Landing;
