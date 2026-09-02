"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendNotificationEmail } from "@/lib/sendNotificationEmail";

const STATUSES = ["applied", "screening", "shortlisted", "interview", "selected", "offer", "hired", "rejected", "withdrawn"];
const STATUS_LABEL = {
  applied: "Applied", screening: "Screening", shortlisted: "Shortlisted", interview: "Interview",
  selected: "Selected", offer: "Offer", hired: "Hired", rejected: "Rejected", withdrawn: "Withdrawn",
};
const RECOMMENDATION_LABEL = { strong_hire: "Strong Hire", hire: "Hire", maybe: "Maybe", no_hire: "No Hire" };
const RECOMMENDATION_BADGE = {
  strong_hire: "bg-[#e8f9f0] text-[#1a9c5f]",
  hire: "bg-[#e8f9f0] text-[#1a9c5f]",
  maybe: "bg-[#fef3e2] text-[#d68a1f]",
  no_hire: "bg-[#fde8e8] text-[#cc3333]",
};

function inputClass() {
  return "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
}
function focusRing(e) { e.target.style.boxShadow = "0 0 0 2px var(--color-accent)"; }
function clearRing(e) { e.target.style.boxShadow = "none"; }

export default function ApplicationDrawer({ open, onClose, onSaved, application: app, postingTitle, panelCandidates, companyId, profileId }) {
  const supabase = createClient();
  const candidate = app.candidates;

  const [status, setStatus] = useState(app.status);
  const [score, setScore] = useState(app.score ?? 0);
  const [notes, setNotes] = useState(app.notes ?? "");
  const [savingMain, setSavingMain] = useState(false);
  const [hiring, setHiring] = useState(false);
  const [hireStartDate, setHireStartDate] = useState(new Date().toISOString().slice(0, 10));

  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [mode, setMode] = useState("video");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [ivNotes, setIvNotes] = useState("");
  const [panelSelection, setPanelSelection] = useState([]);
  const [savingInterview, setSavingInterview] = useState(false);

  const [offeredSalary, setOfferedSalary] = useState(app.offered_salary ?? "");
  const [offerStatus, setOfferStatus] = useState(app.offer_status ?? "");
  const [savingOffer, setSavingOffer] = useState(false);

  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  const [downloadingResume, setDownloadingResume] = useState(false);
  const [error, setError] = useState(null);

  function togglePanelist(id) {
    setPanelSelection((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));
  }

  async function handleSaveMain() {
    // 4.8 — "Hired" isn't a label change. It runs the hire_candidate()
    // RPC (admin/manager only, enforced server-side) which atomically
    // creates the real employee record, assigns onboarding, and links
    // this application to it for traceability — all in one transaction.
    if (status === "hired" && app.status !== "hired") {
      setHiring(true);
      setError(null);
      const { error: rpcError } = await supabase.rpc("hire_candidate", {
        p_application_id: app.id,
        p_start_date: hireStartDate,
      });
      setHiring(false);
      if (rpcError) { setError(rpcError.message); return; }
      onSaved();
      return;
    }

    setSavingMain(true);
    setError(null);
    const { error: dbError } = await supabase
      .from("applications")
      .update({ status, score: score || null, notes: notes || null })
      .eq("id", app.id);
    setSavingMain(false);
    if (dbError) { setError(dbError.message); return; }
    onSaved();
  }

  async function handleScheduleInterview(e) {
    e.preventDefault();
    setSavingInterview(true);
    setError(null);

    const { data: interview, error: ivError } = await supabase
      .from("interviews")
      .insert({
        company_id: companyId,
        application_id: app.id,
        scheduled_at: new Date(scheduledAt).toISOString(),
        mode,
        duration_minutes: Number(duration) || 60,
        location: location || null,
        notes: ivNotes || null,
      })
      .select("id")
      .single();

    if (ivError || !interview) {
      setSavingInterview(false);
      setError(ivError?.message ?? "Couldn't schedule the interview.");
      return;
    }

    if (panelSelection.length) {
      await supabase.from("interview_panelists").insert(
        panelSelection.map((pid) => ({
          company_id: companyId,
          interview_id: interview.id,
          profile_id: pid,
          added_by: profileId,
        }))
      );

      // 4.4 — every selected panelist is notified in-app and by email,
      // with everything they need (candidate, position, when, how
      // long, where, who else is on the panel) to show up prepared.
      const whenLabel = new Date(scheduledAt).toLocaleString("en-US", {
        weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
      const panelists = panelCandidates.filter((p) => panelSelection.includes(p.id));
      const allNames = panelists.map((p) => p.full_name);
      const message = `You've been assigned to an interview panel — ${candidate.first_name} ${candidate.last_name} for ${postingTitle || "an open role"}, ${whenLabel} (${duration} min).`;

      await supabase.from("notifications").insert(
        panelists.map((p) => ({
          company_id: companyId,
          profile_id: p.id,
          type: "interview",
          message,
          link: "/dashboard/interview-panel",
        }))
      );

      panelists.forEach((p) => {
        if (!p.email) return;
        const others = allNames.filter((n) => n !== p.full_name);
        sendNotificationEmail({
          to: p.email,
          subject: `Interview panel assignment — ${candidate.first_name} ${candidate.last_name}`,
          message: `${message}\n\nOther panel members: ${others.length ? others.join(", ") : "just you"}.${location ? `\nLocation/link: ${location}` : ""}${ivNotes ? `\nNotes: ${ivNotes}` : ""}`,
          link: "/dashboard/interview-panel",
        });
      });
    }

    setSavingInterview(false);
    setScheduledAt("");
    setLocation("");
    setIvNotes("");
    setDuration(60);
    setPanelSelection([]);
    setShowSchedule(false);
    onSaved();
  }

  async function handleSaveOffer() {
    setSavingOffer(true);
    setError(null);
    const { error: dbError } = await supabase
      .from("applications")
      .update({
        offered_salary: offeredSalary ? Number(offeredSalary) : null,
        offer_status: offerStatus || null,
        offer_sent_at: new Date().toISOString(),
        status: "offer",
      })
      .eq("id", app.id);
    setSavingOffer(false);
    if (dbError) { setError(dbError.message); return; }
    setStatus("offer");
    onSaved();
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    setSendingMessage(true);
    setError(null);
    await sendNotificationEmail({ to: candidate.email, subject: messageSubject, message: messageBody });
    setSendingMessage(false);
    setMessageSent(true);
    setMessageSubject("");
    setMessageBody("");
  }

  async function handleDownloadResume() {
    setDownloadingResume(true);
    const { data, error: dlError } = await supabase.storage.from("candidate-resumes").createSignedUrl(candidate.resume_path, 60);
    setDownloadingResume(false);
    if (dlError || !data?.signedUrl) { setError("Couldn't open the resume."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (!open) return null;

  const isHiring = status === "hired" && app.status !== "hired";

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[460px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)] space-y-7">
        <div>
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">{candidate.first_name} {candidate.last_name}</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{candidate.email}{candidate.phone ? ` · ${candidate.phone}` : ""}</p>
          {candidate.resume_path && (
            <button onClick={handleDownloadResume} disabled={downloadingResume} className="mt-2 text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150 disabled:opacity-50" style={{ transitionTimingFunction: "var(--ease-out)" }}>
              {downloadingResume ? "Opening..." : "View resume"}
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Status, score, notes */}
        <div className="space-y-3 border-t border-black/[0.06] pt-5">
          <p className="text-xs font-semibold tracking-wide uppercase text-[var(--color-accent)]">Pipeline</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass()} onFocus={focusRing} onBlur={clearRing}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Score</label>
              <select value={score} onChange={(e) => setScore(Number(e.target.value))} className={inputClass()} onFocus={focusRing} onBlur={clearRing}>
                <option value={0}>Not scored</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}
              </select>
            </div>
          </div>

          {isHiring && (
            <div className="bg-[var(--color-violet-tint)] rounded-lg p-3">
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Start date</label>
              <input type="date" value={hireStartDate} onChange={(e) => setHireStartDate(e.target.value)} className={`${inputClass()} bg-white`} onFocus={focusRing} onBlur={clearRing} />
              <p className="text-[10.5px] text-[var(--color-text-muted)] mt-1.5">
                This creates a real employee record for {candidate.first_name} and assigns onboarding — not just a status change.
              </p>
            </div>
          )}

          {app.status === "hired" && (
            <p className="text-xs font-medium text-[#1a9c5f]">✓ Hired — employee record created.</p>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass()} onFocus={focusRing} onBlur={clearRing} />
          </div>
          <button onClick={handleSaveMain} disabled={savingMain || hiring} className="text-sm font-medium px-4 py-2 rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: "var(--color-primary)" }}>
            {hiring ? "Creating employee..." : savingMain ? "Saving..." : isHiring ? "Hire & create employee" : "Save"}
          </button>
        </div>

        {/* Interviews */}
        <div className="space-y-3 border-t border-black/[0.06] pt-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide uppercase text-[var(--color-accent)]">Interviews</p>
            <button onClick={() => setShowSchedule((v) => !v)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
              {showSchedule ? "Cancel" : "+ Schedule"}
            </button>
          </div>

          {showSchedule && (
            <form onSubmit={handleScheduleInterview} className="space-y-2.5 bg-[var(--color-violet-tint)] rounded-lg p-3.5">
              <input type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={`${inputClass()} bg-white`} onFocus={focusRing} onBlur={clearRing} />
              <div className="grid grid-cols-2 gap-2.5">
                <select value={mode} onChange={(e) => setMode(e.target.value)} className={`${inputClass()} bg-white`} onFocus={focusRing} onBlur={clearRing}>
                  <option value="video">Video</option>
                  <option value="phone">Phone</option>
                  <option value="in_person">In person</option>
                </select>
                <input
                  type="number" min="15" step="15" required value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Minutes"
                  className={`${inputClass()} bg-white`} onFocus={focusRing} onBlur={clearRing}
                />
              </div>
              <input
                type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="Location or meeting link"
                className={`${inputClass()} bg-white`} onFocus={focusRing} onBlur={clearRing}
              />
              <textarea
                value={ivNotes} onChange={(e) => setIvNotes(e.target.value)}
                placeholder="Notes for the panel" rows={2}
                className={`${inputClass()} bg-white`} onFocus={focusRing} onBlur={clearRing}
              />

              <div>
                <p className="text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Panel</p>
                <div className="max-h-36 overflow-y-auto space-y-0.5 bg-white rounded-lg p-2 border border-black/10">
                  {panelCandidates.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)] py-1">No one else in the company yet.</p>
                  ) : (
                    panelCandidates.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-xs py-1 cursor-pointer">
                        <input type="checkbox" checked={panelSelection.includes(p.id)} onChange={() => togglePanelist(p.id)} />
                        <span className="text-[var(--color-text-primary)]">{p.full_name}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] capitalize ml-auto">{p.role}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button type="submit" disabled={savingInterview} className="w-full text-sm font-medium py-2 rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: "var(--color-primary)" }}>
                {savingInterview ? "Scheduling..." : "Confirm & notify panel"}
              </button>
            </form>
          )}

          {(app.interviews ?? []).length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">None scheduled yet.</p>
          ) : (
            <div className="space-y-2.5">
              {app.interviews.map((iv) => (
                <InterviewRow key={iv.id} interview={iv} />
              ))}
            </div>
          )}
        </div>

        {/* Offer */}
        <div className="space-y-3 border-t border-black/[0.06] pt-5">
          <p className="text-xs font-semibold tracking-wide uppercase text-[var(--color-accent)]">Offer</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Salary (₦)</label>
              <input type="number" min="0" value={offeredSalary} onChange={(e) => setOfferedSalary(e.target.value)} className={inputClass()} onFocus={focusRing} onBlur={clearRing} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Offer status</label>
              <select value={offerStatus} onChange={(e) => setOfferStatus(e.target.value)} className={inputClass()} onFocus={focusRing} onBlur={clearRing}>
                <option value="">Not sent</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          </div>
          <button onClick={handleSaveOffer} disabled={savingOffer} className="text-sm font-medium px-4 py-2 rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: "var(--color-primary)" }}>
            {savingOffer ? "Saving..." : "Save offer"}
          </button>
        </div>

        {/* Communication */}
        <div className="space-y-3 border-t border-black/[0.06] pt-5 pb-2">
          <p className="text-xs font-semibold tracking-wide uppercase text-[var(--color-accent)]">Message candidate</p>
          <form onSubmit={handleSendMessage} className="space-y-2.5">
            <input type="text" required placeholder="Subject" value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} className={inputClass()} onFocus={focusRing} onBlur={clearRing} />
            <textarea required placeholder="Message" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} rows={3} className={inputClass()} onFocus={focusRing} onBlur={clearRing} />
            <button type="submit" disabled={sendingMessage} className="text-sm font-medium px-4 py-2 rounded-lg border border-black/10 text-[var(--color-text-primary)] hover:bg-black/[0.03] disabled:opacity-60">
              {sendingMessage ? "Sending..." : "Send email"}
            </button>
            {messageSent && <p className="text-xs text-[#1a9c5f]">Sent to {candidate.email}.</p>}
          </form>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// 4.6/4.7 — each interview shows its full schedule detail, the panel
