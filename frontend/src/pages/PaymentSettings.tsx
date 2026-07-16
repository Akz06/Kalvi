/**
 * Payment Settings — /app/payment-settings
 *
 * School admins configure the online payment gateway here.
 * Organised into 4 tabs:
 *   1. General    — provider, mode (TEST/LIVE), enable/disable
 *   2. Credentials — key ID + secret (write-only, never shown)
 *   3. Modes      — tick which payment modes are enabled
 *   4. Webhook    — URL to copy into the gateway dashboard
 *
 * The component syncs the `onlinePayments` feature flag automatically
 * when the admin toggles the gateway active/inactive.
 */

import { useEffect, useState } from "react";
import { api, parseApiError } from "../api/client";
import { PageHeader, Spinner, FormError } from "../components/ui";
import { useConfig } from "../context/ConfigContext";
import { CashIcon, CardIcon, UpiIcon, BankIcon, ChequeIcon, GlobeIcon, CheckIcon, WebhookIcon, KeyIcon, EyeIcon, EyeOffIcon, CopyIcon, InfoIcon } from "../components/icons";

// ── Types ────────────────────────────────────────────────────

type Provider = "RAZORPAY" | "STRIPE" | "PAYU" | "CASHFREE" | "MANUAL";
type GatewayMode = "TEST" | "LIVE";
type PayMode =
  | "CASH"
  | "CARD"
  | "UPI"
  | "BANK"
  | "CHEQUE"
  | "ONLINE";

interface GatewayConfig {
  provider: Provider;
  mode: GatewayMode;
  keyId: string;      // masked — last 4 chars only
  active: boolean;
  enabledModes: PayMode[];
}

// ── Constants ────────────────────────────────────────────────

const PROVIDERS: { value: Provider; label: string; hint: string }[] = [
  {
    value: "RAZORPAY",
    label: "Razorpay",
    hint: "UPI, Cards, Net Banking, Wallets — widely used in India",
  },
  {
    value: "STRIPE",
    label: "Stripe",
    hint: "Cards, bank transfers — international schools",
  },
  {
    value: "PAYU",
    label: "PayU",
    hint: "UPI, Cards, Net Banking — Indian payment gateway",
  },
  {
    value: "CASHFREE",
    label: "Cashfree",
    hint: "UPI, Cards, payouts — strong Indian coverage",
  },
  {
    value: "MANUAL",
    label: "Manual (Offline)",
    hint: "No online gateway — payments collected offline and recorded manually",
  },
];

const ALL_MODES: { value: PayMode; label: string; Icon: React.ComponentType<{className?:string}> }[] = [
  { value: "CASH",   label: "Cash",             Icon: CashIcon },
  { value: "CARD",   label: "Card",             Icon: CardIcon },
  { value: "UPI",    label: "UPI",              Icon: UpiIcon },
  { value: "BANK",   label: "Bank Transfer",    Icon: BankIcon },
  { value: "CHEQUE", label: "Cheque",           Icon: ChequeIcon },
  { value: "ONLINE", label: "Online (Gateway)", Icon: GlobeIcon },
];

const TABS = ["General", "Credentials", "Payment Modes", "Webhook"] as const;
type Tab = (typeof TABS)[number];

// ── Component ────────────────────────────────────────────────

