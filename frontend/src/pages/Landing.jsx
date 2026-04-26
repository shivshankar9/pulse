import { Link } from "react-router-dom";
import { ArrowUpRight, Zap, Brain, LineChart, Mail, Activity, Sparkles } from "lucide-react";

const Landing = () => {
    return (
        <div className="min-h-screen bg-bg text-ink" data-testid="landing-page">
            {/* TOP BAR */}
            <header className="border-b border-ink bg-bg sticky top-0 z-30">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 h-14">
                    <div className="flex items-center gap-2 font-heading font-black tracking-tight text-xl">
                        <span className="inline-block w-3 h-3 bg-brand"></span> PULSE/CRM
                    </div>
                    <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-[0.2em]">
                        <a href="#features" className="hover:text-brand">Features</a>
                        <a href="#agents" className="hover:text-brand">Agents</a>
                        <a href="#pricing" className="hover:text-brand">Pricing</a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <Link to="/auth" className="text-xs font-bold uppercase tracking-[0.2em] hover:text-brand" data-testid="landing-login-link">Sign in</Link>
                        <Link to="/auth?mode=register" data-testid="landing-cta-register" className="bg-ink text-white px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] hover:bg-brand transition-colors">
                            Start free →
                        </Link>
                    </div>
                </div>
                {/* TICKER */}
                <div className="border-t border-ink bg-ink text-bg overflow-hidden">
                    <div className="ticker-track flex whitespace-nowrap py-1.5 font-mono text-[11px] tracking-widest uppercase">
                        {Array.from({length: 2}).map((_, i) => (
                            <div key={i} className="flex items-center">
                                {["AGENT_01.SCORING ONLINE", "AGENT_02.DRAFTING ONLINE", "AGENT_03.SUMMARIZE ONLINE", "AGENT_04.NEXT_BEST_ACTION ONLINE", "PIPELINE.SYNC OK", "LATENCY 142MS", "VERSION 1.0.4"].map((s, j) => (
                                    <span key={j} className="px-6 flex items-center gap-3"><span className="w-1.5 h-1.5 bg-brand inline-block"></span>{s}</span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            {/* HERO */}
            <section className="border-b border-ink relative overflow-hidden grain">
                <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24 grid grid-cols-12 gap-6">
                    <div className="col-span-12 lg:col-span-8">
                        <div className="inline-flex items-center gap-2 border border-ink px-2 py-1 text-[11px] font-mono uppercase tracking-widest mb-6 bg-white">
                            <span className="w-1.5 h-1.5 bg-brand inline-block animate-pulse"></span>
                            v1.0 — Agentic Sales OS
                        </div>
                        <h1 className="font-heading font-black tracking-tighter leading-[0.95] text-5xl sm:text-6xl md:text-7xl lg:text-[88px]">
                            Your sales team,<br/>
                            <span className="bg-ink text-bg px-2">amplified</span> by<br/>
                            <span className="text-brand cursor-blink">autonomous agents</span>
                        </h1>
                        <p className="mt-8 max-w-2xl text-base md:text-lg text-inkSecondary font-medium">
                            Pulse/CRM is the no-fluff CRM where AI agents <span className="text-ink font-bold">score leads</span>,
                            <span className="text-ink font-bold"> draft outreach</span>, and
                            <span className="text-ink font-bold"> tell you exactly what to do next</span> — so you can stop typing and start closing.
                        </p>
                        <div className="mt-10 flex flex-wrap gap-3">
                            <Link to="/auth?mode=register" data-testid="landing-hero-cta" className="group inline-flex items-center gap-2 bg-brand text-white px-6 py-3 font-bold text-sm uppercase tracking-widest brutal-shadow hover:bg-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(10,10,10,1)] transition-all">
                                Launch your CRM <ArrowUpRight className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                            </Link>
                            <a href="#features" className="inline-flex items-center gap-2 bg-white border-2 border-ink text-ink px-6 py-3 font-bold text-sm uppercase tracking-widest brutal-hover">
                                See agents
                            </a>
                        </div>
                        <div className="mt-12 grid grid-cols-3 gap-px bg-ink border border-ink max-w-xl">
                            {[
                                {k: "+38%", v: "reply rate"},
                                {k: "6.4h", v: "saved / rep / week"},
                                {k: "94%", v: "retention"},
                            ].map((s) => (
                                <div key={s.v} className="bg-bg p-4">
                                    <div className="font-heading font-black text-2xl md:text-3xl">{s.k}</div>
                                    <div className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary mt-1">{s.v}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Right: terminal-style mock */}
                    <div className="col-span-12 lg:col-span-4 lg:pl-6">
                        <div className="bg-ink text-bg border border-ink brutal-shadow">
                            <div className="flex items-center justify-between border-b border-bg/30 px-3 py-2 font-mono text-[11px] uppercase tracking-widest">
                                <span>agent.next_best_action</span>
                                <span className="text-brand">● LIVE</span>
                            </div>
                            <pre className="font-mono text-[12px] leading-relaxed p-4 whitespace-pre-wrap">
{`> analyze pipeline
> contact: Acme Corp / J.Reyes
> deal: $42,000 (Negotiation)
> last_touch: 6 days ago

ACTION: send pricing follow-up
WHY:    response window closing
HOW:
  1. recap demo wins
  2. anchor 12-mo plan
  3. offer Q1 discount`}
                            </pre>
                            <div className="border-t border-bg/30 p-3 flex justify-between items-center">
                                <span className="font-mono text-[10px] uppercase tracking-widest text-bg/60">claude-sonnet-4.5</span>
                                <span className="bg-brand text-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest">execute</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* AGENTS / FEATURES */}
            <section id="agents" className="border-b border-ink">
                <div className="max-w-[1400px] mx-auto px-6 py-16">
                    <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
                        <div>
                            <div className="text-xs font-mono uppercase tracking-[0.3em] text-inkSecondary mb-2">// 04 agents on duty</div>
                            <h2 className="font-heading font-black text-4xl md:text-5xl tracking-tighter">Specialists, not chatbots.</h2>
                        </div>
                        <p className="max-w-md text-sm text-inkSecondary">Each agent is purpose-built for one job — and they coordinate through your pipeline.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-ink border border-ink">
                        {[
                            {n: "01", t: "Scoring agent", d: "Ranks every lead 0–100 with reasoning.", icon: Brain},
                            {n: "02", t: "Drafting agent", d: "Writes subject + body in your tone.", icon: Mail},
                            {n: "03", t: "Summary agent", d: "Distills calls and threads to 3 bullets.", icon: Sparkles},
                            {n: "04", t: "Action agent", d: "Tells you the single next move that matters.", icon: Zap},
                        ].map(({n, t, d, icon: Icon}) => (
                            <div key={n} className="bg-bg p-6 hover:bg-brand hover:text-white transition-colors group cursor-pointer">
                                <div className="flex justify-between items-start mb-8">
                                    <span className="font-mono text-xs uppercase tracking-widest opacity-60">agent_{n}</span>
                                    <Icon className="w-5 h-5" strokeWidth={2.5} />
                                </div>
                                <h3 className="font-heading font-bold text-xl mb-2">{t}</h3>
                                <p className="text-sm opacity-80">{d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FEATURE GRID */}
            <section id="features" className="border-b border-ink">
                <div className="max-w-[1400px] mx-auto px-6 py-16 grid grid-cols-12 gap-6">
                    <div className="col-span-12 lg:col-span-5">
                        <div className="text-xs font-mono uppercase tracking-[0.3em] text-inkSecondary mb-2">// the system</div>
                        <h2 className="font-heading font-black text-4xl md:text-5xl tracking-tighter mb-4">A CRM that does the work.</h2>
                        <p className="text-base text-inkSecondary">Pipeline you can actually drag. Tasks that auto-prioritize. Inboxes that explain themselves. Built sharp, on purpose.</p>
                    </div>
                    <div className="col-span-12 lg:col-span-7 grid grid-cols-2 gap-px bg-ink border border-ink">
                        {[
                            {t: "Kanban Pipeline", d: "Visual deal flow with drag/drop stages.", icon: LineChart},
                            {t: "Activities", d: "Tasks, calls, meetings — never miss a follow-up.", icon: Activity},
                            {t: "Email Outreach", d: "Compose with AI, log every send.", icon: Mail},
                            {t: "Insights", d: "Real KPIs. No fluff dashboards.", icon: Brain},
                        ].map((f) => (
                            <div key={f.t} className="bg-bg p-5">
                                <f.icon className="w-5 h-5 mb-4" strokeWidth={2.5} />
                                <div className="font-heading font-bold text-lg mb-1">{f.t}</div>
                                <div className="text-sm text-inkSecondary">{f.d}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="border-b border-ink bg-ink text-bg">
                <div className="max-w-[1400px] mx-auto px-6 py-16 grid grid-cols-12 gap-6 items-center">
                    <h2 className="col-span-12 lg:col-span-8 font-heading font-black text-4xl md:text-6xl tracking-tighter">
                        Ship the quota,<br/><span className="text-brand">not the busywork.</span>
                    </h2>
                    <div className="col-span-12 lg:col-span-4">
                        <Link to="/auth?mode=register" data-testid="landing-bottom-cta" className="block text-center bg-brand text-white px-6 py-5 font-bold uppercase tracking-widest hover:bg-bg hover:text-ink transition-colors">
                            Start free — no card →
                        </Link>
                        <p className="text-xs font-mono uppercase tracking-widest text-bg/60 mt-3 text-center">7-day setup-free trial</p>
                    </div>
                </div>
            </section>

            <footer className="bg-bg">
                <div className="max-w-[1400px] mx-auto px-6 py-8 flex justify-between items-center text-xs font-mono uppercase tracking-widest text-inkSecondary">
                    <span>© Pulse/CRM 2026</span>
                    <span>built for ops that ship.</span>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