// assigned to it, and every panelist's structured scorecard once
// submitted. Admin/manager never fill this in on someone else's
// behalf here — only the real panelist's own logged-in view can
// (components/dashboard/interview-panel), so what's shown is always
// genuinely who evaluated, not HR typing on their behalf.
function InterviewRow({ interview }) {
  const panelists = interview.interview_panelists ?? [];
  const evaluations = interview.interview_evaluations ?? [];

  return (
    <div className="rounded-lg border border-black/[0.06] p-3.5 space-y-2.5">
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          {new Date(interview.scheduled_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          <span className="text-[var(--color-text-muted)] font-normal"> · {interview.duration_minutes} min</span>
        </p>
        <p className="text-xs text-[var(--color-text-muted)] capitalize mt-0.5">
          {interview.mode.replace("_", " ")}{interview.location ? ` · ${interview.location}` : ""} · {interview.status}
        </p>
        {interview.notes && <p className="text-xs text-[var(--color-text-muted)] mt-1">{interview.notes}</p>}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {panelists.length === 0 ? (
          <span className="text-[10.5px] text-[var(--color-text-muted)]">No panel assigned</span>
        ) : (
          panelists.map((p) => (
            <span key={p.id} className="text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)]">
              {p.panelist?.full_name ?? "—"}
            </span>
          ))
        )}
      </div>

      <div className="space-y-2 pt-1">
        {evaluations.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">No evaluations submitted yet.</p>
        ) : (
          evaluations.map((ev) => (
            <div key={ev.id} className="bg-[var(--color-surface)] rounded-md p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[var(--color-text-primary)]">{ev.evaluator?.full_name ?? "—"}</p>
                {ev.recommendation && (
                  <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-md shrink-0 ${RECOMMENDATION_BADGE[ev.recommendation]}`}>
                    {RECOMMENDATION_LABEL[ev.recommendation]}
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-[var(--color-text-muted)] mt-1">
                Technical {ev.technical_score ?? "—"} · Communication {ev.communication_score ?? "—"} · Problem solving {ev.problem_solving_score ?? "—"} · Experience {ev.experience_score ?? "—"} · Culture fit {ev.culture_fit_score ?? "—"}
              </p>
              {ev.comments && <p className="text-xs text-[var(--color-text-primary)] mt-1.5">{ev.comments}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