export default function PaymentSettings() {
  const { config, reload: reloadConfig } = useConfig();

  const [tab, setTab] = useState<Tab>("General");
  const [cfg, setCfg] = useState<GatewayConfig>({
    provider: "MANUAL",
    mode: "TEST",
    keyId: "",
    active: false,
    enabledModes: ["CASH", "CARD", "UPI", "BANK", "CHEQUE", "ONLINE"],
  });

  // Credential fields (write-only — never pre-filled from API)
  const [keyIdInput, setKeyIdInput]     = useState("");
  const [secretInput, setSecretInput]   = useState("");
  const [webhookInput, setWebhookInput] = useState("");
  const [showSecret, setShowSecret]     = useState(false);

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [msg, setMsg]           = useState("");
  const [error, setError]       = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // ── Fetch current config ───────────────────────────────────
  useEffect(() => {
    api
      .get("/payments/config")
      .then((r) => {
        setCfg({
          provider:     r.data.provider    ?? "MANUAL",
          mode:         r.data.mode        ?? "TEST",
          keyId:        r.data.keyId       ?? "",
          active:       r.data.active      ?? false,
          enabledModes: r.data.enabledModes ?? ["CASH","CARD","UPI","BANK","CHEQUE","ONLINE"],
        });
      })
      .catch(() => {/* use defaults */})
      .finally(() => setLoading(false));
  }, []);

  // ── Save ───────────────────────────────────────────────────
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");

    const body: Record<string, any> = {
      provider:     cfg.provider,
      mode:         cfg.mode,
      active:       cfg.active,
      enabledModes: cfg.enabledModes,
    };
    if (keyIdInput.trim())    body.keyId        = keyIdInput.trim();
    if (secretInput.trim())   body.keySecret    = secretInput.trim();
    if (webhookInput.trim())  body.webhookSecret= webhookInput.trim();

    try {
      const r = await api.put("/payments/config", body);
      setCfg((prev) => ({
        ...prev,
        provider:     r.data.provider,
        mode:         r.data.mode,
        active:       r.data.active,
        enabledModes: r.data.enabledModes,
        keyId:        r.data.keyId,
      }));
      setKeyIdInput("");
      setSecretInput("");
      setWebhookInput("");
      setMsg("Payment settings saved successfully.");
      await reloadConfig(); // sync onlinePayments feature flag to sidebar
    } catch (err) {
      setError(parseApiError(err, "We couldn't save your payment settings.").message);
    } finally {
      setSaving(false);
    }
  }

  // ── Test connection ────────────────────────────────────────
  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    setError("");
    try {
      const r = await api.post("/payments/config/test");
      setTestResult({ ok: r.data.ok, message: r.data.message });
    } catch (err) {
      setTestResult({
        ok: false,
        message: parseApiError(err, "Connection test failed.").message,
      });
    } finally {
      setTesting(false);
    }
  }

  // ── Toggle a payment mode ─────────────────────────────────
  function toggleMode(mode: PayMode) {
    setCfg((prev) => {
      const has = prev.enabledModes.includes(mode);
      if (has && prev.enabledModes.length === 1) return prev; // keep at least one
      return {
        ...prev,
        enabledModes: has
          ? prev.enabledModes.filter((m) => m !== mode)
          : [...prev.enabledModes, mode],
      };
    });
  }

  // ── Webhook URL (copy-to-clipboard) ──────────────────────
  const schoolSlug = config?.slug ?? "";
  const webhookUrl = `${window.location.origin}/api/payments/webhook/${schoolSlug}`;

  async function copyWebhook() {
    await navigator.clipboard.writeText(webhookUrl);
    setMsg("Webhook URL copied to clipboard!");
    setTimeout(() => setMsg(""), 3000);
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Online Payment Settings" />
      <p className="text-sm text-slate-500 -mt-4 mb-6">
        Configure how your school collects fees online. All settings are specific to your school.
      </p>

      {/* Status banner */}
      <div
        className={`mb-6 flex items-center gap-3 rounded-xl px-5 py-4 text-sm font-medium ${
          cfg.active
            ? "bg-green-50 border border-green-200 text-green-800"
            : "bg-amber-50 border border-amber-200 text-amber-800"
        }`}
      >
        <span className="text-xl">{cfg.active ? "✅" : "⚠️"}</span>
        <div>
          {cfg.active ? (
            <>
              Online payments are <strong>active</strong> —{" "}
              <strong>{cfg.provider}</strong> in{" "}
              <strong>{cfg.mode}</strong> mode. Guardians can pay fees online.
            </>
          ) : (
            <>
              Online payments are <strong>inactive</strong>. Configure a
              gateway and enable it below to let guardians pay online.
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setCfg((p) => ({ ...p, active: !p.active }));
            setMsg("");
          }}
          className={`ml-auto rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
            cfg.active
              ? "bg-red-100 hover:bg-red-200 text-red-700"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {cfg.active ? "Disable" : "Enable"} Gateway
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              tab === t
                ? "bg-white border border-b-white border-slate-200 text-primary-600 -mb-px"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={save} className="space-y-6 max-w-2xl">
        {/* ── Tab: General ─────────────────────────────────── */}
        {tab === "General" && (
          <section className="card p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-slate-700 mb-1">
                Payment Provider
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Choose the gateway your school uses to collect online payments.
                Switch to <strong>Manual</strong> if you only collect offline.
              </p>
              <div className="grid grid-cols-1 gap-3">
                {PROVIDERS.map((p) => (
                  <label
                    key={p.value}
                    className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition ${
                      cfg.provider === p.value
                        ? "border-primary-500 bg-primary-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="provider"
                      value={p.value}
                      checked={cfg.provider === p.value}
                      onChange={() =>
                        setCfg((prev) => ({ ...prev, provider: p.value }))
                      }
                      className="mt-1 accent-primary-600"
                    />
                    <div>
                      <div className="font-medium text-slate-800">
                        {p.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {p.hint}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {cfg.provider !== "MANUAL" && (
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">
                  Gateway Mode
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Use <strong>TEST</strong> while setting up — no real money
                  moves. Switch to <strong>LIVE</strong> when ready.
                </p>
                <div className="flex gap-3">
                  {(["TEST", "LIVE"] as GatewayMode[]).map((m) => (
                    <label
                      key={m}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 cursor-pointer font-medium text-sm transition ${
                        cfg.mode === m
                          ? m === "LIVE"
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-slate-200 hover:border-slate-300 text-slate-500"
                      }`}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value={m}
                        checked={cfg.mode === m}
                        onChange={() =>
                          setCfg((prev) => ({ ...prev, mode: m }))
                        }
                        className="sr-only"
                      />
                      {m === "TEST" ? "🧪 Test Mode" : "🚀 Live Mode"}
                    </label>
                  ))}
                </div>
                {cfg.mode === "LIVE" && (
                  <p className="text-xs text-amber-600 mt-2 font-medium">
                    ⚠️ Live mode — real transactions will be processed. Make
                    sure your credentials are correct before saving.
                  </p>
                )}
              </div>
            )}

            {/* Test connection */}
            {cfg.provider !== "MANUAL" && (
              <div>
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={testing}
                  className="btn-ghost text-sm"
                >
                  {testing ? "Testing…" : "🔌 Test Gateway Connection"}
                </button>
                {testResult && (
                  <div
                    className={`mt-2 text-sm rounded-lg px-4 py-2 ${
                      testResult.ok
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {testResult.ok ? "✅ " : "❌ "}
                    {testResult.message}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Tab: Credentials ─────────────────────────────── */}
        {tab === "Credentials" && (
          <section className="card p-6 space-y-5">
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              🔒 <strong>Security note:</strong> Credentials are stored
              server-side and never returned. The form fields are
              write-only — paste new values only when you need to update
              them.
            </div>

            {cfg.provider === "MANUAL" ? (
              <p className="text-slate-500 text-sm">
                Manual mode does not require API credentials.
              </p>
            ) : (
              <>
                <div>
                  <label className="label">
                    Key ID / Publishable Key
                    {cfg.keyId && (
                      <span className="ml-2 text-xs text-slate-400 font-normal">
                        Current: <code>{cfg.keyId}</code>
                      </span>
                    )}
                  </label>
                  <input
                    className="input font-mono"
                    type="text"
                    placeholder={
                      cfg.provider === "RAZORPAY"
                        ? "rzp_test_xxxxxxxxxxxx"
                        : "pk_test_xxxxxxxxxxxx"
                    }
                    value={keyIdInput}
                    onChange={(e) => setKeyIdInput(e.target.value)}
                    autoComplete="off"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {cfg.provider === "RAZORPAY"
                      ? "Found in Razorpay Dashboard → Settings → API Keys."
                      : "Your publishable / API key from the gateway dashboard."}
                  </p>
                </div>

                <div>
                  <label className="label">Secret Key</label>
                  <div className="relative">
                    <input
                      className="input font-mono pr-10"
                      type={showSecret ? "text" : "password"}
                      placeholder="Paste new secret key to update"
                      value={secretInput}
                      onChange={(e) => setSecretInput(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                      onClick={() => setShowSecret((s) => !s)}
                    >
                      {showSecret ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Never share this key. Leave blank to keep the existing
                    secret.
                  </p>
                </div>

                <div>
                  <label className="label">Webhook Secret</label>
                  <input
                    className="input font-mono"
                    type="password"
                    placeholder="Paste webhook secret to update"
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Used to verify Razorpay webhook signatures. Set this in
                    your Razorpay webhook settings. Leave blank to keep the
                    existing value.
                  </p>
                </div>
              </>
            )}
          </section>
        )}

        {/* ── Tab: Payment Modes ───────────────────────────── */}
        {tab === "Payment Modes" && (
          <section className="card p-6">
            <h3 className="font-semibold text-slate-700 mb-1">
              Enabled Payment Modes
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Choose which payment methods your school accepts. These appear
              in the fee payment dialog for admins and the parent portal.
              At least one mode must be enabled.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_MODES.map((m) => {
                const enabled = cfg.enabledModes.includes(m.value);
                const isLast  = enabled && cfg.enabledModes.length === 1;
                return (
                  <button
                    key={m.value}
                    type="button"
                    disabled={isLast}
                    onClick={() => toggleMode(m.value)}
                    title={isLast ? "At least one mode must be enabled" : ""}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition ${
                      enabled
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    } ${isLast ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <m.Icon className="w-6 h-6" />
                    <span>{m.label}</span>
                    {enabled ? (
                      <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><CheckIcon className="w-3 h-3" /> Enabled</span>
                    ) : (
                      <span className="text-xs text-slate-400">Disabled</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-4">
              <span className="flex items-center gap-1.5"><InfoIcon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /> Enable <strong>Online (Gateway)</strong> only after configuring your gateway credentials.</span>
            </p>
          </section>
        )}

        {/* ── Tab: Webhook ──────────────────────────────────── */}
        {tab === "Webhook" && (
          <section className="card p-6 space-y-5">
            <h3 className="font-semibold text-slate-700 mb-1">
              Webhook Configuration
            </h3>
            <p className="text-xs text-slate-500">
              Paste this URL into your{" "}
              {cfg.provider === "RAZORPAY" ? "Razorpay" : "payment gateway"}{" "}
              dashboard's webhook settings. When a payment succeeds, the
              gateway will call this URL and we'll automatically record it in
              the fee ledger.
            </p>

            <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
              <code className="text-xs text-slate-700 break-all flex-1">
                {webhookUrl}
              </code>
              <button
                type="button"
                onClick={copyWebhook}
                className="btn-ghost text-sm whitespace-nowrap"
              >
                <CopyIcon className="w-3.5 h-3.5 mr-1 inline" /> Copy
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <p className="font-medium">Setup steps:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                {cfg.provider === "RAZORPAY" ? (
                  <>
                    <li>Log in to your <a href="https://dashboard.razorpay.com" target="_blank" rel="noreferrer" className="text-primary-600 underline">Razorpay Dashboard</a>.</li>
                    <li>Go to <strong>Settings → Webhooks</strong>.</li>
                    <li>Click <strong>Add New Webhook</strong> and paste the URL above.</li>
                    <li>Select the <code>payment.captured</code> event.</li>
                    <li>Set a <strong>Secret</strong> and save the same value in the <em>Webhook Secret</em> field under the <strong>Credentials</strong> tab.</li>
                    <li>Save. Payments will now auto-record in the fee ledger.</li>
                  </>
                ) : (
                  <>
                    <li>Log in to your payment gateway dashboard.</li>
                    <li>Find the webhook / IPN settings.</li>
                    <li>Paste the URL above as the callback endpoint.</li>
                    <li>Enable payment-success / captured events.</li>
                    <li>Save the webhook secret in the <strong>Credentials</strong> tab.</li>
                  </>
                )}
              </ol>
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
              <InfoIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span><strong>Test your webhook:</strong> Use Razorpay's "Test Webhook" button or send a test event from your gateway dashboard to verify the setup before going live.</span>
            </div>
          </section>
        )}

        {/* ── Save bar ──────────────────────────────────────── */}
        <div className="flex items-center gap-4 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "💾 Save Payment Settings"}
          </button>
          {msg && (
            <span className="text-sm text-green-600 font-medium">{msg}</span>
          )}
        </div>

        {error && <FormError message={error} />}
      </form>

      {/* ── Info cards ──────────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
        <InfoCard
          icon="🔐"
          title="Secure by design"
          body="Secret keys are never returned to the browser. They're stored server-side and only used for server-to-gateway API calls."
        />
        <InfoCard
          icon="🧪"
          title="Always test first"
          body="Use TEST mode with your gateway's test credentials before switching to LIVE. No real money is moved in test mode."
        />
        <InfoCard
          icon="🏫"
          title="Per-school config"
          body="Each school has its own gateway configuration. One school's keys never affect another school."
        />
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-semibold text-sm text-slate-700 mb-1">{title}</div>
      <div className="text-xs text-slate-500">{body}</div>
    </div>
  );
}
