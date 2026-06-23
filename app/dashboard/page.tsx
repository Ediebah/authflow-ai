import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import DashboardCharts, {
  type ActivityDay, type TypeSlice, type PayerBar,
  type WeekBar, type FlaggedDoc,
} from "@/components/dashboard/DashboardCharts";

// ── Synthetic demo data shown when a user has fewer than 3 real documents ──────
function buildDemoData(): {
  activityByDay: ActivityDay[];
  byType: TypeSlice[];
  byPayer: PayerBar[];
  byWeek: WeekBar[];
  recentFlagged: FlaggedDoc[];
} {
  // 30 days of realistic document activity
  const activityByDay: ActivityDay[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    // simulate ramp-up usage with some weekend dips
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const base = Math.round(2 + i * 0.3 + Math.sin(i * 0.7) * 2);
    return { date: label, docs: isWeekend ? Math.max(0, base - 3) : base };
  });

  const byType: TypeSlice[] = [
    { label: "Prior Auth",            value: 47, color: "#1652F0" },
    { label: "Appeal",                value: 18, color: "#F59E0B" },
    { label: "Patient Instructions",  value: 22, color: "#14B8A6" },
  ];

  const byPayer: PayerBar[] = [
    { payer: "UnitedHealthcare", count: 21 },
    { payer: "Humana",           count: 17 },
    { payer: "Aetna",            count: 14 },
    { payer: "BCBS",             count: 10 },
    { payer: "Cigna",            count:  7 },
  ];

  const byWeek: WeekBar[] = Array.from({ length: 8 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (7 - i) * 7);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const total   = Math.round(6 + i * 2.2 + Math.random() * 3);
    const flagged = Math.round(total * 0.08);
    return { week: label, total, flagged };
  });

  const recentFlagged: FlaggedDoc[] = [
    { id: "demo-1", type: "prior_auth",           created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
    { id: "demo-2", type: "patient_instructions", created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  ];

  return { activityByDay, byType, byPayer, byWeek, recentFlagged };
}

// ── Real data aggregation ─────────────────────────────────────────────────────
function aggregateActivity(docs: { created_at: string }[]): ActivityDay[] {
  const map: Record<string, number> = {};
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    map[key] = 0;
  }
  for (const doc of docs) {
    const key = new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (key in map) map[key]++;
  }
  return Object.entries(map).map(([date, docs]) => ({ date, docs }));
}

function aggregateByType(docs: { type: string }[]): TypeSlice[] {
  const map: Record<string, number> = { prior_auth: 0, appeal: 0, patient_instructions: 0 };
  for (const doc of docs) if (doc.type in map) map[doc.type]++;
  return [
    { label: "Prior Auth",           value: map.prior_auth,           color: "#1652F0" },
    { label: "Appeal",               value: map.appeal,               color: "#F59E0B" },
    { label: "Patient Instructions", value: map.patient_instructions, color: "#14B8A6" },
  ].filter(t => t.value > 0);
}

function aggregateByPayer(docs: { type: string; input_payload: Record<string, string> }[]): PayerBar[] {
  const map: Record<string, number> = {};
  for (const doc of docs) {
    if (doc.type !== "prior_auth" && doc.type !== "appeal") continue;
    const payer = doc.input_payload?.payer?.trim();
    if (!payer) continue;
    map[payer] = (map[payer] ?? 0) + 1;
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([payer, count]) => ({ payer, count }));
}

