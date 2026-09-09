import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useTenant } from "@/context/TenantContext";
import { useNavigate } from "react-router-dom";
import { tenantPath } from "@/utils/tenantPath";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ClipboardList, CheckCircle, XCircle, ArrowRightCircle,
  MapPin, Building2, CalendarDays, Loader2, Eye,
  Filter, Search, AlertTriangle, Clock, Users, Flag
} from "lucide-react";
import { sendNotification } from "@/hooks/useNotifications";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Submission {
  id: string;
  title: string;
  description: string;
  detailed_description: string | null;
  domain: string;
  sub_domain: string | null;
  priority: string;
  status: string;
  tags: string[] | null;
  location_state: string;
  location_district: string;
  location_block: string | null;
  location_village: string | null;
  submitter_type: string;
  submitter_name: string;
  submitter_org_name: string | null;
  submitter_email: string | null;
  submitter_phone: string | null;
  photo_urls: string[] | null;
  document_urls: string[] | null;
  upvote_count: number;
  assigned_tenant_id: string | null;
  admin_notes: string | null;
  created_at: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending:     "bg-yellow-100 text-yellow-800 border-yellow-200",
  validated:   "bg-blue-100 text-blue-800 border-blue-200",
  assigned:    "bg-purple-100 text-purple-800 border-purple-200",
  in_progress: "bg-orange-100 text-orange-800 border-orange-200",
  resolved:    "bg-green-100 text-green-800 border-green-200",
  rejected:    "bg-red-100 text-red-800 border-red-200",
};

