import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/context/TenantContext";
import { tenantPath } from "@/utils/tenantPath";
import { Loader2, TrendingUp, ClipboardList, CheckCircle, Clock, XCircle, Building2, MapPin, BarChart3, PieChartIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

// ── Color palettes ─────────────────────────────────────────────────────────────
const DOMAIN_COLORS: Record<string, string> = {
  education:            "#6366f1",
  healthcare:           "#ec4899",
  agriculture:          "#22c55e",
  water_management:     "#3b82f6",
  environment:          "#10b981",
  energy:               "#f59e0b",
  urban_infrastructure: "#8b5cf6",
  accessibility:        "#06b6d4",
  public_service:       "#f97316",
  rural_livelihoods:    "#84cc16",
  sanitation:           "#14b8a6",
};

const STATUS_COLORS: Record<string, string> = {
  pending:     "#f59e0b",
  validated:   "#3b82f6",
  assigned:    "#8b5cf6",
  in_progress: "#f97316",
  resolved:    "#22c55e",
  rejected:    "#ef4444",
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>{`${(percent * 100).toFixed(0)}%`}</text>;
};

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: number | string; icon: any; color: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function GovtAnalytics() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate(tenantPath(tenant?.slug || "", "/"), { replace: true });
    }
  }, [adminLoading, isAdmin]);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: subs }, { data: projs }] = await Promise.all([
      supabase.from("citizen_submissions").select("status,domain,priority,location_district,created_at,assigned_tenant_id"),
      supabase.from("university_projects").select("status,tenant_id,created_at,ip_filed,startup_created"),
    ]);
    if (subs) setSubmissions(subs);
    if (projs) setProjects(projs);
    setLoading(false);
  };

  // ── Derived stats ────────────────────────────────────────────────────────────

  const total = submissions.length;
  const resolved = submissions.filter((s) => s.status === "resolved").length;
  const pending = submissions.filter((s) => s.status === "pending").length;
  const inProgress = submissions.filter((s) => s.status === "in_progress").length;
  const assigned = submissions.filter((s) => s.status === "assigned").length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Domain distribution
  const domainCounts: Record<string, number> = {};
  submissions.forEach((s) => {
    const d = s.domain || "other";
    domainCounts[d] = (domainCounts[d] || 0) + 1;
  });
  const domainData = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name: name.replace(/_/g, " "), value, fill: DOMAIN_COLORS[name] || "#94a3b8" }));

  // Status distribution
  const statusCounts: Record<string, number> = {};
  submissions.forEach((s) => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts)
    .map(([name, value]) => ({ name: name.replace(/_/g, " "), value, fill: STATUS_COLORS[name] || "#94a3b8" }));

  // District distribution (top 10)
  const districtCounts: Record<string, number> = {};
  submissions.forEach((s) => {
    if (s.location_district) districtCounts[s.location_district] = (districtCounts[s.location_district] || 0) + 1;
  });
  const districtData = Object.entries(districtCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([district, count]) => ({ district, count }));

  // Priority breakdown
  const priorityCounts: Record<string, number> = {};
  submissions.forEach((s) => { priorityCounts[s.priority] = (priorityCounts[s.priority] || 0) + 1; });
  const priorityData = ["critical", "high", "medium", "low"].map((p) => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    count: priorityCounts[p] || 0,
    fill: p === "critical" ? "#ef4444" : p === "high" ? "#f97316" : p === "medium" ? "#f59e0b" : "#94a3b8",
  }));

  // Monthly trend (last 6 months)
  const now = new Date();
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    const count = submissions.filter((s) => {
      const c = new Date(s.created_at);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    }).length;
    const resolvedCount = submissions.filter((s) => {
      const c = new Date(s.created_at);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth() && s.status === "resolved";
    }).length;
    return { month: label, submissions: count, resolved: resolvedCount };
  });

  // Project outcomes
  const ipFiled = projects.filter((p) => p.ip_filed).length;
  const startups = projects.filter((p) => p.startup_created).length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;

  if (adminLoading || loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-10 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-2">
            <BarChart3 className="w-4 h-4" />
            Government Analytics
          </div>
          <h1 className="text-3xl font-poppins font-bold mb-1">
            Jharkhand Innovation Portal — Dashboard
          </h1>
          <p className="text-primary-foreground/70">
            Real-time overview of societal problem submissions and resolution progress
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Submissions" value={total} icon={ClipboardList} color="text-blue-600 bg-blue-50" />
          <StatCard label="Pending Review" value={pending} icon={Clock} color="text-yellow-600 bg-yellow-50" />
          <StatCard label="Assigned" value={assigned} icon={Building2} color="text-purple-600 bg-purple-50" />
          <StatCard label="In Progress" value={inProgress} icon={TrendingUp} color="text-orange-600 bg-orange-50" />
          <StatCard label="Resolved" value={resolved} icon={CheckCircle} color="text-green-600 bg-green-50" />
          <StatCard label="Resolution Rate" value={`${resolutionRate}%`} icon={TrendingUp} color="text-teal-600 bg-teal-50" sub={`${resolved} of ${total}`} />
        </div>

        {/* Charts row 1 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Domain pie */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-primary" /> Submissions by Domain
            </h2>
            {domainData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={domainData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={renderCustomLabel}>
                    {domainData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} submissions`, ""]} />
                  <Legend formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status pie */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-primary" /> Submissions by Status
            </h2>
            {statusData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={renderCustomLabel}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} submissions`, ""]} />
                  <Legend formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Monthly trend */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Monthly Submission Trend (Last 6 Months)
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="submissions" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Submitted" />
              <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Charts row 2 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* District bar chart */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Top 10 Districts by Submissions
            </h2>
            {districtData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={districtData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="district" type="category" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Submissions" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Priority bar */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Submissions by Priority
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={priorityData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Count">
                  {priorityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* University project outcomes */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-5 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> University Project Outcomes
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Projects", value: projects.length, color: "text-blue-600 bg-blue-50" },
              { label: "Completed", value: completedProjects, color: "text-green-600 bg-green-50" },
              { label: "IPs Filed", value: ipFiled, color: "text-violet-600 bg-violet-50" },
              { label: "Startups Created", value: startups, color: "text-orange-600 bg-orange-50" },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl p-4 ${item.color}`}>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-sm font-medium mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Domain table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Domain-wise Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Domain</th>
                  <th className="text-right px-6 py-3 font-medium">Submissions</th>
                  <th className="text-right px-6 py-3 font-medium">Resolved</th>
                  <th className="text-right px-6 py-3 font-medium">Resolution Rate</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {domainData.map((d) => {
                  const domainKey = d.name.replace(/ /g, "_");
                  const resolvedD = submissions.filter((s) => s.domain === domainKey && s.status === "resolved").length;
                  const rate = d.value > 0 ? Math.round((resolvedD / d.value) * 100) : 0;
                  return (
                    <tr key={d.name} className="hover:bg-muted/40 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                          <span className="capitalize font-medium">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold">{d.value}</td>
                      <td className="px-6 py-3 text-right text-green-600 font-semibold">{resolvedD}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`font-semibold ${rate >= 50 ? "text-green-600" : rate >= 25 ? "text-yellow-600" : "text-red-500"}`}>
                          {rate}%
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="w-24 bg-muted rounded-full h-1.5 ml-auto">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${rate}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {domainData.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">No submissions yet</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
