import Image from "next/image";
import Hero3D from "@/components/marketing/Hero3D";
import Reveal from "@/components/marketing/Reveal";
import BrowserFrame from "@/components/marketing/BrowserFrame";

const features = [
  {
    label: "Employees",
    eyebrow: "RECORDS",
    title: "One directory for your whole team.",
    desc: "Every employee's role, department, contact details, and employment history in one searchable place — instead of scattered spreadsheets nobody's sure is current.",
    points: ["Role & department at a glance", "Self-service portal invites", "Full employment history"],
    img: "/marketing/employees.png",
    imgAlt: "HRhub employee directory showing a list of staff with roles and departments",
    aspect: "1573/927",
  },
  {
    label: "Payroll",
    eyebrow: "PAYROLL",
    title: "Payroll that runs itself.",
    desc: "Set a salary structure once — base, allowances, pension — and HRhub calculates PAYE and net pay automatically for every run. No more rebuilding the same spreadsheet formula every month.",
    points: ["Automatic PAYE & pension calculation", "One run, every payslip at once", "Editable before anything is final"],
    img: "/marketing/payroll.png",
    imgAlt: "HRhub payroll page showing a paid payroll run and per-employee salary structures",
    aspect: "1618/912",
  },
  {
    label: "Recruitment",
    eyebrow: "HIRING",
    title: "Hiring, without the spreadsheet chaos.",
    desc: "Requisition, approval, job posting, and every applicant's stage — from applied to offer — tracked in one pipeline your whole hiring team can see.",
    points: ["Approval workflow before a role goes live", "Applicant pipeline by stage", "Interview scheduling built in"],
    img: "/marketing/recruitment.png",
    imgAlt: "HRhub recruitment page showing open job postings and applicant counts",
    aspect: "1623/926",
  },
  {
    label: "Onboarding",
    eyebrow: "ONBOARDING",
    title: "New hires, set up from day one.",
    desc: "A checklist per new hire — contract, equipment, benefits — assigned automatically and tracked to completion, so nothing falls through the cracks in someone's first week.",
    points: ["Checklists assigned automatically", "Progress visible across the whole team", "Customizable per company"],
    img: "/marketing/onboarding.png",
    imgAlt: "HRhub onboarding page showing team onboarding progress checklists",
    aspect: "1615/912",
  },
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
            built for your business — records, leave, payroll, and hiring,
            all in one place.
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

      {/* PRODUCT PREVIEW — the first real proof, right after the hero */}
      <section className="px-6 -mt-16 md:-mt-24 relative z-10">
        <Reveal className="max-w-4xl mx-auto">
          <BrowserFrame
            src="/marketing/overview.png"
            alt="HRhub dashboard overview showing active employees, pending leave requests, and upcoming birthdays"
            aspect="1920/917"
            sizes="(max-width: 944px) calc(100vw - 48px), 896px"
          />
        </Reveal>
      </section>

      {/* PROBLEM / SOLUTION — asymmetric, left-anchored eyebrow */}
      <section className="pt-24 pb-32 px-6">
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

      {/* FEATURES — alternating image/text, each backed by a real screenshot */}
      <section id="modules" className="py-8 px-6 bg-[var(--color-violet-tint)]">
        <div className="max-w-5xl mx-auto text-center pt-16 pb-4">
          <Reveal>
            <p className="font-mono text-xs tracking-widest text-[var(--color-accent)]">
              WHAT'S INCLUDED
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold mt-3">
              Four modules. One login.
            </h2>
          </Reveal>
        </div>

        <div className="max-w-5xl mx-auto">
          {features.map((f, i) => (
            <div
              key={f.label}
              className="py-20 grid md:grid-cols-2 gap-10 md:gap-16 items-center"
            >
              <Reveal
                className={i % 2 === 1 ? "md:order-2" : ""}
              >
                <BrowserFrame src={f.img} alt={f.imgAlt} aspect={f.aspect} />
              </Reveal>

              <Reveal delay={80} className={i % 2 === 1 ? "md:order-1" : ""}>
                <p className="font-mono text-xs tracking-widest text-[var(--color-accent)]">
                  {f.eyebrow}
                </p>
                <h3 className="font-display text-2xl md:text-3xl font-semibold mt-3">
                  {f.title}
                </h3>
                <p className="mt-4 text-[var(--color-text-muted)] leading-relaxed">
                  {f.desc}
                </p>
                <ul className="mt-6 space-y-2.5">
                  {f.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm">
                      <span
                        className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: "var(--color-primary)" }}
                      />
                      <span className="text-[var(--color-text-primary)]">{p}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          ))}
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
