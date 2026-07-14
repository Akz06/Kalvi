import { useEffect, useState } from "react";
import { api, parseApiError, type ApiFieldIssue } from "../api/client";
import { PageHeader, Spinner, FormError, FieldHint } from "../components/ui";
import { money } from "../lib/format";
import { useConfig, type Features, type SchoolSettings } from "../context/ConfigContext";

interface FeeHead {
  id: string;
  name: string;
  defaultAmount: number;
  active: boolean;
  classId: string;
}

interface ClassOpt {
  id: string;
  name: string;
  level: number;
}

const FEATURE_LABELS: { key: keyof Features; label: string; hint: string }[] = [
  { key: "students", label: "Students", hint: "Admissions & profiles" },
  { key: "staff", label: "Staff", hint: "Teachers & employees" },
  { key: "classes", label: "Classes", hint: "Class & section structure" },
  { key: "attendance", label: "Attendance", hint: "Daily marking" },
  { key: "fees", label: "Fees", hint: "Invoicing & payments" },
  { key: "exams", label: "Exams & Report Cards", hint: "Phase 2 module" },
  { key: "parentPortal", label: "Parent Portal", hint: "Allow guardians to log in and view their child's data" },
  { key: "academicYears", label: "Academic Years", hint: "Track enrollment history and promote students across years" },
  { key: "onlinePayments", label: "Online Payments", hint: "Allow guardians to pay fees online via configured gateway (managed in Online Payment Settings)" },
];

const CURRENCIES = ["INR", "USD", "AED", "GBP", "EUR", "SGD"];
const BOARDS = ["CBSE", "STATE", "ICSE", "IB", "OTHER"];

