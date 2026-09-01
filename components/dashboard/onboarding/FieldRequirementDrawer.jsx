"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
const clearRing = (e) => (e.target.style.boxShadow = "none");

const FIELD_GROUPS = {
  bank_details: {
    title: "Bank details",
    description: "Used for salary payment — stored securely, visible only to you and HR.",
    fields: [
      { key: "bank_name", label: "Bank name", placeholder: "e.g. GTBank" },
      { key: "bank_account_number", label: "Account number", placeholder: "0123456789" },
      { key: "bank_account_name", label: "Account name", placeholder: "As it appears on your account" },
    ],
  },
  guarantor_details: {
    title: "Guarantor information",
    description: "Someone who can vouch for you — stored securely, visible only to you and HR.",
    fields: [
      { key: "guarantor_name", label: "Full name", placeholder: "Guarantor's full name" },
      { key: "guarantor_phone", label: "Phone number", placeholder: "+234..." },
      { key: "guarantor_relationship", label: "Relationship", placeholder: "e.g. Uncle, Former employer" },
      { key: "guarantor_address", label: "Address (optional)", placeholder: "", optional: true },
    ],
  },
};

// Self-service submission for the two "field" (not document-upload)
// onboarding requirements. Writes straight to the employees row — RLS
// (a row policy scoped to the caller's own record, plus a trigger that
// rejects any column outside this exact field set) makes sure this can
// never touch anything beyond bank/guarantor data, even though the
// underlying UPDATE grant on the table is broader.
export default function FieldRequirementDrawer({ open, onClose, onSaved, employeeId, fieldGroup, currentValues }) {
  const supabase = createClient();
  const config = fieldGroup ? FIELD_GROUPS[fieldGroup] : null;

  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !config) return;
    const initial = {};
    config.fields.forEach((f) => {
      initial[f.key] = currentValues?.[f.key] ?? "";
    });
    setValues(initial);
    setError(null);
  }, [open, fieldGroup]);

  if (!open || !config) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {};
    config.fields.forEach((f) => {
      payload[f.key] = values[f.key]?.trim() || null;
    });

    const { error: dbError } = await supabase.from("employees").update(payload).eq("id", employeeId);

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[380px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">{config.title}</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">{config.description}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {config.fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">{f.label}</label>
              <input
                type="text"
                required={!f.optional}
                placeholder={f.placeholder}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              />
            </div>
          ))}

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
              {saving ? "Saving..." : "Save"}
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
