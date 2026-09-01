"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DOC_TYPES, docTypeLabel } from "@/components/dashboard/documents/DocumentsPage";

const FIELD_GROUP_LABEL = {
  bank_details: "Bank details (self-submitted)",
  guarantor_details: "Guarantor information (self-submitted)",
};

function verificationSummary(task) {
  if (task.verification_type === "document") return `Document: ${docTypeLabel(task.document_type)}`;
  if (task.verification_type === "field") return FIELD_GROUP_LABEL[task.field_group] ?? "Self-submitted data";
  return "HR-confirmed";
}

export default function TemplatesPage({ templates, companyId }) {
  const router = useRouter();
  const supabase = createClient();
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [requirementDrawerTemplate, setRequirementDrawerTemplate] = useState(null);

  async function handleDeleteTask(taskId) {
    await supabase.from("onboarding_tasks").delete().eq("id", taskId);
    router.refresh();
  }

  async function handleSetDefault(templateId) {
    // Only one template can be default — clear the others first.
    await supabase.from("onboarding_templates").update({ is_default: false }).neq("id", templateId);
    await supabase.from("onboarding_templates").update({ is_default: true }).eq("id", templateId);
    router.refresh();
  }

  async function handleDeleteTemplate(templateId) {
    if (!confirm("Delete this template and all its requirements? This can't be undone.")) return;
    await supabase.from("onboarding_templates").delete().eq("id", templateId);
    router.refresh();
  }

  return (
    <div>
      <Link
        href="/dashboard/onboarding"
        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors duration-150 mb-4 inline-flex items-center gap-1"
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        ← Back to Onboarding
      </Link>

      <div className="flex flex-wrap justify-between items-start gap-3 mb-7">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">
            Onboarding templates
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
            Each requirement is confirmed automatically — a document actually uploaded, or real data actually
            submitted — never a box someone just ticks. New employees are assigned a checklist automatically,
            matched by department; anyone whose department doesn't match gets the default template.
          </p>
        </div>
        <button
          onClick={() => setNewTemplateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95 shrink-0"
          style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-20 border-[1.5px] border-dashed border-black/[0.1] rounded-2xl">
          <p className="font-display font-semibold text-[var(--color-text-primary)]">No templates yet</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Create one to start assigning onboarding checklists automatically.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {templates.map((template) => (
            <div key={template.id} className="bg-white border border-black/[0.06] rounded-2xl p-5">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold text-[var(--color-text-primary)]">
                    {template.name}
                  </h3>
                  {template.is_default && (
                    <span className="text-[10.5px] font-medium bg-[var(--color-violet-tint)] text-[var(--color-primary)] px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="text-xs text-[var(--color-text-muted)] hover:text-red-600 transition-colors duration-150"
                  style={{ transitionTimingFunction: "var(--ease-out)" }}
                >
                  Delete
                </button>
              </div>

              {!template.is_default && (
                <button
                  onClick={() => handleSetDefault(template.id)}
                  className="text-xs text-[var(--color-primary)] hover:underline mb-3"
                >
                  Set as default
                </button>
              )}

              <ul className="space-y-1.5 mb-3 mt-3">
                {(template.onboarding_tasks ?? [])
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((task) => (
                    <li
                      key={task.id}
                      className="group bg-[var(--color-violet-tint)] rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm text-[var(--color-text-primary)] truncate">{task.title}</span>
                          {!task.is_required && (
                            <span className="text-[10px] font-medium text-[var(--color-text-muted)] bg-white px-1.5 py-0.5 rounded shrink-0">
                              Optional
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[var(--color-text-muted)] hover:text-red-600 text-xs shrink-0"
                          style={{ transitionTimingFunction: "var(--ease-out)" }}
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        {verificationSummary(task)}
                      </p>
                    </li>
                  ))}
                {(template.onboarding_tasks ?? []).length === 0 && (
                  <li className="text-sm text-[var(--color-text-muted)] py-1">No requirements yet.</li>
                )}
              </ul>

              <button
                onClick={() => setRequirementDrawerTemplate(template)}
                className="text-sm font-medium px-3 py-2 rounded-lg bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150 w-full"
                style={{ transitionTimingFunction: "var(--ease-out)" }}
              >
                + Add requirement
              </button>
            </div>
          ))}
        </div>
      )}

      {newTemplateOpen && (
        <NewTemplateDrawer
          companyId={companyId}
          onClose={() => setNewTemplateOpen(false)}
          onSaved={() => router.refresh()}
        />
      )}

      <NewRequirementDrawer
        open={!!requirementDrawerTemplate}
        template={requirementDrawerTemplate}
        companyId={companyId}
        onClose={() => setRequirementDrawerTemplate(null)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function NewTemplateDrawer({ companyId, onClose, onSaved }) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (isDefault) {
      await supabase.from("onboarding_templates").update({ is_default: false }).eq("company_id", companyId);
    }

    const { error: dbError } = await supabase
      .from("onboarding_templates")
      .insert({ name, company_id: companyId, is_default: isDefault });

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
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[360px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">New template</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          Name it after a department to auto-match new hires (e.g. "Engineering"), or anything else if you'll set it as the default.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
              Template name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Engineering"
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="accent-[var(--color-primary)] w-4 h-4 mt-0.5"
            />
            <span className="text-sm text-[var(--color-text-primary)]">
              Make this the default template
              <span className="block text-xs text-[var(--color-text-muted)] font-normal mt-0.5">
                Used for any new hire whose department doesn't match another template's name
              </span>
            </span>
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
              {saving ? "Creating..." : "Create template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const FIELD_GROUP_OPTIONS = [
  { id: "bank_details", label: "Bank details" },
  { id: "guarantor_details", label: "Guarantor information" },
];

function NewRequirementDrawer({ open, template, companyId, onClose, onSaved }) {
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [verificationType, setVerificationType] = useState("document");
  const [documentType, setDocumentType] = useState(DOC_TYPES[0].id);
  const [fieldGroup, setFieldGroup] = useState(FIELD_GROUP_OPTIONS[0].id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!open || !template) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const nextOrder = (template.onboarding_tasks?.length ?? 0) + 1;

    const { error: dbError } = await supabase.from("onboarding_tasks").insert({
      company_id: companyId,
      template_id: template.id,
      title: title.trim(),
      sort_order: nextOrder,
      is_required: isRequired,
      verification_type: verificationType,
      document_type: verificationType === "document" ? documentType : null,
      field_group: verificationType === "field" ? fieldGroup : null,
    });

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    setTitle("");
    setIsRequired(true);
    setVerificationType("document");
    onSaved();
    onClose();
  }

  const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none";

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[380px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Add requirement</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">To {template.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Passport photograph"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
              How is this confirmed?
            </label>
            <select value={verificationType} onChange={(e) => setVerificationType(e.target.value)} className={inputClass}>
              <option value="document">A document is uploaded</option>
              <option value="field">Data is self-submitted (bank/guarantor)</option>
              <option value="manual">HR confirms it manually</option>
            </select>
          </div>

          {verificationType === "document" && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Document type</label>
              <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className={inputClass}>
                {DOC_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          )}

          {verificationType === "field" && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Which data</label>
              <select value={fieldGroup} onChange={(e) => setFieldGroup(e.target.value)} className={inputClass}>
                {FIELD_GROUP_OPTIONS.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>
          )}

          {verificationType === "manual" && (
            <p className="text-xs text-[var(--color-text-muted)] bg-[var(--color-violet-tint)] rounded-lg px-3 py-2">
              Only admins/managers can mark this complete — never the employee themselves. Use this only when there's
              genuinely no document or data to verify against (e.g. "IT equipment issued").
            </p>
          )}

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="accent-[var(--color-primary)] w-4 h-4 mt-0.5"
            />
            <span className="text-sm text-[var(--color-text-primary)]">
              Required
              <span className="block text-xs text-[var(--color-text-muted)] font-normal mt-0.5">
                Onboarding can't be marked complete until every required item is satisfied. Uncheck for optional items.
              </span>
            </span>
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
              {saving ? "Adding..." : "Add requirement"}
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
