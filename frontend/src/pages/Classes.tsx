import { useEffect, useState } from "react";
import { api } from "../api/client";
import { PageHeader, Spinner } from "../components/ui";

interface Section {
  id: string;
  name: string;
  teacher?: { firstName: string; lastName: string } | null;
  _count: { students: number };
}
interface Klass {
  id: string;
  level: number;
  name: string;
  sections: Section[];
}

export default function Classes() {
  const [classes, setClasses] = useState<Klass[] | null>(null);

  useEffect(() => {
    api.get("/classes").then((r) => setClasses(r.data));
  }, []);

  if (!classes) return <Spinner />;

  return (
    <div>
      <PageHeader title="Classes & Sections" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => (
          <div key={c.id} className="card p-5">
            <h3 className="font-semibold text-lg">{c.name}</h3>
            <div className="mt-3 space-y-2">
              {c.sections.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">Section {s.name}</span>
                  <span className="text-slate-500">
                    {s._count.students} students
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
