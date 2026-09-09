import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useTenant } from "@/context/TenantContext";
import { tenantPath } from "@/utils/tenantPath";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ClipboardList, FolderKanban, Users, Flag, ChevronRight,
  CheckCircle, Clock, AlertTriangle, XCircle, MapPin,
  CalendarDays, Loader2, Plus, Eye, ArrowUpRight,
  Building2, BookOpen, GitBranch, Target
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Submission {
  id: string;
  title: string;
  description: string;
  domain: string;
  priority: string;
  status: string;
  location_district: string;
  location_state: string;
  submitter_org_name: string | null;
  submitter_name: string;
  submitter_type: string;
  created_at: string;
  upvote_count: number;
}

interface Project {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  expected_end_date: string | null;
  submission_id: string;
  ip_filed: boolean;
  startup_created: boolean;
  submission: { title: string; domain: string; location_district: string } | null;
  _memberCount?: number;
  _milestoneCount?: number;
}

interface Milestone {
  id: string;
  project_id: string;
  title: string;
  status: string;
  due_date: string | null;
  project: { title: string } | null;
}

// ── Status badge helper ───────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending:            "bg-yellow-100 text-yellow-800",
  validated:          "bg-blue-100 text-blue-800",
  assigned:           "bg-purple-100 text-purple-800",
  in_progress:        "bg-orange-100 text-orange-800",
  resolved:           "bg-green-100 text-green-800",
  rejected:           "bg-red-100 text-red-800",
  accepted:           "bg-blue-100 text-blue-800",
  proposal_submitted: "bg-indigo-100 text-indigo-800",
  completed:          "bg-green-100 text-green-800",
  dropped:            "bg-gray-100 text-gray-600",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

