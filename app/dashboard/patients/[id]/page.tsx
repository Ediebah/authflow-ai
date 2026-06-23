import Link from "next/link";
import {
  DiseaseActivityChart,
  MedicationChart,
  WearablesChart,
  DiseaseClusterChart,
  BodyHeatmap,
} from "@/components/dashboard/PatientCharts";

// ── Synthetic demo patients ───────────────────────────────────────────────────
const PATIENTS: Record<string, {
  name: string;
  dob: string;
  mrn: string;
  diagnosis: string;
  physician: string;
  specialty: string;
  lastVisit: string;
  nextVisit: string;
  diseaseActivity: { year: string; score: number; forecast?: boolean }[];
  medications: { drug: string; dose: number; max: number }[];
  joints: { label: string; side: "L" | "R" | "both"; top: string; left: string; severity: "mild" | "moderate" | "severe" }[];
  clusters: { x: number; y: number; cluster: string; color: string }[];
  wearables: { day: string; steps: number }[];
  recommendations: string[];
  upcomingMeds: string[];
  milestones: { label: string; due: string; urgency: "ok" | "soon" | "overdue" }[];
}> = {
  "john-doe": {
    name: "John Doe",
    dob: "Mar 14, 1971 · Age 53",
    mrn: "MRN-00027689",
    diagnosis: "Rheumatoid Arthritis (M05.9)",
    physician: "Dr. A. Okafor, MD",
    specialty: "Rheumatology",
    lastVisit: "Apr 18, 2026",
    nextVisit: "Jun 15, 2026",
    diseaseActivity: [
      { year: "2019", score: 3.2 }, { year: "2020", score: 4.1 }, { year: "2021", score: 4.8 },
      { year: "2022", score: 3.9 }, { year: "2023", score: 2.8 }, { year: "2024", score: 2.1 },
      { year: "2025", score: 1.8 }, { year: "2026f", score: 1.4, forecast: true }, { year: "2027f", score: 1.1, forecast: true },
    ],
    medications: [
      { drug: "Methotrexate", dose: 72, max: 100 },
      { drug: "Abatacept",   dose: 58, max: 100 },
      { drug: "Prednisone",  dose: 24, max: 100 },
    ],
    joints: [
      { label: "L Shoulder", side: "L", top: "20%", left: "18%", severity: "moderate" },
      { label: "R Elbow",    side: "R", top: "42%", left: "92%", severity: "mild" },
      { label: "L Wrist",    side: "L", top: "57%", left: "5%",  severity: "severe" },
      { label: "R Knee",     side: "R", top: "79%", left: "64%", severity: "moderate" },
      { label: "L Ankle",    side: "L", top: "90%", left: "33%", severity: "mild" },
    ],
    clusters: [
      { x: -3, y:  2, cluster: "Joint Stiffness",        color: "#1652F0" },
      { x: -2, y:  3, cluster: "Joint Stiffness",        color: "#1652F0" },
      { x: -4, y:  1, cluster: "Joint Stiffness",        color: "#1652F0" },
      { x:  3, y:  4, cluster: "Polymyalgia-like",       color: "#7C3AED" },
      { x:  4, y:  3, cluster: "Polymyalgia-like",       color: "#7C3AED" },
      { x:  2, y:  5, cluster: "Polymyalgia-like",       color: "#7C3AED" },
      { x: -1, y: -3, cluster: "Erosive",                color: "#14B8A6" },
      { x:  0, y: -4, cluster: "Erosive",                color: "#14B8A6" },
      { x:  3, y: -2, cluster: "Undifferentiated",       color: "#F59E0B" },
      { x:  4, y: -3, cluster: "Undifferentiated",       color: "#F59E0B" },
      { x: -1, y: -1, cluster: "Low Activity",           color: "#6B7280" },
      { x:  0, y:  0, cluster: "Low Activity",           color: "#6B7280" },
    ],
    wearables: [
      { day: "Mon", steps: 4200 }, { day: "Tue", steps: 6100 }, { day: "Wed", steps: 3800 },
      { day: "Thu", steps: 7200 }, { day: "Fri", steps: 5500 }, { day: "Sat", steps: 8900 }, { day: "Sun", steps: 3200 },
    ],
    recommendations: ["Rituximab (next line)", "Abatacept — continue", "Low dose prednisone taper"],
    upcomingMeds: ["Physiotherapy · highly recommended", "Chiropractic · recommended", "Anti-inflammatory nutrition"],
    milestones: [
      { label: "Bone density scan due",             due: "in ~6 months", urgency: "ok" },
      { label: "Methotrexate lab panel",            due: "+2 weeks",     urgency: "soon" },
      { label: "Vaccination — Influenza",           due: "-1 month",     urgency: "overdue" },
      { label: "Ophthalmology referral (HCQ)",      due: "in ~3 months", urgency: "ok" },
    ],
  },
  "sarah-chen": {
    name: "Sarah Chen",
    dob: "Jul 3, 1985 · Age 40",
    mrn: "MRN-00031204",
    diagnosis: "Type 2 Diabetes (E11.9) + Hypertension (I10)",
    physician: "Dr. M. Patel, MD",
    specialty: "Endocrinology",
    lastVisit: "May 1, 2026",
    nextVisit: "Jul 10, 2026",
    diseaseActivity: [
      { year: "2019", score: 5.1 }, { year: "2020", score: 5.8 }, { year: "2021", score: 6.2 },
      { year: "2022", score: 5.5 }, { year: "2023", score: 4.3 }, { year: "2024", score: 3.7 },
      { year: "2025", score: 3.1 }, { year: "2026f", score: 2.6, forecast: true }, { year: "2027f", score: 2.0, forecast: true },
    ],
    medications: [
      { drug: "Metformin",   dose: 80, max: 100 },
      { drug: "Lisinopril",  dose: 45, max: 100 },
      { drug: "Atorvastatin",dose: 60, max: 100 },
    ],
    joints: [
      { label: "R Foot", side: "R", top: "93%", left: "67%", severity: "moderate" },
      { label: "L Foot", side: "L", top: "93%", left: "33%", severity: "mild" },
      { label: "L Hip",  side: "L", top: "54%", left: "24%", severity: "mild" },
    ],
    clusters: [
      { x: -2, y: 3, cluster: "Insulin Resistant",  color: "#F59E0B" },
      { x: -3, y: 2, cluster: "Insulin Resistant",  color: "#F59E0B" },
      { x:  3, y: 3, cluster: "MODY-like",          color: "#1652F0" },
      { x:  4, y: 2, cluster: "MODY-like",          color: "#1652F0" },
      { x: -1, y:-2, cluster: "Late Onset",         color: "#14B8A6" },
      { x:  0, y:-3, cluster: "Late Onset",         color: "#14B8A6" },
      { x:  2, y:-1, cluster: "Controlled",         color: "#6B7280" },
    ],
    wearables: [
      { day: "Mon", steps: 7800 }, { day: "Tue", steps: 9200 }, { day: "Wed", steps: 6400 },
      { day: "Thu", steps: 8100 }, { day: "Fri", steps: 7500 }, { day: "Sat", steps: 11200 }, { day: "Sun", steps: 5900 },
    ],
    recommendations: ["Continue Metformin 1000mg BID", "Add SGLT2 inhibitor (Empagliflozin)", "Increase aerobic activity"],
    upcomingMeds: ["Podiatry review · recommended", "Low-glycemic nutrition plan", "CPAP compliance check"],
    milestones: [
      { label: "HbA1c recheck",              due: "+3 weeks",     urgency: "soon" },
      { label: "Kidney function panel",       due: "in ~2 months", urgency: "ok" },
      { label: "Retinal exam (diabetic)",     due: "overdue",      urgency: "overdue" },
      { label: "Annual podiatry evaluation",  due: "in ~4 months", urgency: "ok" },
    ],
  },
  "marcus-williams": {
    name: "Marcus Williams",
    dob: "Nov 22, 1963 · Age 62",
    mrn: "MRN-00018847",
    diagnosis: "COPD (J44.1) + Heart Failure (I50.9)",
    physician: "Dr. J. Rivera, MD",
    specialty: "Pulmonology / Cardiology",
    lastVisit: "May 10, 2026",
    nextVisit: "Jun 3, 2026",
    diseaseActivity: [
      { year: "2018", score: 2.8 }, { year: "2019", score: 3.4 }, { year: "2020", score: 4.2 },
      { year: "2021", score: 4.9 }, { year: "2022", score: 4.5 }, { year: "2023", score: 3.8 },
      { year: "2024", score: 3.3 }, { year: "2025f", score: 3.0, forecast: true }, { year: "2026f", score: 2.6, forecast: true },
    ],
    medications: [
      { drug: "Tiotropium",  dose: 90, max: 100 },
      { drug: "Furosemide",  dose: 65, max: 100 },
      { drug: "Carvedilol",  dose: 50, max: 100 },
    ],
    joints: [
      { label: "Chest",   side: "both", top: "27%", left: "50%", severity: "severe" },
      { label: "L Ankle", side: "L",    top: "90%", left: "33%", severity: "moderate" },
      { label: "R Ankle", side: "R",    top: "90%", left: "67%", severity: "moderate" },
    ],
    clusters: [
      { x: -3, y: 4, cluster: "Emphysema-predominant", color: "#1652F0" },
      { x: -2, y: 3, cluster: "Emphysema-predominant", color: "#1652F0" },
      { x:  3, y:-2, cluster: "Chronic Bronchitis",    color: "#7C3AED" },
      { x:  4, y:-1, cluster: "Chronic Bronchitis",    color: "#7C3AED" },
      { x: -1, y:-3, cluster: "Mixed Phenotype",       color: "#F59E0B" },
      { x:  1, y: 2, cluster: "Mild-Moderate",         color: "#14B8A6" },
    ],
    wearables: [
      { day: "Mon", steps: 2100 }, { day: "Tue", steps: 1800 }, { day: "Wed", steps: 2500 },
      { day: "Thu", steps: 1400 }, { day: "Fri", steps: 2200 }, { day: "Sat", steps: 900 }, { day: "Sun", steps: 1600 },
    ],
    recommendations: ["Pulmonary rehab program", "Spiriva + LABA combo inhaler", "Salt restriction < 2g/day"],
    upcomingMeds: ["Pulmonary function test · due", "6-minute walk test", "Echocardiogram follow-up"],
    milestones: [
      { label: "Pulmonary function test",     due: "overdue",      urgency: "overdue" },
      { label: "Echocardiogram",              due: "+1 week",      urgency: "soon" },
      { label: "Influenza + Pneumococcal vax",due: "in ~2 months", urgency: "ok" },
      { label: "Cardiology follow-up",        due: "Jun 3, 2026",  urgency: "ok" },
    ],
  },
};

