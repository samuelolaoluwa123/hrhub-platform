"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendNotificationEmail } from "@/lib/sendNotificationEmail";

const STATUSES = ["applied", "screening", "interview", "offer", "hired", "rejected", "withdrawn"];
const STATUS_LABEL = {
  applied: "Applied", screening: "Screening", interview: "Interview",
  offer: "Offer", hired: "Hired", rejected: "Rejected", withdrawn: "Withdrawn",
};

function inputClass() {
  return "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
}
function focusRing(e) { e.target.style.boxShadow = "0 0 0 2px var(--color-accent)"; }
function clearRing(e) { e.target.style.boxShadow = "none"; }

export default function ApplicationDrawer({ open, onClose, onSaved, application: app, companyId, profileId }) {
  const supabase = createClient();
  const candidate = app.candidates;

  const [status, setStatus] = useState(app.status);
  const [score, setScore] = useState(app.score ?? 0);
  const [notes, setNotes] = useState(app.notes ?? "");
  const [savingMain, setSavingMain] = useState(false);

  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [mode, setMode] = useState("video");
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

  async function handleSaveMain() {
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
    const { error: dbError } = await supabase.from("interviews").insert({
      company_id: companyId,
      application_id: app.id,
      scheduled_at: new Date(scheduledAt).toISOString(),
      mode,
      interviewer_id: profileId,
    });
    setSavingInterview(false);
    if (dbError) { setError(dbError.message); return; }
    setScheduledAt("");
    setShowSchedule(false);
    onSaved();
  }

  async function handleEvaluate(interviewId, rating, feedback) {
    await supabase.from("interviews").update({ rating, feedback, status: "completed" }).eq("id", interviewId);
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
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass()} onFocus={focusRing} onBlur={clearRing} />
          </div>
          <button onClick={handleSaveMain} disabled={savingMain} className="text-sm font-medium px-4 py-2 rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: "var(--color-primary)" }}>
            {savingMain ? "Saving..." : "Save"}
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
              <input type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputClass()} onFocus={focusRing} onBlur={clearRing} />
              <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputClass()} onFocus={focusRing} onBlur={clearRing}>
                <option value="video">Video</option>
                <option value="phone">Phone</option>
                <option value="in_person">In person</option>
              </select>
              <button type="submit" disabled={savingInterview} className="w-full text-sm font-medium py-2 rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: "var(--color-primary)" }}>
                {savingInterview ? "Scheduling..." : "Confirm"}
              </button>
            </form>
          )}

          {(app.interviews ?? []).length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">None scheduled yet.</p>
          ) : (
            <div className="space-y-2.5">
              {app.interviews.map((iv) => (
                <InterviewRow key={iv.id} interview={iv} onEvaluate={handleEvaluate} />
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

function InterviewRow({ interview, onEvaluate }) {
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(interview.rating ?? 0);
  const [feedback, setFeedback] = useState(interview.feedback ?? "");

  return (
    <div className="rounded-lg border border-black/[0.06] p-3.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {new Date(interview.scheduled_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] capitalize">{interview.mode.replace("_", " ")} &middot; {interview.status}</p>
        </div>
        {interview.rating ? (
          <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[#e8f9f0] text-[#1a9c5f]">{interview.rating}/5</span>
        ) : (
          <button onClick={() => setEditing((v) => !v)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
            {editing ? "Cancel" : "Evaluate"}
          </button>
        )}
      </div>

      {interview.feedback && !editing && (
        <p className="text-xs text-[var(--color-text-muted)] mt-2">{interview.feedback}</p>
      )}

      {editing && (
        <div className="mt-3 space-y-2">
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className={inputClass()} onFocus={focusRing} onBlur={clearRing}>
            <option value={0}>Rate...</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}
          </select>
          <textarea placeholder="Feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} className={inputClass()} onFocus={focusRing} onBlur={clearRing} />
          <button
            onClick={() => { onEvaluate(interview.id, rating || null, feedback || null); setEditing(false); }}
            className="text-xs font-medium px-3 py-1.5 rounded-md text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            Save evaluation
          </button>
        </div>
      )}
    </div>
  );
}
