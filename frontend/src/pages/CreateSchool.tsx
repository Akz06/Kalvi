import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, parseApiError, type ApiFieldIssue } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { FormError, FieldHint } from "../components/ui";

export default function CreateSchool() {
  const { user, reloadUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    city: "",
    state: "",
    board: "CBSE",
    minClassLevel: 1,
    maxClassLevel: 12,
    sectionsPerClass: 2,
  });
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<ApiFieldIssue[]>([]);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function slugify(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIssues([]);

    if (form.minClassLevel > form.maxClassLevel) {
      setError("Lowest class cannot be higher than the highest class.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/schools", {
        name: form.name,
        slug: form.slug,
        city: form.city,
        state: form.state,
        board: form.board,
        minClassLevel: Number(form.minClassLevel),
        maxClassLevel: Number(form.maxClassLevel),
        sectionsPerClass: Number(form.sectionsPerClass),
      });
      // Reload user so schoolId is updated in context
      await reloadUser();
      navigate("/app", { replace: true });
    } catch (err) {
      const parsed = parseApiError(err, "Could not create school. Please try again.");
      setError(parsed.message);
      setIssues(parsed.issues);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-800 p-4">
      <div className="card w-full max-w-2xl p-8">
        <div className="text-center mb-6">
          <div className="text-4xl">🏫</div>
          <h1 className="text-2xl font-bold mt-2">
            {user?.schools && user.schools.length > 0
              ? "Add Another School"
              : "Set Up Your School"}
          </h1>
          <p className="text-sm text-slate-500">
            {user?.schools && user.schools.length > 0
              ? "You can manage multiple schools with one account."
              : "Let's get your school set up. This takes under 2 minutes."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {/* School Info */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="bg-brand-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
              School Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">School Name <span className="text-red-400">*</span></label>
                <input
                  className="input"
                  placeholder="e.g. Springdale High School"
                  value={form.name}
                  onChange={(e) => {
                    set("name", e.target.value);
                    if (!form.slug || form.slug === slugify(form.name)) {
                      set("slug", slugify(e.target.value));
                    }
                  }}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">School Code <span className="text-red-400">*</span></label>
                <input
                  className="input"
                  placeholder="e.g. springdale-high"
                  value={form.slug}
                  onChange={(e) =>
                    set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                  required
                />
                <FieldHint>
                  A short unique ID — staff use this to log in. Auto-filled from school name.
                  Only lowercase letters, numbers and hyphens.
                </FieldHint>
              </div>
              <div>
                <label className="label">City</label>
                <input
                  className="input"
                  placeholder="e.g. Chennai"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>
              <div>
                <label className="label">State</label>
                <input
                  className="input"
                  placeholder="e.g. Tamil Nadu"
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Curriculum Board</label>
                <select
                  className="input"
                  value={form.board}
                  onChange={(e) => set("board", e.target.value)}
                >
                  <option value="CBSE">CBSE</option>
                  <option value="STATE">State Board</option>
                  <option value="ICSE">ICSE</option>
                  <option value="IB">IB</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Class Structure */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="bg-brand-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
              Class Structure
              <span className="text-xs font-normal text-slate-400">(can be changed later)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">First Class</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={20}
                  value={form.minClassLevel}
                  onChange={(e) => set("minClassLevel", Number(e.target.value))}
                />
                <FieldHint>e.g. 1 for Class 1; 0 for LKG/Nursery</FieldHint>
              </div>
              <div>
                <label className="label">Last Class</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={20}
                  value={form.maxClassLevel}
                  onChange={(e) => set("maxClassLevel", Number(e.target.value))}
                />
                <FieldHint>e.g. 10 or 12</FieldHint>
              </div>
              <div>
                <label className="label">Sections per Class</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={10}
                  value={form.sectionsPerClass}
                  onChange={(e) => set("sectionsPerClass", Number(e.target.value))}
                />
                <FieldHint>e.g. 2 creates A and B per class</FieldHint>
              </div>
            </div>
          </div>

          <FormError message={error} issues={issues} />

          <div className="flex items-center justify-between pt-2">
            {user?.schools && user.schools.length > 0 ? (
              <button
                type="button"
                onClick={() => navigate("/app")}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                ← Back to dashboard
              </button>
            ) : (
              <span />
            )}
            <button className="btn-primary px-8" disabled={loading}>
              {loading ? "Creating school…" : "Create School →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
