import Image from "next/image";
import Hero3D from "@/components/marketing/Hero3D";
import Reveal from "@/components/marketing/Reveal";

const modules = [
  { label: "Records", name: "Employee Records", desc: "Profiles, contracts, and documents in one place instead of scattered folders." },
  { label: "Leave", name: "Leave Management", desc: "Request, approve, and track balances — no more spreadsheet tallies." },
  { label: "Payroll", name: "Payslips", desc: "Payroll input in, downloadable payslips out, automatically." },
  { label: "Onboarding", name: "Onboarding", desc: "A checklist per new hire, customized per company." },
];

export default function LandingPage() {
  return (
    <main>
      {/* HERO */}
      <section className="relative h-screen overflow-hidden bg-[var(--color-hero-bg)]">
        <Hero3D />

        <div className="absolute top-6 left-6 md:top-8 md:left-10 z-10">
          <Image
            src="/hrhub-logo-white.png"
            alt="HRhub"
            width={110}
            height={35}
            priority
            className="h-7 md:h-8 w-auto"
          />
        </div>

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <p className="font-mono text-xs tracking-widest text-[var(--color-primary-light)] mb-4">
            HR, ORGANIZED
          </p>
          <h1 className="font-display text-5xl md:text-7xl font-semibold text-white max-w-3xl leading-tight">
            Your HR paperwork,
            <br />
            finally in order.
          </h1>
          <p className="mt-6 text-lg text-[var(--color-primary-light)] max-w-xl">
            HRhub turns the HR consulting you already trust into software
            built for your business — records, leave, and payroll, all in
            one place.
          </p>
          <a
            href="#modules"
            className="mt-10 rounded-full px-7 py-3 text-white font-medium transition-transform duration-150 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: "var(--color-primary)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            See how it works
          </a>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[var(--color-primary-light)] text-sm font-mono animate-pulse">
          scroll ↓
        </div>
      </section>

      {/* PROBLEM / SOLUTION — asymmetric, left-anchored eyebrow */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-[auto_1fr] gap-6 md:gap-16">
          <Reveal>
            <p className="font-mono text-xs tracking-widest text-[var(--color-accent)] md:pt-2">
              THE PROBLEM
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display text-3xl md:text-4xl font-semibold max-w-xl">
              You've outgrown the spreadsheet.
            </h2>
            <p className="mt-5 text-[var(--color-text-muted)] text-lg leading-relaxed max-w-xl">
              Employee files in one folder, leave requests over WhatsApp,
              payroll in a spreadsheet nobody quite trusts. It works, until
              it doesn't. HRhub is the system your HR consultant already
              knows you need — now something your team can actually log
              into.
            </p>
          </Reveal>
        </div>
      </section>

      {/* MODULES — divider list, not cards, in a sticky two-column layout */}
      <section id="modules" className="py-32 px-6 bg-[var(--color-violet-tint)]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_1.6fr] gap-10 md:gap-16">
          <Reveal>
            <p className="font-mono text-xs tracking-widest text-[var(--color-accent)]">
              WHAT'S INCLUDED
            </p>
            <h2 className="font-display text-3xl font-semibold mt-3">
              Four modules. One login.
            </h2>
          </Reveal>

          <div>
            {modules.map((m, i) => (
              <Reveal key={m.name} delay={i * 70}>
                <div
                  className="group py-7 border-t border-[var(--color-text-primary)]/10 first:border-t-0 md:first:border-t transition-colors duration-200"
                  style={{ transitionTimingFunction: "var(--ease-out)" }}
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-xl font-semibold group-hover:text-[var(--color-primary)] transition-colors duration-200"
                        style={{ transitionTimingFunction: "var(--ease-out)" }}>
                      {m.name}
                    </h3>
                    <span className="font-mono text-xs text-[var(--color-text-muted)] shrink-0 ml-4">
                      {m.label}
                    </span>
                  </div>
                  <p className="mt-2 text-[var(--color-text-muted)] max-w-md">
                    {m.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING — no card, the number itself is the design */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <p className="font-mono text-xs tracking-widest text-[var(--color-accent)]">
              PRICING
            </p>
            <h2 className="font-display text-3xl font-semibold mt-3">
              One flat price. No per-seat surprises.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="font-display text-7xl md:text-8xl font-semibold mt-12">
              ₦20,000
              <span className="text-xl font-normal text-[var(--color-text-muted)]">
                {" "}/month
              </span>
            </p>
            <p className="mt-3 text-[var(--color-text-muted)]">
              up to 15 employees · every module included
            </p>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-[var(--color-hero-bg)] text-center">
        <Reveal>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-white">
            Let's get your HR in order.
          </h2>
          <a
            href="/login"
            className="mt-8 inline-block rounded-full px-7 py-3 text-white font-medium transition-transform duration-150 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: "var(--color-primary)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            Sign in
          </a>
        </Reveal>
      </section>
    </main>
  );
}