function aggregateByWeek(docs: { created_at: string; flagged: boolean }[]): WeekBar[] {
  const weeks: Record<string, { total: number; flagged: number }> = {};
  for (let i = 7; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i * 7);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    weeks[key] = { total: 0, flagged: 0 };
  }
  for (const doc of docs) {
    const d = new Date(doc.created_at);
    const daysSince = Math.floor((Date.now() - d.getTime()) / 86400000);
    const weekIdx = Math.floor(daysSince / 7);
    if (weekIdx > 7) continue;
    const refDate = new Date(); refDate.setDate(refDate.getDate() - weekIdx * 7);
    const key = refDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (key in weeks) {
      weeks[key].total++;
      if (doc.flagged) weeks[key].flagged++;
    }
  }
  return Object.entries(weeks).map(([week, v]) => ({ week, ...v }));
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function DashboardHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const weekAgo     = new Date(Date.now() - 7  * 86400000).toISOString();
  const ninetyDays  = new Date(Date.now() - 90 * 86400000).toISOString();

  const [
    { count: total },
    { count: thisWeek },
    { count: flaggedCount },
    { data: recentDocs },
    { data: profile },
    { data: allDocs },
    { data: flaggedDocs },
  ] = await Promise.all([
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("user_id", user!.id).gte("created_at", weekAgo),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("flagged", true),
    supabase.from("documents").select("id, type, flagged, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("profiles").select("name").eq("id", user!.id).single(),
    supabase.from("documents").select("id, type, flagged, created_at, input_payload").eq("user_id", user!.id).gte("created_at", ninetyDays).order("created_at", { ascending: true }).limit(500),
    supabase.from("documents").select("id, type, created_at").eq("user_id", user!.id).eq("flagged", true).order("created_at", { ascending: false }).limit(5),
  ]);

  const totalVal    = total    ?? 0;
  const thisWeekVal = thisWeek ?? 0;
  const flaggedVal  = flaggedCount ?? 0;
  const hasProfile  = Boolean(profile?.name);
  const hasDoc      = totalVal > 0;
  const greeting    = profile?.name ? `Welcome back, ${profile.name.split(" ")[0]}` : "Welcome back";
  const useDemo     = totalVal < 3;

  // Build chart data — real or demo
  const chartData = useDemo
    ? buildDemoData()
    : {
        activityByDay:  aggregateActivity(allDocs ?? []),
        byType:         aggregateByType(allDocs ?? []),
        byPayer:        aggregateByPayer((allDocs ?? []) as { type: string; input_payload: Record<string, string> }[]),
        byWeek:         aggregateByWeek(allDocs ?? []),
        recentFlagged:  (flaggedDocs ?? []) as FlaggedDoc[],
      };

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{greeting}</h1>
            {useDemo && (
              <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
                Demo data
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {useDemo
              ? "Sample data shown — generate your first document to see real stats"
              : "Your AI-generated clinical documents"}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/prior-auth"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Prior Auth
          </Link>
          <Link href="/dashboard/patient-instructions"
            className="inline-flex items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Instructions
          </Link>
        </div>
      </div>

      {/* Charts grid */}
      <DashboardCharts
        {...chartData}
        totalDocs={useDemo ? 87 : totalVal}
        thisWeek={useDemo ? 14 : thisWeekVal}
        flaggedCount={useDemo ? 2 : flaggedVal}
      />

      {/* Onboarding + recent docs below charts */}
      {(!hasDoc || !hasProfile) && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <OnboardingChecklist hasProfile={hasProfile} hasDoc={hasDoc} />

          {recentDocs && recentDocs.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
              <p className="text-sm font-semibold text-white mb-4">Recent Documents</p>
              <div className="flex flex-col gap-2">
                {recentDocs.map(doc => (
                  <Link key={doc.id} href="/dashboard/history"
                    className="flex items-center justify-between rounded-xl border border-white/8 px-4 py-3 hover:bg-white/[0.04] transition-all text-xs">
                    <span className={`font-semibold px-2.5 py-1 rounded-full ${
                      doc.type === "prior_auth" ? "bg-blue-500/15 text-blue-400 border border-blue-500/20" :
                      doc.type === "appeal" ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" :
                      "bg-teal-500/15 text-teal-400 border border-teal-500/20"
                    }`}>
                      {{ prior_auth: "Prior Auth", appeal: "Appeal", patient_instructions: "Patient Instructions" }[doc.type as string] ?? doc.type}
                    </span>
                    <span className="text-slate-600">
                      {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