const PRIORITY_STYLES: Record<string, string> = {
  low:      "bg-slate-100 text-slate-600",
  medium:   "bg-yellow-100 text-yellow-700",
  high:     "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const STATUS_TABS = [
  { id: "pending",     label: "Pending",     icon: Clock },
  { id: "validated",   label: "Validated",   icon: CheckCircle },
  { id: "assigned",    label: "Assigned",    icon: ArrowRightCircle },
  { id: "in_progress", label: "In Progress", icon: Flag },
  { id: "resolved",    label: "Resolved",    icon: CheckCircle },
  { id: "rejected",    label: "Rejected",    icon: XCircle },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubmissionsQueue() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("pending");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDomain, setFilterDomain] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  // Detail/action dialog
  const [selected, setSelected] = useState<Submission | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [assignTenantId, setAssignTenantId] = useState("");

  // Counts per tab
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Guard
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate(tenantPath(tenant?.slug || "", "/"), { replace: true });
    }
  }, [adminLoading, isAdmin]);

  useEffect(() => {
    void loadAll();
    void loadTenants();
  }, []);

  useEffect(() => {
    void loadSubmissions();
  }, [activeTab]);

  const loadAll = async () => {
    // Load counts for all statuses
    const statuses = ["pending", "validated", "assigned", "in_progress", "resolved", "rejected"];
    const results = await Promise.all(
      statuses.map((s) =>
        supabase.from("citizen_submissions").select("id", { count: "exact", head: true }).eq("status", s)
      )
    );
    const c: Record<string, number> = {};
    statuses.forEach((s, i) => { c[s] = results[i].count ?? 0; });
    setCounts(c);
  };

  const loadSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("citizen_submissions")
      .select("*")
      .eq("status", activeTab)
      .order("created_at", { ascending: false });

    if (!error && data) setSubmissions(data as Submission[]);
    setLoading(false);
  };

  const loadTenants = async () => {
    const { data } = await supabase.from("tenants").select("id,name,slug").order("name");
    if (data) setTenants(data as Tenant[]);
  };

  const openDetail = (sub: Submission) => {
    setSelected(sub);
    setAdminNotes(sub.admin_notes || "");
    setAssignTenantId(sub.assigned_tenant_id || "");
    setRejectReason("");
    setDetailOpen(true);
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const updateStatus = async (id: string, status: string, extra: Record<string, any> = {}) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("citizen_submissions")
        .update({ status, ...extra, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // ── Notifications ────────────────────────────────────────
      const sub = selected!;

      if (status === "validated") {
        // Notify submitter's user (look up by email)
        if (sub.submitter_email) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", sub.submitter_email)
            .maybeSingle();
          if (profile?.id) {
            await sendNotification(
              profile.id,
              "Submission Validated ✅",
              `Your submission "${sub.title}" has been validated and is under review.`,
              "success",
              "/gcet/submit"
            );
          }
        }
      }

      if (status === "rejected") {
        if (sub.submitter_email) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", sub.submitter_email)
            .maybeSingle();
          if (profile?.id) {
            await sendNotification(
              profile.id,
              "Submission Not Accepted",
              `Your submission "${sub.title}" was not accepted. Reason: ${extra.admin_notes || "Not specified"}.`,
              "error"
            );
          }
        }
      }

      if (status === "assigned" && extra.assigned_tenant_id) {
        // Notify all university_admin users of the assigned tenant
        const { data: uniUsers } = await supabase
          .from("profiles")
          .select("id")
          .eq("tenant_id", extra.assigned_tenant_id)
          .in("role", ["university_admin", "faculty_mentor"] as any[]);
        if (uniUsers) {
          const uniName = tenants.find((t) => t.id === extra.assigned_tenant_id)?.name || "your university";
          await Promise.all(
            uniUsers.map((u: any) =>
              sendNotification(
                u.id,
                "New Problem Assigned 📋",
                `A new problem "${sub.title}" has been routed to ${uniName}. Review it in your University Dashboard.`,
                "info",
                "/gcet/university"
              )
            )
          );
        }
      }
      // ─────────────────────────────────────────────────────────

      toast.success(`Status updated to "${status.replace(/_/g, " ")}"`);
      setDetailOpen(false);
      await Promise.all([loadSubmissions(), loadAll()]);
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = () =>
    updateStatus(selected!.id, "validated", { admin_notes: adminNotes || null });

  const handleReject = () => {
    if (!rejectReason.trim()) { toast.error("Please enter a rejection reason"); return; }
    updateStatus(selected!.id, "rejected", { admin_notes: rejectReason });
  };

  const handleAssign = () => {
    if (!assignTenantId) { toast.error("Please select a university"); return; }
    updateStatus(selected!.id, "assigned", {
      assigned_tenant_id: assignTenantId,
      admin_notes: adminNotes || null,
    });
  };

  const handleReopen = () =>
    updateStatus(selected!.id, "pending", { admin_notes: null });

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = submissions.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.title.toLowerCase().includes(q) ||
      s.location_district.toLowerCase().includes(q) ||
      (s.submitter_org_name || s.submitter_name).toLowerCase().includes(q);
    const matchDomain = !filterDomain || s.domain === filterDomain;
    const matchPriority = !filterPriority || s.priority === filterPriority;
    return matchSearch && matchDomain && matchPriority;
  });

  // ── Render ───────────────────────────────────────────────────────────────────

  if (adminLoading) {
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
          <h1 className="text-3xl font-poppins font-bold mb-1">Submissions Routing Queue</h1>
          <p className="text-primary-foreground/70">
            Validate organizational submissions and route them to university partners
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {STATUS_TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  activeTab === t.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <p className="text-xl font-bold text-foreground">{counts[t.id] ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.label}</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center bg-card border border-border rounded-xl p-4">
          <div className="relative flex-1 min-w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search title, district, org..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Domains</option>
            {["education","healthcare","agriculture","water_management","environment",
              "energy","urban_infrastructure","accessibility","public_service","rural_livelihoods","sanitation"]
              .map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Priorities</option>
            {["low","medium","high","critical"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {(search || filterDomain || filterPriority) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterDomain(""); setFilterPriority(""); }}>
              Clear
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-border flex gap-1 overflow-x-auto">
          {STATUS_TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px ${
                  activeTab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {(counts[t.id] ?? 0) > 0 && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                    activeTab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {counts[t.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Submission list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl">
            <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium text-foreground">No {activeTab.replace(/_/g, " ")} submissions</p>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab === "pending" ? "New submissions from organizations will appear here." : "Nothing to show here yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((sub) => (
              <div
                key={sub.id}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => openDetail(sub)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_STYLES[sub.status] || ""}`}>
                        {sub.status.replace(/_/g, " ")}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_STYLES[sub.priority] || ""}`}>
                        {sub.priority}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground capitalize">
                        {sub.domain.replace(/_/g, " ")}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground line-clamp-1 mb-1">{sub.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{sub.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {sub.location_district}, {sub.location_state}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {sub.submitter_org_name || sub.submitter_name}
                        <span className="text-muted-foreground/60 capitalize">({sub.submitter_type.replace(/_/g, " ")})</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(sub.created_at).toLocaleDateString("en-IN")}
                      </span>
                      {sub.upvote_count > 0 && (
                        <span className="flex items-center gap-1 text-orange-600 font-medium">
                          ↑ {sub.upvote_count} upvotes
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="gap-1 text-xs flex-shrink-0">
                    <Eye className="w-3 h-3" /> View
                  </Button>
                </div>

                {/* Assigned university badge */}
                {sub.assigned_tenant_id && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-purple-700">
                    <ArrowRightCircle className="w-3.5 h-3.5" />
                    Assigned to: {tenants.find((t) => t.id === sub.assigned_tenant_id)?.name || sub.assigned_tenant_id}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Detail / Action Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-6 line-clamp-2">{selected?.title}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5 text-sm">
              {/* Meta */}
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_STYLES[selected.status] || ""}`}>
                  {selected.status.replace(/_/g, " ")}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_STYLES[selected.priority] || ""}`}>
                  {selected.priority}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted capitalize">
                  {selected.domain.replace(/_/g, " ")}
                </span>
              </div>

              {/* Description */}
              <div>
                <p className="font-semibold text-foreground mb-1">Description</p>
                <p className="text-muted-foreground">{selected.description}</p>
              </div>
              {selected.detailed_description && (
                <div>
                  <p className="font-semibold text-foreground mb-1">Detailed Description</p>
                  <p className="text-muted-foreground">{selected.detailed_description}</p>
                </div>
              )}

              {/* Location & Submitter */}
              <div className="grid sm:grid-cols-2 gap-4 bg-muted rounded-lg p-4">
                <div>
                  <p className="font-semibold text-foreground mb-1">Location</p>
                  <p className="text-muted-foreground">
                    {[selected.location_village, selected.location_block, selected.location_district, selected.location_state]
                      .filter(Boolean).join(", ")}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Submitted By</p>
                  <p className="text-muted-foreground">{selected.submitter_org_name || selected.submitter_name}</p>
                  <p className="text-muted-foreground/70 capitalize text-xs">{selected.submitter_type.replace(/_/g, " ")}</p>
                  {selected.submitter_email && <p className="text-xs text-muted-foreground">{selected.submitter_email}</p>}
                  {selected.submitter_phone && <p className="text-xs text-muted-foreground">{selected.submitter_phone}</p>}
                </div>
              </div>

              {/* Photos */}
              {selected.photo_urls && selected.photo_urls.length > 0 && (
                <div>
                  <p className="font-semibold text-foreground mb-2">Photos ({selected.photo_urls.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selected.photo_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="" className="w-full h-24 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {selected.document_urls && selected.document_urls.length > 0 && (
                <div>
                  <p className="font-semibold text-foreground mb-2">Documents</p>
                  <ul className="space-y-1">
                    {selected.document_urls.map((url, i) => (
                      <li key={i}>
                        <a href={url} target="_blank" rel="noreferrer" className="text-primary underline text-sm">
                          Document {i + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Admin notes */}
              {selected.admin_notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Admin Notes</p>
                  <p>{selected.admin_notes}</p>
                </div>
              )}

              {/* ── Actions based on status ── */}
              <div className="border-t border-border pt-4 space-y-4">

                {/* PENDING → Validate or Reject */}
                {selected.status === "pending" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="admin-notes">Internal Notes (optional)</Label>
                      <textarea
                        id="admin-notes"
                        rows={2}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        placeholder="Add internal notes about this submission..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reject-reason">Rejection Reason (required to reject)</Label>
                      <textarea
                        id="reject-reason"
                        rows={2}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        placeholder="Enter reason for rejection..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleValidate} disabled={actionLoading} className="gap-2 flex-1">
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Validate
                      </Button>
                      <Button variant="destructive" onClick={handleReject} disabled={actionLoading} className="gap-2 flex-1">
                        <XCircle className="w-4 h-4" /> Reject
                      </Button>
                    </div>
                  </>
                )}

                {/* VALIDATED → Assign to University */}
                {selected.status === "validated" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="assign-uni">Assign to University <span className="text-destructive">*</span></Label>
                      <select
                        id="assign-uni"
                        value={assignTenantId}
                        onChange={(e) => setAssignTenantId(e.target.value)}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select University / HEI</option>
                        {tenants.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes2">Routing Notes (optional)</Label>
                      <textarea
                        id="notes2"
                        rows={2}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        placeholder="Notes for the university team..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAssign} disabled={actionLoading} className="gap-2 flex-1">
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightCircle className="w-4 h-4" />}
                        Route to University
                      </Button>
                      <Button variant="outline" onClick={handleReject} disabled={actionLoading} className="gap-2">
                        <XCircle className="w-4 h-4" /> Reject
                      </Button>
                    </div>
                  </>
                )}

                {/* REJECTED → Reopen */}
                {selected.status === "rejected" && (
                  <Button variant="outline" onClick={handleReopen} disabled={actionLoading} className="gap-2 w-full">
                    <Clock className="w-4 h-4" /> Reopen as Pending
                  </Button>
                )}

                {/* ASSIGNED / IN_PROGRESS → info */}
                {(selected.status === "assigned" || selected.status === "in_progress") && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
                    <ArrowRightCircle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                    Routed to: <strong>{tenants.find((t) => t.id === selected.assigned_tenant_id)?.name || "Unknown"}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