function Badge({ label, styleClass }: { label: string; styleClass: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styleClass}`}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "submissions", label: "Assigned Problems", icon: ClipboardList },
  { id: "projects",   label: "Projects",           icon: FolderKanban },
  { id: "milestones", label: "Milestones",          icon: Flag },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function UniversityDashboard() {
  const { user } = useAuth();
  const { isUniversityAdmin, isAdmin, loading: adminLoading } = useAdmin();
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const [tab, setTab] = useState("submissions");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Project dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [projectForm, setProjectForm] = useState({ title: "", objective: "", methodology: "", expected_end_date: "" });
  const [creating, setCreating] = useState(false);

  // ── Access guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!adminLoading && !isUniversityAdmin && !isAdmin) {
      navigate(tenantPath(tenant?.slug || "", "/auth"), { replace: true });
    }
  }, [adminLoading, isUniversityAdmin, isAdmin]);

  // ── Data loading ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tenant?.id) return;
    void loadAll();
  }, [tenant?.id]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadSubmissions(), loadProjects(), loadMilestones()]);
    setLoading(false);
  };

  const loadSubmissions = async () => {
    const { data, error } = await supabase
      .from("citizen_submissions")
      .select("id,title,description,domain,priority,status,location_district,location_state,submitter_org_name,submitter_name,submitter_type,created_at,upvote_count")
      .eq("assigned_tenant_id", tenant!.id)
      .order("created_at", { ascending: false });
    if (!error && data) setSubmissions(data as Submission[]);
  };

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from("university_projects")
      .select("id,title,status,start_date,expected_end_date,submission_id,ip_filed,startup_created,submission:citizen_submissions(title,domain,location_district)")
      .eq("tenant_id", tenant!.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Enrich with member & milestone counts
      const enriched = await Promise.all(
        (data as any[]).map(async (p) => {
          const [{ count: mc }, { count: ms }] = await Promise.all([
            supabase.from("project_team_members").select("id", { count: "exact", head: true }).eq("project_id", p.id),
            supabase.from("project_milestones").select("id", { count: "exact", head: true }).eq("project_id", p.id),
          ]);
          return { ...p, _memberCount: mc ?? 0, _milestoneCount: ms ?? 0 };
        })
      );
      setProjects(enriched as Project[]);
    }
  };

  const loadMilestones = async () => {
    // Get all milestones for projects of this university
    const { data: projectIds } = await supabase
      .from("university_projects")
      .select("id")
      .eq("tenant_id", tenant!.id);

    if (!projectIds || projectIds.length === 0) return;

    const ids = projectIds.map((p: any) => p.id);
    const { data, error } = await supabase
      .from("project_milestones")
      .select("id,project_id,title,status,due_date,project:university_projects(title)")
      .in("project_id", ids)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (!error && data) setMilestones(data as Milestone[]);
  };

  // ── Create project ──────────────────────────────────────────────────────────

  const openCreateProject = (sub: Submission) => {
    setSelectedSubmission(sub);
    setProjectForm({ title: `Project: ${sub.title}`, objective: "", methodology: "", expected_end_date: "" });
    setCreateOpen(true);
  };

  const handleCreateProject = async () => {
    if (!selectedSubmission || !tenant?.id || !user?.id) return;
    if (!projectForm.title.trim()) { toast.error("Project title is required"); return; }

    setCreating(true);
    try {
      const { error } = await supabase.from("university_projects").insert({
        submission_id: selectedSubmission.id,
        tenant_id: tenant.id,
        faculty_mentor_id: user.id,
        title: projectForm.title.trim(),
        objective: projectForm.objective.trim() || null,
        methodology: projectForm.methodology.trim() || null,
        expected_end_date: projectForm.expected_end_date || null,
        status: "accepted",
      });
      if (error) throw error;

      // Update submission status to in_progress
      await supabase.from("citizen_submissions").update({ status: "in_progress" }).eq("id", selectedSubmission.id);

      toast.success("Project created successfully!");
      setCreateOpen(false);
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  // ── Update milestone status ─────────────────────────────────────────────────

  const updateMilestone = async (id: string, status: string) => {
    const { error } = await supabase
      .from("project_milestones")
      .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) toast.error("Failed to update milestone");
    else { toast.success("Milestone updated"); await loadMilestones(); }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────

  const stats = [
    { label: "Assigned Problems", value: submissions.length, icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
    { label: "Active Projects", value: projects.filter((p) => p.status === "in_progress").length, icon: FolderKanban, color: "text-orange-600 bg-orange-50" },
    { label: "Completed Projects", value: projects.filter((p) => p.status === "completed").length, icon: CheckCircle, color: "text-green-600 bg-green-50" },
    { label: "Pending Milestones", value: milestones.filter((m) => m.status === "pending" || m.status === "in_progress").length, icon: Flag, color: "text-purple-600 bg-purple-50" },
  ];

  // ── Loading state ───────────────────────────────────────────────────────────

  if (adminLoading || loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Layout>
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-6 h-6 text-primary-foreground/80" />
            <span className="text-primary-foreground/80 text-sm font-medium">{tenant?.name}</span>
          </div>
          <h1 className="text-3xl font-poppins font-bold mb-1">University Dashboard</h1>
          <p className="text-primary-foreground/70">Manage assigned problems, projects, and milestones</p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card border border-border rounded-xl p-5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="border-b border-border flex gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Assigned Problems ── */}
        {tab === "submissions" && (
          <div className="space-y-4">
            {submissions.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No problems assigned yet"
                description="Problems routed to your university by the platform admin will appear here."
              />
            ) : (
              submissions.map((sub) => {
                const hasProject = projects.some((p) => p.submission_id === sub.id);
                return (
                  <div key={sub.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge label={sub.status} styleClass={STATUS_STYLES[sub.status] || "bg-gray-100 text-gray-700"} />
                          <Badge label={sub.priority} styleClass={PRIORITY_STYLES[sub.priority] || ""} />
                          <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-full">
                            {sub.domain.replace(/_/g, " ")}
                          </span>
                        </div>
                        <h3 className="font-semibold text-foreground line-clamp-2 mb-1">{sub.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{sub.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {sub.location_district}, {sub.location_state}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {sub.submitter_org_name || sub.submitter_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {new Date(sub.created_at).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <div className="flex sm:flex-col gap-2 flex-shrink-0">
                        {hasProject ? (
                          <Button size="sm" variant="outline" onClick={() => setTab("projects")} className="gap-1 text-xs">
                            <Eye className="w-3 h-3" /> View Project
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => openCreateProject(sub)} className="gap-1 text-xs">
                            <Plus className="w-3 h-3" /> Create Project
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Tab: Projects ── */}
        {tab === "projects" && (
          <div className="space-y-4">
            {projects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                description="Create a project from an assigned problem to start working on it."
              />
            ) : (
              projects.map((proj) => (
                <div key={proj.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge label={proj.status} styleClass={STATUS_STYLES[proj.status] || "bg-gray-100 text-gray-700"} />
                        {proj.ip_filed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                            <BookOpen className="w-3 h-3" /> IP Filed
                          </span>
                        )}
                        {proj.startup_created && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <ArrowUpRight className="w-3 h-3" /> Startup Created
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{proj.title}</h3>
                      {proj.submission && (
                        <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Problem: {proj.submission.title}
                          {proj.submission.location_district && ` · ${proj.submission.location_district}`}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {proj._memberCount} team member(s)
                        </span>
                        <span className="flex items-center gap-1">
                          <Flag className="w-3 h-3" /> {proj._milestoneCount} milestone(s)
                        </span>
                        {proj.expected_end_date && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            Due: {new Date(proj.expected_end_date).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" className="gap-1 text-xs"
                        onClick={() => setTab("milestones")}>
                        <Flag className="w-3 h-3" /> Milestones
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Tab: Milestones ── */}
        {tab === "milestones" && (
          <div className="space-y-4">
            {milestones.length === 0 ? (
              <EmptyState
                icon={Flag}
                title="No milestones yet"
                description="Milestones added to your projects will appear here for tracking."
              />
            ) : (
              milestones.map((ms) => {
                const isOverdue = ms.due_date && ms.status !== "completed" && new Date(ms.due_date) < new Date();
                return (
                  <div key={ms.id} className={`bg-card border rounded-xl p-4 ${isOverdue ? "border-red-200" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 mb-1">
                          <Badge label={ms.status} styleClass={STATUS_STYLES[ms.status] || "bg-gray-100 text-gray-700"} />
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                              <AlertTriangle className="w-3 h-3" /> Overdue
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-foreground">{ms.title}</h4>
                        {ms.project && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <GitBranch className="w-3 h-3" /> {ms.project.title}
                          </p>
                        )}
                        {ms.due_date && (
                          <p className={`text-xs mt-1 flex items-center gap-1 ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
                            <CalendarDays className="w-3 h-3" />
                            Due: {new Date(ms.due_date).toLocaleDateString("en-IN")}
                          </p>
                        )}
                      </div>
                      {ms.status !== "completed" && (
                        <div className="flex gap-1.5 flex-shrink-0">
                          {ms.status === "pending" && (
                            <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                              onClick={() => updateMilestone(ms.id, "in_progress")}>
                              <Clock className="w-3 h-3 mr-1" /> Start
                            </Button>
                          )}
                          <Button size="sm" className="text-xs h-7 px-2 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => updateMilestone(ms.id, "completed")}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Done
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Create Project Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="font-medium text-foreground line-clamp-2">{selectedSubmission.title}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {selectedSubmission.location_district} · {selectedSubmission.domain.replace(/_/g, " ")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proj-title">Project Title <span className="text-destructive">*</span></Label>
                <Input
                  id="proj-title"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Project title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proj-obj">Objective <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <textarea
                  id="proj-obj"
                  rows={2}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="What does this project aim to achieve?"
                  value={projectForm.objective}
                  onChange={(e) => setProjectForm((p) => ({ ...p, objective: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proj-method">Methodology <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <textarea
                  id="proj-method"
                  rows={2}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="How will the team approach the problem?"
                  value={projectForm.methodology}
                  onChange={(e) => setProjectForm((p) => ({ ...p, methodology: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proj-date">Expected End Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="proj-date"
                  type="date"
                  value={projectForm.expected_end_date}
                  onChange={(e) => setProjectForm((p) => ({ ...p, expected_end_date: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
                <Button onClick={handleCreateProject} disabled={creating} className="gap-2">
                  {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Project</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

// ── Empty State helper ────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl">
      <Icon className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>
    </div>
  );
}
