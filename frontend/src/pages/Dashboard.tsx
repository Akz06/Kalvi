import { useEffect, useState } from "react";
import { api } from "../api/client";
import { PageHeader, Spinner } from "../components/ui";
import { money } from "../lib/format";
import { useConfig } from "../context/ConfigContext";

interface Stats {
  students: number;
  staff: number;
  classes: number;
  sections: number;
  exams: number;
  outstandingFees: number;
  presentToday: number;
}

const cards = [
  { key: "students", label: "Students", icon: "👨‍🎓", color: "bg-blue-50 text-blue-700" },
  { key: "staff", label: "Staff", icon: "👩‍🏫", color: "bg-green-50 text-green-700" },
  { key: "classes", label: "Classes", icon: "🏫", color: "bg-purple-50 text-purple-700" },
  { key: "sections", label: "Sections", icon: "🗂️", color: "bg-amber-50 text-amber-700" },
  { key: "exams", label: "Exams", icon: "📝", color: "bg-pink-50 text-pink-700" },
  { key: "presentToday", label: "Present Today", icon: "✅", color: "bg-emerald-50 text-emerald-700" },
] as const;

export default function Dashboard() {
  const { config } = useConfig();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data));
  }, []);

  if (!stats) return <Spinner />;

  const currency = config?.settings?.currency ?? "INR";
  const locale = config?.settings?.locale ?? "en-IN";

  return (
    <div>
      <PageHeader title={`${config?.name ?? "School"} Dashboard`} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <div key={c.key} className="card p-5">
            <div className={`inline-flex rounded-lg p-2 text-xl ${c.color}`}>
              {c.icon}
            </div>
            <p className="mt-3 text-3xl font-bold">{(stats as any)[c.key]}</p>
            <p className="text-sm text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-6 mt-6 max-w-sm">
        <p className="text-sm text-slate-500">Outstanding Fees</p>
        <p className="mt-1 text-3xl font-bold text-red-600">
          {money(stats.outstandingFees, currency, locale)}
        </p>
      </div>
    </div>
  );
}
