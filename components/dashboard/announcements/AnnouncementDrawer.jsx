"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendNotificationEmail } from "@/lib/sendNotificationEmail";

const CATEGORIES = [
  { id: "general", label: "General" },
  { id: "hr", label: "HR" },
  { id: "event", label: "Event" },
  { id: "urgent", label: "Urgent" },
];

const AUDIENCE_OPTIONS = [
  { id: "company", label: "Company-wide" },
  { id: "department", label: "Department" },
  { id: "team", label: "Team" },
  { id: "individual", label: "Individual" },
];

// 8.1 — HR picks exactly who this reaches. 8.2 — posting one also
// notifies whoever it reaches, so it shows up in their notification
// center, not just on the Announcements page if they happen to visit.
export default function AnnouncementDrawer({ open, onClose, onSaved, companyId, profileId, employees }) {
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [eventDate, setEventDate] = useState("");
  const [pinned, setPinned] = useState(false);
  const [audienceType, setAudienceType] = useState("company");
  const [audienceValue, setAudienceValue] = useState("");
  const [audienceEmployeeId, setAudienceEmployeeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort(),
    [employees]
  );
  const teams = useMemo(
    () => Array.from(new Set(employees.map((e) => e.team).filter(Boolean))).sort(),
    [employees]
  );

  const targetEmployees = useMemo(() => {
    if (audienceType === "company") return employees;
    if (audienceType === "department") return employees.filter((e) => e.department === audienceValue);
    if (audienceType === "team") return employees.filter((e) => e.team === audienceValue);
    if (audienceType === "individual") return employees.filter((e) => e.id === audienceEmployeeId);
    return [];
  }, [audienceType, audienceValue, audienceEmployeeId, employees]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase.from("announcements").insert({
      company_id: companyId,
      author_id: profileId,
      title,
      body,
      category,
      event_date: category === "event" && eventDate ? eventDate : null,
      pinned,
      audience_type: audienceType,
      audience_value: audienceType === "department" || audienceType === "team" ? audienceValue : null,
      audience_employee_id: audienceType === "individual" ? audienceEmployeeId : null,
    });

    if (dbError) {
      setSaving(false);
      setError(dbError.message);
      return;
    }

    // In-app notification only reaches someone with a login; email
    // goes out to everyone targeted regardless, since that's the only
    // channel at all for someone who's never gotten portal access yet
    // — same split this app already uses for leave-request outcomes.
    const withPortalAccess = targetEmployees.filter((e) => e.profile_id);
    if (withPortalAccess.length) {
      await supabase.from("notifications").insert(
        withPortalAccess.map((e) => ({
          company_id: companyId,
          profile_id: e.profile_id,
          type: "announcement",
          message: `New announcement: ${title}`,
          link: "/dashboard/announcements",
        }))
      );
    }
    targetEmployees.forEach((e) => {
      if (!e.email) return;
      sendNotificationEmail({ to: e.email, subject: `New announcement: ${title}`, message: body, link: "/dashboard/announcements" });
    });

    setSaving(false);
    setTitle("");
    setBody("");
    setCategory("general");
    setEventDate("");
    setPinned(false);
    setAudienceType("company");
    setAudienceValue("");
    setAudienceEmployeeId("");
    onSaved();
    onClose();
  }

  if (!open) return null;

  const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
  const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
  const clearRing = (e) => (e.target.style.boxShadow = "none");

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[420px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">New announcement</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">Reaches whoever you target, immediately.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Audience</label>
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              {AUDIENCE_OPTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { setAudienceType(a.id); setAudienceValue(""); setAudienceEmployeeId(""); }}
                  className={`text-xs font-medium py-2 rounded-lg border transition-colors duration-150 ${
                    audienceType === a.id
                      ? "text-white border-transparent"
                      : "text-[var(--color-text-primary)] border-black/10 hover:bg-black/[0.03]"
                  }`}
                  style={audienceType === a.id ? { backgroundColor: "var(--color-primary)" } : undefined}
                >
                  {a.label}
                </button>
              ))}
            </div>

            {audienceType === "department" && (
              <select value={audienceValue} onChange={(e) => setAudienceValue(e.target.value)} required className={inputClass} onFocus={focusRing} onBlur={clearRing}>
                <option value="">Choose a department...</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
            {audienceType === "team" && (
              <select value={audienceValue} onChange={(e) => setAudienceValue(e.target.value)} required className={inputClass} onFocus={focusRing} onBlur={clearRing}>
                <option value="">Choose a team...</option>
                {teams.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {audienceType === "individual" && (
              <select value={audienceEmployeeId} onChange={(e) => setAudienceEmployeeId(e.target.value)} required className={inputClass} onFocus={focusRing} onBlur={clearRing}>
                <option value="">Choose an employee...</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>)}
              </select>
            )}

            <p className="text-[10.5px] text-[var(--color-text-muted)] mt-1.5">
              {targetEmployees.length} {targetEmployees.length === 1 ? "person" : "people"} will see this.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
              placeholder="e.g. Office closed for the holiday"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Message</label>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {category === "event" && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Event date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="accent-[var(--color-primary)]"
            />
            Pin to the top
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150"
              style={{ transitionTimingFunction: "var(--ease-out)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[1.4] rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
            >
              {saving ? "Posting..." : "Post announcement"}
            </button>
          </div>
        </form>
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