const URGENCY_STYLE: Record<string, string> = {
  ok:      "text-slate-400",
  soon:    "text-amber-400",
  overdue: "text-red-400",
};

function CardPanel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/8 bg-[#0D1117] flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
        <span className="text-xs font-semibold text-slate-300">{title}</span>
        <svg className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 cursor-pointer transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
        </svg>
      </div>
      <div className="flex-1 p-5">
        {children}
      </div>
    </div>
  );
}

export default async function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = PATIENTS[id];

  if (!patient) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
        Patient not found. <Link href="/dashboard/patients" className="text-blue-400 ml-2">← Back to patients</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      {/* Demo badge */}
      <div className="mb-5 flex items-center gap-3">
        <Link href="/dashboard/patients" className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          Patients
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-xs text-slate-400">{patient.name}</span>
        <span className="ml-auto text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
          Demo patient
        </span>
      </div>

      {/* Patient header */}
      <div className="flex items-start justify-between mb-6 rounded-2xl border border-white/8 bg-[#0D1117] px-6 py-5">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xl">
            {patient.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white tracking-wide">{patient.name.toUpperCase()}</h1>
              <button className="w-6 h-6 rounded-full bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs hover:bg-blue-600/25 transition-colors">+</button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{patient.dob} · {patient.diagnosis}</p>
            <p className="text-xs text-slate-600 mt-0.5">{patient.physician} · {patient.specialty}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-600 mb-1">Case number</p>
          <p className="text-sm font-mono font-semibold text-slate-300">{patient.mrn}</p>
          <div className="mt-3 flex gap-2 justify-end">
            <Link href={`/dashboard/prior-auth`}
              className="text-xs font-medium bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-all">
              + Prior Auth
            </Link>
            <Link href={`/dashboard/patient-instructions`}
              className="text-xs font-medium bg-teal-600/15 hover:bg-teal-600/25 text-teal-400 border border-teal-500/20 px-3 py-1.5 rounded-lg transition-all">
              + Instructions
            </Link>
          </div>
        </div>
      </div>

      {/* ── Row 1: Disease activity (2/5) + Body heatmap (1/5) + Disease cluster (2/5) ── */}
      <div className="grid grid-cols-5 gap-4 mb-4">

        {/* Disease activity – spans 2 cols */}
        <div className="col-span-5 lg:col-span-2 flex flex-col gap-4">
          <CardPanel title="Disease activity & forecast" className="flex-1" >
            <div style={{ height: 180 }}>
              <DiseaseActivityChart data={patient.diseaseActivity} />
            </div>
          </CardPanel>
          <CardPanel title="Current medication">
            <div style={{ height: 120 }}>
              <MedicationChart data={patient.medications} />
            </div>
          </CardPanel>
        </div>

        {/* Body heatmap – 1 col */}
        <div className="col-span-5 lg:col-span-1">
          <CardPanel title="Symptom heatmap" className="h-full">
            <BodyHeatmap joints={patient.joints} />
          </CardPanel>
        </div>

        {/* Disease cluster – 2 cols */}
        <div className="col-span-5 lg:col-span-2">
          <CardPanel title="Disease cluster" className="h-full">
            <div style={{ height: 320 }}>
              <DiseaseClusterChart data={patient.clusters} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...new Set(patient.clusters.map(c => c.cluster))].map(c => {
                const color = patient.clusters.find(d => d.cluster === c)?.color ?? "#888";
                return (
                  <div key={c} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    {c}
                  </div>
                );
              })}
            </div>
          </CardPanel>
        </div>
      </div>

      {/* ── Row 2: Medication forecast + Wearables + Disease management ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Medication forecast */}
        <CardPanel title="Medication forecast & recommendations">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold text-blue-400 mb-2">Recommended medications</p>
              <ul className="flex flex-col gap-1">
                {patient.recommendations.map(r => (
                  <li key={r} className="text-xs text-slate-400 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-teal-400 mb-2">Lifestyle recommendations</p>
              <ul className="flex flex-col gap-1">
                {patient.upcomingMeds.map(r => (
                  <li key={r} className="text-xs text-slate-400 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardPanel>

        {/* Wearables */}
        <CardPanel title="Wearables data · weekly steps">
          <div style={{ height: 180 }}>
            <WearablesChart data={patient.wearables} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Avg {Math.round(patient.wearables.reduce((s, d) => s + d.steps, 0) / patient.wearables.length).toLocaleString()} steps/day</span>
            <span className="text-slate-600">7-day window</span>
          </div>
        </CardPanel>

        {/* Disease management milestones */}
        <CardPanel title="Disease management">
          <div className="flex flex-col gap-3">
            {patient.milestones.map(m => (
              <div key={m.label} className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                    m.urgency === "overdue" ? "bg-red-400" :
                    m.urgency === "soon" ? "bg-amber-400" : "bg-teal-400"
                  }`} />
                  <span className="text-xs text-slate-300 leading-snug">{m.label}</span>
                </div>
                <span className={`text-xs font-medium flex-shrink-0 ${URGENCY_STYLE[m.urgency]}`}>
                  {m.due}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-white/5">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Visit info</p>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Last visit</span>
                <span className="text-slate-400">{patient.lastVisit}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Next visit</span>
                <span className="text-blue-400 font-medium">{patient.nextVisit}</span>
              </div>
            </div>
          </div>
        </CardPanel>
      </div>
    </div>
  );
}