export default function Settings() {
  const { config, reload } = useConfig();
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [features, setFeatures] = useState<Features | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<ApiFieldIssue[]>([]);

  // Fee configuration (fee heads) — now PER CLASS
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [feeClassId, setFeeClassId] = useState("");
  const [heads, setHeads] = useState<FeeHead[]>([]);
  const [newHead, setNewHead] = useState({ name: "", defaultAmount: "" });
  const [headError, setHeadError] = useState("");
  const [headMsg, setHeadMsg] = useState("");
  const cur = config?.settings?.currency ?? "INR";
  const loc = config?.settings?.locale ?? "en-IN";
  const money$ = (n: number) => money(n, cur, loc);

  function loadHeads(classId = feeClassId) {
    if (!classId) {
      setHeads([]);
      return;
    }
    api.get(`/fees/heads?classId=${classId}`).then((r) => setHeads(r.data));
  }

  useEffect(() => {
    if (config?.settings) setSettings(config.settings);
    if (config?.features) setFeatures(config.features);
  }, [config]);

  useEffect(() => {
    api.get("/classes").then((r) => {
      const opts: ClassOpt[] = r.data.map((c: any) => ({
        id: c.id,
        name: c.name,
        level: c.level,
      }));
      setClasses(opts);
      if (opts.length && !feeClassId) setFeeClassId(opts[0].id);
    });
  }, []);

  useEffect(() => {
    loadHeads(feeClassId);
    setHeadError("");
    setHeadMsg("");
  }, [feeClassId]);

  async function addHead(e: React.FormEvent) {
    e.preventDefault();
    setHeadError("");
    setHeadMsg("");
    if (!feeClassId) {
      setHeadError("Please select a class first.");
      return;
    }
    if (!newHead.name.trim()) {
      setHeadError("Please enter a fee head name.");
      return;
    }
    try {
      await api.post("/fees/heads", {
        classId: feeClassId,
        name: newHead.name.trim(),
        defaultAmount: newHead.defaultAmount ? Number(newHead.defaultAmount) : 0,
      });
      setNewHead({ name: "", defaultAmount: "" });
      setHeadMsg("Fee head added.");
      loadHeads();
    } catch (err) {
      setHeadError(parseApiError(err, "We couldn't add this fee head.").message);
    }
  }

  async function toggleHead(h: FeeHead) {
    setHeadError("");
    try {
      await api.put(`/fees/heads/${h.id}`, { active: !h.active });
      loadHeads();
    } catch (err) {
      setHeadError(parseApiError(err, "We couldn't update this fee head.").message);
    }
  }

  async function saveHeadAmount(h: FeeHead, amount: number) {
    setHeadError("");
    try {
      await api.put(`/fees/heads/${h.id}`, { defaultAmount: amount });
      loadHeads();
    } catch (err) {
      setHeadError(parseApiError(err, "We couldn't update this fee head.").message);
    }
  }

  async function deleteHead(h: FeeHead) {
    setHeadError("");
    if (!confirm(`Delete fee head "${h.name}"?`)) return;
    try {
      await api.delete(`/fees/heads/${h.id}`);
      loadHeads();
    } catch (err) {
      setHeadError(parseApiError(err, "We couldn't delete this fee head.").message);
    }
  }

  if (!settings || !features) return <Spinner />;

  function set<K extends keyof SchoolSettings>(k: K, v: SchoolSettings[K]) {
    setSettings((s) => (s ? { ...s, [k]: v } : s));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    setIssues([]);
    // Instant client-side guard with a plain-language message.
    if (Number(settings!.minClassLevel) > Number(settings!.maxClassLevel)) {
      setError("Lowest class cannot be higher than the highest class.");
      return;
    }
    setSaving(true);
    try {
      await api.put("/schools/settings", {
        city: settings!.city,
        state: settings!.state,
        country: settings!.country,
        addressLine: settings!.addressLine,
        phone: settings!.phone,
        email: settings!.email || undefined,
        logoUrl: settings!.logoUrl,
        tagline: settings!.tagline ?? "",
        primaryColor: settings!.primaryColor ?? "",
        currency: settings!.currency,
        locale: settings!.locale,
        timezone: settings!.timezone,
        board: settings!.board,
        academicYear: settings!.academicYear,
        minClassLevel: Number(settings!.minClassLevel),
        maxClassLevel: Number(settings!.maxClassLevel),
        sectionsPerClass: Number(settings!.sectionsPerClass),
        passPercentage: Number(settings!.passPercentage),
        features,
      });
      await reload();
      setMsg("Your preferences have been saved.");
    } catch (err) {
      const parsed = parseApiError(err, "We couldn't save your preferences.");
      setError(parsed.message);
      setIssues(parsed.issues);
    } finally {
      setSaving(false);
    }
  }

  async function reprovision() {
    if (!confirm("Create classes/sections for the current class range? Existing ones are kept.")) return;
    setSaving(true);
    setError("");
    setIssues([]);
    try {
      await api.post("/schools/provision-classes");
      setMsg("Classes were created from your configured range.");
    } catch (err) {
      setError(parseApiError(err, "We couldn't create the classes.").message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Preferences" />
      <form onSubmit={save} className="space-y-6 max-w-3xl">
        {/* Identity & localisation */}
        <section className="card p-6">
          <h3 className="font-semibold mb-4">School Profile & Localisation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="City"><input className="input" value={settings.city} onChange={(e) => set("city", e.target.value)} /></Field>
            <Field label="State"><input className="input" value={settings.state} onChange={(e) => set("state", e.target.value)} /></Field>
            <Field label="Country"><input className="input" value={settings.country} onChange={(e) => set("country", e.target.value)} /></Field>
            <Field label="Phone"><input className="input" value={settings.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Contact Email"><input className="input" type="email" value={settings.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Address"><input className="input" value={settings.addressLine} onChange={(e) => set("addressLine", e.target.value)} /></Field>
            <Field label="Logo URL"><input className="input" value={settings.logoUrl ?? ""} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://..." /></Field>
            <Field label="Tagline">
              <input className="input" value={(settings as any).tagline ?? ""} onChange={(e) => set("tagline" as any, e.target.value)} placeholder="Excellence in Education since 1998" />
              <FieldHint>Shown on your public school page and login screen.</FieldHint>
            </Field>
            <Field label="Brand Colour (hex)">
              <input className="input font-mono" value={(settings as any).primaryColor ?? ""} onChange={(e) => set("primaryColor" as any, e.target.value)} placeholder="#1d4ed8" />
              <FieldHint>Optional — customises your school's public pages.</FieldHint>
            </Field>
            <Field label="Currency">
              <select className="input" value={settings.currency} onChange={(e) => set("currency", e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <FieldHint>Used for all fee amounts across the app.</FieldHint>
            </Field>
            <Field label="Locale"><input className="input" value={settings.locale} onChange={(e) => set("locale", e.target.value)} placeholder="en-IN" /></Field>
            <Field label="Timezone"><input className="input" value={settings.timezone} onChange={(e) => set("timezone", e.target.value)} /></Field>
          </div>
        </section>

        {/* Academic config */}
        <section className="card p-6">
          <h3 className="font-semibold mb-4">Academic Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Board">
              <select className="input" value={settings.board} onChange={(e) => set("board", e.target.value)}>
                {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Academic Year"><input className="input" value={settings.academicYear} onChange={(e) => set("academicYear", e.target.value)} placeholder="2024-2025" /></Field>
            <Field label="Pass %"><input className="input" type="number" min={0} max={100} value={settings.passPercentage} onChange={(e) => set("passPercentage", Number(e.target.value))} /></Field>
            <Field label="Lowest Class"><input className="input" type="number" min={1} max={20} value={settings.minClassLevel} onChange={(e) => set("minClassLevel", Number(e.target.value))} /></Field>
            <Field label="Highest Class"><input className="input" type="number" min={1} max={20} value={settings.maxClassLevel} onChange={(e) => set("maxClassLevel", Number(e.target.value))} /></Field>
            <Field label="Sections / Class"><input className="input" type="number" min={1} max={10} value={settings.sectionsPerClass} onChange={(e) => set("sectionsPerClass", Number(e.target.value))} /></Field>
          </div>
          <button type="button" onClick={reprovision} className="btn-ghost mt-4 text-sm">
            ⟳ Apply class range (create missing classes/sections)
          </button>
        </section>

        {/* Fee configuration — per class */}
        <section className="card p-6">
          <h3 className="font-semibold mb-1">Fee Configuration</h3>
          <p className="text-xs text-slate-400 mb-4">
            Fee heads are configured <strong>per class</strong>. Pick a class,
            then define its fee heads and default amounts. The same head can have
            different amounts across classes.
          </p>

          <div className="mb-4">
            <label className="label">Class</label>
            <select
              className="input max-w-xs"
              value={feeClassId}
              onChange={(e) => setFeeClassId(e.target.value)}
            >
              {classes.length === 0 && <option value="">No classes yet</option>}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldHint>
              Fee heads below apply only to the selected class.
            </FieldHint>
          </div>

          <div className="space-y-2">
            {heads.length === 0 ? (
              <p className="text-sm text-slate-400">
                {feeClassId
                  ? "No fee heads for this class yet."
                  : "Select a class to configure its fee heads."}
              </p>
            ) : (
              heads.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <span
                    className={`flex-1 text-sm font-medium ${
                      h.active ? "" : "text-slate-400 line-through"
                    }`}
                  >
                    {h.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    Default: {money$(h.defaultAmount)}
                  </span>
                  <input
                    type="number"
                    min={0}
                    defaultValue={h.defaultAmount}
                    className="input w-28 h-8 text-sm"
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== h.defaultAmount) saveHeadAmount(h, v);
                    }}
                  />
                  <button
                    type="button"
                    className="text-xs text-slate-500 hover:text-brand-600"
                    onClick={() => toggleHead(h)}
                  >
                    {h.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-slate-400 hover:text-red-500"
                    onClick={() => deleteHead(h)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add a new fee head (nested form uses button type=button to avoid submit) */}
          <div className="mt-4 flex items-end gap-2 border-t border-slate-100 pt-4">
            <div className="flex-1">
              <label className="label">New Fee Head</label>
              <input
                className="input"
                placeholder="e.g. Transport Fee"
                value={newHead.name}
                onChange={(e) => setNewHead({ ...newHead, name: e.target.value })}
              />
            </div>
            <div className="w-36">
              <label className="label">Default ({cur})</label>
              <input
                className="input"
                type="number"
                min={0}
                placeholder="0"
                value={newHead.defaultAmount}
                onChange={(e) =>
                  setNewHead({ ...newHead, defaultAmount: e.target.value })
                }
              />
            </div>
            <button type="button" className="btn-primary" onClick={addHead}>
              Add
            </button>
          </div>
          {headMsg && (
            <p className="mt-2 text-sm text-green-700">{headMsg}</p>
          )}
          {headError && <p className="mt-2 text-sm text-red-600">{headError}</p>}
        </section>

        {/* Feature flags */}
        <section className="card p-6">
          <h3 className="font-semibold mb-1">Modules (Feature Flags)</h3>
          <p className="text-xs text-slate-400 mb-4">Toggle modules on/off for this school.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FEATURE_LABELS.map((f) => (
              <label key={f.key} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={features[f.key]}
                  onChange={(e) => setFeatures({ ...features, [f.key]: e.target.checked })}
                  className="h-4 w-4"
                />
                <span>
                  <span className="block text-sm font-medium">{f.label}</span>
                  <span className="block text-xs text-slate-400">{f.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {msg && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {msg}
          </p>
        )}
        <FormError message={error} issues={issues} />
        <div className="flex justify-end">
          <button className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
