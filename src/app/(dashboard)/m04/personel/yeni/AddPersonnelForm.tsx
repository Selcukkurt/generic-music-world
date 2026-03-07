"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/shell/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { createPersonnel } from "@/lib/m04/personnel";
import { fetchJobTitles } from "@/lib/org-structure/data";
import { fetchOrgUnits } from "@/lib/org-structure/data";
import type { JobTitle } from "@/lib/org-structure/types";
import type { OrgUnit } from "@/lib/org-structure/types";

type DocEntry = { name: string; url?: string; type?: string };

const RBAC_ROLES = ["staff", "lead", "admin", "system_owner"] as const;
const INSURANCE_OPTIONS = ["insured", "freelance"] as const;
const SALARY_TYPES = ["monthly", "daily", "freelance"] as const;

export default function AddPersonnelForm() {
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    national_id: "",
    iban: "",
    insurance_status: "insured" as (typeof INSURANCE_OPTIONS)[number],
    salary_type: "monthly" as (typeof SALARY_TYPES)[number],
    salary_amount: "",
    job_title_id: "",
    rbac_role: "staff",
    org_unit_id: "",
    notes: "",
  });
  const [documents, setDocuments] = useState<DocEntry[]>([]);
  const [newDocName, setNewDocName] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");

  useEffect(() => {
    Promise.all([fetchJobTitles(), fetchOrgUnits()])
      .then(([jt, ou]) => {
        setJobTitles(jt);
        setOrgUnits(ou);
      })
      .catch(() => toast.error("Error", "Could not load job titles or org units."));
  }, [toast]);

  const addDocument = () => {
    if (!newDocName.trim()) return;
    setDocuments((prev) => [
      ...prev,
      { name: newDocName.trim(), url: newDocUrl.trim() || undefined },
    ]);
    setNewDocName("");
    setNewDocUrl("");
  };

  const removeDocument = (idx: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim()) {
      toast.error("Validation", "First name is required.");
      return;
    }
    const amount = form.salary_amount.trim()
      ? parseFloat(form.salary_amount.replace(/[^\d.,]/g, "").replace(",", "."))
      : undefined;
    if (form.salary_type !== "freelance" && amount != null && (isNaN(amount) || amount < 0)) {
      toast.error("Validation", "Please enter a valid salary amount.");
      return;
    }
    setSubmitting(true);
    try {
      const record = await createPersonnel({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        national_id: form.national_id.trim() || undefined,
        iban: form.iban.trim() || undefined,
        insurance_status: form.insurance_status,
        salary_type: form.salary_type,
        salary_amount: amount,
        job_title_id: form.job_title_id || undefined,
        rbac_role: form.rbac_role || "staff",
        org_unit_id: form.org_unit_id || undefined,
        notes: form.notes.trim() || undefined,
        documents: documents.map((d) => ({ name: d.name, url: d.url, type: d.type })),
      });
      toast.success("Success", "Personnel record created.");
      router.push(`/m04/personel/kart?id=${record.id}`);
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to create personnel.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "ui-input w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] py-2.5 px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--brand-yellow)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-yellow)]/30";
  const labelClass = "mb-1.5 block text-sm font-medium ui-text-secondary";

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Add New Personnel"
        subtitle="Create HR record. National ID, IBAN, insurance status, job title, and compensation are stored separately from RBAC."
      >
        <Link
          href="/m04/personel"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
        >
          Back to List
        </Link>
      </PageHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide ui-text-muted">
            Basic Information
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>First Name *</label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Selcuk"
              />
            </div>
            <div>
              <label className={labelClass}>Last Name</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Kurt"
              />
            </div>
            <div>
              <label className={labelClass}>National ID</label>
              <input
                type="text"
                value={form.national_id}
                onChange={(e) => setForm((f) => ({ ...f, national_id: e.target.value }))}
                className={`${inputClass} font-mono`}
                placeholder="11-digit ID number"
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputClass}
                placeholder="+90 5XX XXX XX XX"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputClass}
                placeholder="email@example.com"
              />
            </div>
          </div>
        </div>

        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide ui-text-muted">
            Banking & Compensation
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>IBAN</label>
              <input
                type="text"
                value={form.iban}
                onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
                className={`${inputClass} font-mono`}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
              />
            </div>
            <div>
              <label className={labelClass}>Insurance Status</label>
              <select
                value={form.insurance_status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    insurance_status: e.target.value as (typeof INSURANCE_OPTIONS)[number],
                  }))
                }
                className={inputClass}
              >
                {INSURANCE_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Salary Type</label>
              <select
                value={form.salary_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    salary_type: e.target.value as (typeof SALARY_TYPES)[number],
                  }))
                }
                className={inputClass}
              >
                {SALARY_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {form.salary_type !== "freelance" && (
              <div>
                <label className={labelClass}>Salary Amount (TRY)</label>
                <input
                  type="text"
                  value={form.salary_amount}
                  onChange={(e) => setForm((f) => ({ ...f, salary_amount: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. 45000"
                />
              </div>
            )}
          </div>
        </div>

        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide ui-text-muted">
            Role & Organization
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Job Title</label>
              <select
                value={form.job_title_id}
                onChange={(e) => setForm((f) => ({ ...f, job_title_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">— Select —</option>
                {jobTitles.map((jt) => (
                  <option key={jt.id} value={jt.id}>
                    {jt.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>RBAC Role</label>
              <select
                value={form.rbac_role}
                onChange={(e) => setForm((f) => ({ ...f, rbac_role: e.target.value }))}
                className={inputClass}
              >
                {RBAC_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Organization Unit</label>
              <select
                value={form.org_unit_id}
                onChange={(e) => setForm((f) => ({ ...f, org_unit_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">— Select —</option>
                {orgUnits.map((ou) => (
                  <option key={ou.id} value={ou.id}>
                    {ou.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide ui-text-muted">
            Document Upload
          </h3>
          <p className="mb-4 text-sm ui-text-muted">
            Add document references (name and optional URL). File upload integration can be added later.
          </p>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              placeholder="Document name"
              className="ui-input w-48 py-2 text-sm"
            />
            <input
              type="url"
              value={newDocUrl}
              onChange={(e) => setNewDocUrl(e.target.value)}
              placeholder="URL (optional)"
              className="ui-input w-64 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addDocument}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
            >
              Add
            </button>
          </div>
          {documents.length > 0 && (
            <ul className="mt-4 space-y-2">
              {documents.map((d, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]/50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-[var(--color-text)]">{d.name}</span>
                  {d.url && (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs ui-text-muted hover:underline"
                    >
                      {d.url.slice(0, 40)}…
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => removeDocument(i)}
                    className="rounded px-2 py-1 text-xs ui-text-muted hover:bg-[var(--color-surface-hover)]"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide ui-text-muted">
            Notes
          </h3>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
            className={inputClass}
            placeholder="Additional notes…"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="ui-button-primary rounded-lg px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create Personnel"}
          </button>
          <Link
            href="/m04/personel"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-6 py-2.5 text-sm font-medium ui-text-secondary transition hover:bg-[var(--color-surface-hover)]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
