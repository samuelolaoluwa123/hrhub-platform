import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Privacy & Data Processing Notice — HRhub",
};

// Phase 13 — required by the platform, written honestly against what
// the product actually does today (see the section list below), not
// generic boilerplate. Explicitly not legal advice, and says so —
// HRhub is a data processor acting on behalf of each client company
// (the data controller for its own employees' records); each client
// company's exact obligations under Nigeria's Data Protection Act and
// the NDPC's registration framework depend on that company's own
// entity type, processing volume, and activities, and should be
// confirmed with a qualified Nigerian privacy professional — not
// assumed from this notice or from HRhub as a vendor.
export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--color-surface)]">
      <header className="border-b border-black/[0.06] px-6 py-5">
        <Link href="/" className="inline-block">
          <Image src="/hrhub-logo-full-color.png" alt="HRhub" width={92} height={29} className="h-6 w-auto" />
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-14">
        <p className="font-mono text-[11px] tracking-wide text-[var(--color-accent)]">DATA PROTECTION</p>
        <h1 className="font-display text-3xl font-semibold text-[var(--color-text-primary)] mt-1 mb-2">
          Privacy &amp; Data Processing Notice
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-10">Last updated 7 September 2026</p>

        <Notice />

        <Section title="Who this notice covers">
          <p>
            HRhub is HR software used by companies (each a <strong>client company</strong>) to manage their own
            employees. For the personal data described below, each client company is the{" "}
            <strong>data controller</strong> — they decide what data is collected and why — and HRhub acts as the{" "}
            <strong>data processor</strong>, storing and processing that data on the client company's behalf,
            under their instruction.
          </p>
          <p>
            If you're an employee using HRhub, your employer (the client company) is who you should contact first
            about your own data. If you're a client company evaluating or using HRhub, this notice describes how
            HRhub itself handles the data you and your employees put into it.
          </p>
        </Section>

        <Section title="What personal data HRhub processes">
          <p>Depending on which features a client company uses, HRhub may hold, on their behalf:</p>
          <ul>
            <li>Names, addresses, phone numbers, and emergency contact details</li>
            <li>Government-issued ID and passport photographs, uploaded as identity/onboarding documents</li>
            <li>Medical records, where an employer requires them for onboarding or leave purposes</li>
            <li>Bank account details, for salary payment</li>
            <li>Salary, allowances, deductions, and payroll history</li>
            <li>Employment history — job title, department, employment dates, performance reviews</li>
            <li>
              Attendance records, including a self-declared work location, IP address, and device information
              captured at clock-in/out (used only to flag mismatches for HR review — never GPS location)
            </li>
          </ul>
        </Section>

        <Section title="Why this data is processed">
          <p>
            Solely to provide the HR functions a client company has configured — payroll, leave management,
            recruitment, onboarding, performance reviews, attendance tracking, and internal communication. HRhub
            does not sell personal data, and does not use it for advertising or for any purpose the client
            company hasn't set the software up to do.
          </p>
        </Section>

        <Section title="How this data is protected">
          <p>Concretely, as implemented in the platform:</p>
          <ul>
            <li>
              Every client company's data is isolated from every other's at the database level — access is
              scoped to your own company on every request, not just hidden by the interface.
            </li>
            <li>
              Sensitive fields carry extra restriction beyond general company access — for example, medical
              records are visible only to a company's administrators, not general managers.
            </li>
            <li>
              Uploaded documents (ID, passport photos, medical records, bank evidence) are stored privately, never
              behind a public or guessable link. Viewing one issues a temporary, single-purpose link that expires
              within a minute.
            </li>
            <li>
              Changes to sensitive fields — salary, bank account details, employment status — are permanently
              recorded in an internal audit trail, visible to that company's administrators.
            </li>
            <li>
              When an employee leaves a company, their login access is disabled as part of recording that exit.
            </li>
          </ul>
        </Section>

        <Section title="Data retention">
          <p>
            Employment, payroll, and audit records are generally retained for as long as a client company's
            account is active, and for a period afterward consistent with standard recordkeeping and statutory
            obligations (for example, tax and payroll records). A client company's administrators can request
            deletion of a specific former employee's sensitive documents (photographs, ID, medical records) once
            it has confirmed that its own retention obligations have been satisfied.
          </p>
          <p>
            <strong>
              HRhub does not set retention periods on a client company's behalf. Exact retention obligations
              depend on that company's legal status, sector, and the nature of the data involved, and should be
              confirmed directly with a qualified Nigerian privacy professional.
            </strong>
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            If you're an employee and want to access, correct, or ask about the deletion of your own data, contact
            your employer (the client company) directly — they control that data and are best placed to act on
            it. If your employer needs to reach HRhub directly about how their account's data is handled, use the
            contact below.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For questions about this notice or how HRhub processes data on a client company's behalf, contact{" "}
            <a href="mailto:nwosasamuel123@gmail.com" className="text-[var(--color-primary)] hover:underline">
              nwosasamuel123@gmail.com
            </a>
            .
          </p>
        </Section>

        <div className="mt-14 pt-8 border-t border-black/[0.06]">
          <Notice compact />
        </div>
      </div>
    </main>
  );
}

function Notice({ compact = false }) {
  return (
    <div
      className={`rounded-2xl border border-[#f0d98c] bg-[#fef9ec] text-[#7a5f12] ${compact ? "p-4 text-xs" : "p-5 text-sm mb-10"}`}
    >
      <p className="font-semibold mb-1">This is a compliance summary, not legal advice.</p>
      <p>
        Nigeria's Data Protection Act and the Nigeria Data Protection Commission (NDPC) set out registration and
        compliance requirements for data controllers and processors, based on the specific entity, its processing
        activities, and its classification — not assumed from a template like this one. Each client company using
        HRhub should confirm its own exact obligations with a qualified Nigerian privacy professional.
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-3">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-[var(--color-text-primary)]/90 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:font-semibold">
        {children}
      </div>
    </section>
  );
}
