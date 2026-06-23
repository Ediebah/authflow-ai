import Link from "next/link";

const DEMO_PATIENTS = [
  {
    id: "john-doe",
    name: "John Doe",
    mrn: "MRN-00027689",
    age: 53,
    diagnosis: "Rheumatoid Arthritis",
    physician: "Dr. A. Okafor",
    lastVisit: "Apr 18, 2026",
    nextVisit: "Jun 15, 2026",
    activityScore: 1.8,
    trend: "improving",
    flagged: false,
  },
  {
    id: "sarah-chen",
    name: "Sarah Chen",
    mrn: "MRN-00031204",
    age: 40,
    diagnosis: "T2 Diabetes + Hypertension",
    physician: "Dr. M. Patel",
    lastVisit: "May 1, 2026",
    nextVisit: "Jul 10, 2026",
    activityScore: 3.1,
    trend: "improving",
    flagged: true,
  },
  {
    id: "marcus-williams",
    name: "Marcus Williams",
    mrn: "MRN-00018847",
    age: 62,
    diagnosis: "COPD + Heart Failure",
    physician: "Dr. J. Rivera",
    lastVisit: "May 10, 2026",
    nextVisit: "Jun 3, 2026",
    activityScore: 3.3,
    trend: "stable",
    flagged: true,
  },
];

const TREND_STYLE: Record<string, string> = {
  improving: "text-teal-400",
  stable:    "text-blue-400",
  worsening: "text-red-400",
};
const TREND_ICON: Record<string, string> = {
  improving: "↓",
  stable:    "→",
  worsening: "↑",
};

export default function PatientsPage() {
  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Patients</h1>
            <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
              Demo profiles
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Synthetic patient data for demonstration — showing how Clinica AI works per patient
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {DEMO_PATIENTS.map(p => (
          <Link
            key={p.id}
            href={`/dashboard/patients/${p.id}`}
            className="rounded-2xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.05] hover:border-blue-500/20 transition-all p-6 group"
          >
            <div className="flex items-center justify-between gap-6">
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-base flex-shrink-0">
                  {p.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{p.name}</p>
                    {p.flagged && (
                      <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        ⚠ Review needed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{p.mrn} · Age {p.age} · {p.physician}</p>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="hidden md:block flex-1">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-0.5">Diagnosis</p>
                <p className="text-xs text-slate-300">{p.diagnosis}</p>
              </div>

              {/* Activity score */}
              <div className="text-center hidden lg:block">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-0.5">Activity</p>
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-bold ${TREND_STYLE[p.trend]}`}>{TREND_ICON[p.trend]}</span>
                  <span className="text-sm font-semibold text-white">{p.activityScore}</span>
                </div>
              </div>

              {/* Visits */}
              <div className="text-right hidden lg:block">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-0.5">Next visit</p>
                <p className="text-xs text-blue-400 font-medium">{p.nextVisit}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Last: {p.lastVisit}</p>
              </div>

              {/* Arrow */}
              <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
