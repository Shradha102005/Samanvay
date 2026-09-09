import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Shield, TrendingUp, Edit, Trash2, Eye, Download, Calendar, ChevronUp, Users } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TeamFormDialog } from "@/components/admin/TeamFormDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import ThemeManager from "@/components/admin/ThemeManager";
import { useTenant } from "@/context/TenantContext";
import { tenantPath } from "@/utils/tenantPath";
import { useAuth } from "@/contexts/AuthContext";

interface Stats {
  totalProblems: number;
  totalUsers: number;
  adminCount: number;
  studentCount: number;
}

interface ProblemStats {
  id: string;
  title: string;
  count: number;
}

interface ThemeStats {
  theme: string;
  count: number;
}

interface TeamRegistration {
  id: string;
  team_name: string;
  problem_id: string;
  member1_name: string;
  member1_roll: string;
  member1_year: string;
  member1_department: string;
  member1_phone: string;
  member1_email: string;
  member2_name?: string;
  member2_roll?: string;
  member2_year?: string;
  member2_department?: string;
  member2_phone?: string;
  member2_email?: string;
  member3_name?: string;
  member3_roll?: string;
  member3_year?: string;
  member3_department?: string;
  member3_phone?: string;
  member3_email?: string;
  member4_name?: string;
  member4_roll?: string;
  member4_year?: string;
  member4_department?: string;
  member4_phone?: string;
  member4_email?: string;
  year?: string;
  department?: string;
  phone?: string;
  email?: string;
  document_url?: string;
  document_filename?: string;
  created_at: string;
  problem_title?: string;
  theme?: string;
}

interface ProblemStatement {
  problem_statement_id: string;
  title: string;
  theme: string;
}

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  department?: string | null;
  year?: string | null;
  phone?: string | null;
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalProblems: 0,
    totalUsers: 0,
    adminCount: 0,
    studentCount: 0,
  });
  const [problemStats, setProblemStats] = useState<ProblemStats[]>([]);
  const [themeStats, setThemeStats] = useState<ThemeStats[]>([]);
  const [teamRegistrations, setTeamRegistrations] = useState<TeamRegistration[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<TeamRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [problemFilter, setProblemFilter] = useState<string>("all");
  const [themeFilter, setThemeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [problemStatsSearchTerm, setProblemStatsSearchTerm] = useState<string>("");
  const [problemStatsThemeFilter, setProblemStatsThemeFilter] = useState<string>("all");
  const [problemStatsSortField, setProblemStatsSortField] = useState<"title" | "count">("count");
  const [problemStatsSortDirection, setProblemStatsSortDirection] = useState<"asc" | "desc">("desc");
  const [teamFormDialogOpen, setTeamFormDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamRegistration | null>(null);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [deleteAllConfirmDialogOpen, setDeleteAllConfirmDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<TeamRegistration | null>(null);
  const [problems, setProblems] = useState<ProblemStatement[]>([]);
  const { tenant } = useTenant();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [deptAdmins, setDeptAdmins] = useState<UserProfile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogView, setDialogView] = useState<"problems" | "themes" | "deptAdmins" | "studentUsers" | "allTeams" | null>(null);
  const [themeManagerOpen, setThemeManagerOpen] = useState(false);
  const [studentDepartmentFilter, setStudentDepartmentFilter] = useState<string>("all");
  const [studentYearFilter, setStudentYearFilter] = useState<string>("all");
  const [deptAdminActionLoading, setDeptAdminActionLoading] = useState<string | null>(null);
  const [deptAdminError, setDeptAdminError] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const isExpiredSessionError = (message?: string | null) => {
    if (!message) return false;
    const normalizedMessage = message.toLowerCase();
    return normalizedMessage.includes("jwt expired") || normalizedMessage.includes("token has expired");
  };

  // Helper function to recalculate statistics
  const recalculateStats = (teams: TeamRegistration[]) => {
    // Recalculate problem stats
    const problemCountMap = teams.reduce((acc, reg) => {
      acc[reg.problem_id] = (acc[reg.problem_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const problemStatsData = problems.map(p => ({
      id: p.problem_statement_id,
      title: p.title,
      count: problemCountMap[p.problem_statement_id] || 0
    }));

    // Recalculate theme stats
    const themeCountMap = problems.reduce((acc, p) => {
      const count = problemCountMap[p.problem_statement_id] || 0;
      acc[p.theme] = (acc[p.theme] || 0) + count;
      return acc;
    }, {} as Record<string, number>);

    const themeStatsData = Object.entries(themeCountMap).map(([theme, count]) => ({
      theme,
      count: count as number
    }));

    setProblemStats(problemStatsData);
    setThemeStats(themeStatsData);
  };

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setDashboardError(null);

try {
  const [
    problemsResponse,
    rolesResponse,
    profilesResponse,
    registrationsResponse,
    teamRegsResponse,
    authResponse,
  ] = await Promise.all([
    supabase
      .from("problem_statements")
      .select("problem_statement_id, title, theme")
      .eq("tenant_id", tenant!.id)
      .order("problem_statement_id", { ascending: true }),

    supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("tenant_id", tenant!.id),

    supabase
      .from("profiles")
      .select("id, name, email, role, created_at, department, year, phone")
      .eq("tenant_id", tenant!.id)
      .order("created_at", { ascending: true }),

    (supabase as any)
      .from("team_registrations")
      .select("problem_id")
      .eq("tenant_id", tenant!.id),

    (supabase as any)
      .from("team_registrations")
      .select("*")
      .eq("tenant_id", tenant!.id),

    supabase.auth.getUser(),
  ]);

        const problemsData = problemsResponse.data || [];
        const rolesData = rolesResponse.data || [];
        const profilesData = profilesResponse.data || [];
        const registrationsData = (registrationsResponse.data as { problem_id: string }[] | null) || [];
        const teamRegsData = teamRegsResponse.data || [];

        const queryErrors = [
          problemsResponse.error?.message,
          rolesResponse.error?.message,
          profilesResponse.error?.message,
          registrationsResponse.error?.message,
          teamRegsResponse.error?.message,
          authResponse.error?.message,
        ].filter(Boolean);

        console.log("AdminDashboard - Fetched problems:", problemsData);
        console.log("AdminDashboard - Fetch errors:", queryErrors);

        if (queryErrors.some((message) => isExpiredSessionError(message))) {
          await signOut();
          return;
        }

        setProblems(problemsData);

        const mergedUsers = profilesData.map((profile) => ({
          ...profile,
          role: rolesData.find((role) => role.user_id === profile.id)?.role || profile.role || "student",
        }));

        const deptAdminCount = rolesData.filter((r) => r.role === "deptadmin").length;
        const studentCount = rolesData.filter((r) => r.role === "student").length;
        const currentUserRole = rolesData.find((r) => r.user_id === authResponse.data.user?.id)?.role;

        console.log("Current user role:", currentUserRole);

        setAllUsers(mergedUsers);
        setDeptAdmins(mergedUsers.filter((user) => user.role === "deptadmin"));

        const problemCountMap = registrationsData.reduce((acc, reg) => {
          acc[reg.problem_id] = (acc[reg.problem_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const problemStatsData = problemsData.map((problem) => ({
          id: problem.problem_statement_id,
          title: problem.title,
          count: problemCountMap[problem.problem_statement_id] || 0,
        }));

        const themeCountMap = problemsData.reduce((acc, problem) => {
          const count = problemCountMap[problem.problem_statement_id] || 0;
          acc[problem.theme] = (acc[problem.theme] || 0) + count;
          return acc;
        }, {} as Record<string, number>);

        const themeStatsData = Object.entries(themeCountMap).map(([theme, count]) => ({
          theme,
          count,
        }));

        const teamRegsWithTitles = teamRegsData.map((reg: any) => {
          const problem = problemsData.find((item) => item.problem_statement_id === reg.problem_id);
          return {
            ...reg,
            problem_title: problem?.title || "Unknown Problem",
            theme: problem?.theme || "Unknown Theme",
            year: reg.member1_year || reg.year || "",
            department: reg.member1_department || reg.department || "",
            email: reg.member1_email || reg.email || "",
            phone: reg.member1_phone || reg.phone || "",
          };
        });

        setTeamRegistrations(teamRegsWithTitles);
        setStats({
          totalProblems: problemsData.length,
          totalUsers: profilesData.length,
          adminCount: deptAdminCount,
          studentCount,
        });
        setProblemStats(problemStatsData);
        setThemeStats(themeStatsData);

        if (queryErrors.length > 0) {
          setDashboardError(queryErrors.join(" | "));
        }
      } catch (error: any) {
        console.error("Error loading admin dashboard:", error);
        if (isExpiredSessionError(error?.message)) {
          await signOut();
          return;
        }

        setDashboardError(error?.message || "Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [tenant?.id]);

  // Filter and sort teams
  useEffect(() => {
    let filtered = [...teamRegistrations];

    // Apply problem filter
    if (problemFilter !== "all") {
      filtered = filtered.filter(team => team.problem_id === problemFilter);
    }

    // Apply theme filter
    if (themeFilter !== "all") {
      filtered = filtered.filter(team => team.theme === themeFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof TeamRegistration];
      let bValue: any = b[sortField as keyof TeamRegistration];

      if (sortField === "created_at") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredTeams(filtered);
  }, [teamRegistrations, problemFilter, themeFilter, sortField, sortDirection]);

  const handleOpenDialog = (view: "problems" | "themes" | "deptAdmins" | "studentUsers" | "allTeams") => {
    setDialogView(view);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogView(null);
  };

  const studentUsers = allUsers.filter((user) => user.role === "student");

  const filteredStudentUsers = studentUsers.filter((student) => {
    if (studentDepartmentFilter !== "all" && student.department !== studentDepartmentFilter) return false;
    if (studentYearFilter !== "all" && student.year !== studentYearFilter) return false;
    return true;
  });

  const studentDepartments = [...new Set(studentUsers.map((student) => student.department).filter(Boolean))];
  const studentYears = [...new Set(studentUsers.map((student) => student.year).filter(Boolean))];
  const problemThemes = [...new Set(problems.map((problem) => problem.theme).filter(Boolean))];

  const filteredProblemStats = problemStats.filter((problem) => {
    if (
      problemStatsSearchTerm.trim() !== "" &&
      !problem.title.toLowerCase().includes(problemStatsSearchTerm.trim().toLowerCase())
    ) {
      return false;
    }

    const matchedProblem = problems.find((item) => item.problem_statement_id === problem.id);
    if (problemStatsThemeFilter !== "all" && matchedProblem?.theme !== problemStatsThemeFilter) {
      return false;
    }

    return true;
  });

  const sortedProblemStats = [...filteredProblemStats].sort((a, b) => {
    if (problemStatsSortField === "title") {
      const comparison = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      return problemStatsSortDirection === "asc" ? comparison : -comparison;
    }

    return problemStatsSortDirection === "asc" ? a.count - b.count : b.count - a.count;
  });

  const downloadStudentData = (format: "csv" | "excel") => {
    const rows = filteredStudentUsers;
    if (rows.length === 0) return;

    const header = ["Name", "Email", "Year", "Department", "Phone", "Joined Date"];
    const csvBody = rows
      .map((row) =>
        [
          row.name || "",
          row.email || "",
          row.year,
          row.department,
          row.phone,
          row.created_at ? new Date(row.created_at).toLocaleDateString() : "",
        ]
          .map((value) => `"${String(value || "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const csv = [header.join(","), csvBody].join("\r\n");
    const mimeType = format === "excel" ? "application/vnd.ms-excel" : "text/csv;charset=utf-8;";
    const extension = format === "excel" ? "xls" : "csv";
    const blob = new Blob([csv], { type: mimeType });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `student-users-${studentDepartmentFilter}-${studentYearFilter}.${extension}`.replace(/[^a-zA-Z0-9-_.]/g, "_");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const downloadTeamData = () => {
    const rows = filteredTeams;
    if (rows.length === 0) return;

    const header = [
      "Team Name",
      "Problem Statement",
      "Member 1 Name",
      "Member 1 Roll",
      "Member 2 Name",
      "Member 2 Roll",
      "Member 3 Name",
      "Member 3 Roll",
      "Member 4 Name",
      "Member 4 Roll",
      "Year",
      "Department",
      "Email",
      "Phone",
      "Registered Date"
    ];
    
    const csvBody = rows
      .map((row) =>
        [
          row.team_name || "",
          row.problem_title || "",
          row.member1_name || "",
          row.member1_roll || "",
          row.member2_name || "",
          row.member2_roll || "",
          row.member3_name || "",
          row.member3_roll || "",
          row.member4_name || "",
          row.member4_roll || "",
          row.year || "",
          row.department || "",
          row.email || "",
          row.phone || "",
          row.created_at ? new Date(row.created_at).toLocaleDateString() : "",
        ]
          .map((value) => `"${String(value || "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const csv = [header.join(","), csvBody].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `registered-teams-${problemFilter}-${themeFilter}.csv`.replace(/[^a-zA-Z0-9-_.]/g, "_");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const toggleDepartmentAdminRole = async (user: UserProfile) => {
    setDeptAdminActionLoading(user.id);
    setDeptAdminError(null);

    try {
      const newRole = user.role === "deptadmin" ? "student" : "deptadmin";
      const { data: updateData, error: updateError } = await supabase
        .from("user_roles")
        .update({ role: newRole, tenant_id: tenant!.id })
        .eq("user_id", user.id)
        .select("id");

      if (updateError) {
        throw updateError;
      }

      if (!updateData || updateData.length === 0) {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: newRole, tenant_id: tenant!.id });

        if (insertError) {
          throw insertError;
        }
      }

      const updatedUsers = allUsers.map((item) =>
        item.id === user.id ? { ...item, role: newRole } : item
      );

      setAllUsers(updatedUsers);
      setDeptAdmins(updatedUsers.filter((item) => item.role === "deptadmin"));
    } catch (error: any) {
      console.error("Error updating department admin role:", error);
      setDeptAdminError(error?.message || "Unable to update department admin permission.");
    } finally {
      setDeptAdminActionLoading(null);
    }
  };

  const handleEditTeam = (team: TeamRegistration) => {
    setSelectedTeam(team);
    setTeamFormDialogOpen(true);
  };

  const handleDeleteTeam = (team: TeamRegistration) => {
    setTeamToDelete(team);
    setDeleteConfirmDialogOpen(true);
  };

  const handleDeleteAllTeams = () => {
    setDeleteAllConfirmDialogOpen(true);
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;

    try {
      console.log("Deleting team:", teamToDelete.team_name);
      console.log("Document URL to delete:", teamToDelete.document_url);

      // Delete associated document from storage if it exists
      if (teamToDelete.document_url) {
        try {
          const { error: storageError } = await supabase.storage
            .from("team-documents")
            .remove([teamToDelete.document_url]);

          if (storageError) {
            console.error("Error deleting document from storage:", storageError);
            // Continue with team deletion even if document deletion fails
          }
        } catch (error) {
          console.error("Error deleting document:", error);
          // Continue with team deletion even if document deletion fails
        }
      }

      console.log("Deleting team record from database...");
      const { error } = await (supabase as any)
        .from("team_registrations")
        .delete()
        .eq("id", teamToDelete.id)
        .eq("tenant_id", tenant!.id);

      if (error) {
        console.error("Error deleting team from database:", error);
        throw error;
      }

      console.log("Team deleted successfully");
      const updatedTeams = teamRegistrations.filter(team => team.id !== teamToDelete.id);
      setTeamRegistrations(updatedTeams);
      recalculateStats(updatedTeams);
      setDeleteConfirmDialogOpen(false);
      setTeamToDelete(null);
    } catch (error) {
      console.error("Error deleting team:", error);
    }
  };

  const confirmDeleteAllTeams = async () => {
    try {
      // First, fetch all teams to get their document URLs
      const { data: allTeams, error: fetchError } = await (supabase as any)
        .from("team_registrations")
        .select("document_url")
        .eq("tenant_id", tenant!.id);

      if (fetchError) {
        console.error("Error fetching teams for deletion:", fetchError);
        throw fetchError;
      }

      // Delete associated documents from storage
      if (allTeams && allTeams.length > 0) {
        const documentUrls = allTeams
          .filter((team: any) => team.document_url)
          .map((team: any) => team.document_url);

        if (documentUrls.length > 0) {
          try {
            const { error: storageError } = await supabase.storage
              .from("team-documents")
              .remove(documentUrls);

            if (storageError) {
              console.error("Error deleting documents from storage:", storageError);
              // Continue with team deletion even if document deletion fails
            }
          } catch (error) {
            console.error("Error deleting documents:", error);
            // Continue with team deletion even if document deletion fails
          }
        }
      }

      // Delete all team records from database
      const { error } = await (supabase as any)
        .from("team_registrations")
        .delete()
        .eq("tenant_id", tenant!.id)
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;

      setTeamRegistrations([]);
      recalculateStats([]);
      setDeleteAllConfirmDialogOpen(false);
    } catch (error) {
      console.error("Error deleting all teams:", error);
    }
  };

  const handleSaveTeam = async (data: Omit<TeamRegistration, "id" | "created_at" | "problem_title" | "theme">) => {
    try {
      if (selectedTeam) {
        // Update existing team using correct database column mappings
        const updateData = {
          team_name: data.team_name,
          problem_id: data.problem_id,
          member1_name: data.member1_name,
          member1_roll: data.member1_roll,
          member2_name: data.member2_name || null,
          member2_roll: data.member2_roll || null,
          member3_name: data.member3_name || null,
          member3_roll: data.member3_roll || null,
          member4_name: data.member4_name || null,
          member4_roll: data.member4_roll || null,
          member1_year: data.year,
          member1_department: data.department,
          member1_phone: data.phone,
          member1_email: data.email,
          document_url: data.document_url || null,
          tenant_id: tenant!.id,
        };

        const { error } = await (supabase as any)
          .from("team_registrations")
          .update(updateData)
          .eq("id", selectedTeam.id)
          .eq("tenant_id", tenant!.id);

        if (error) throw error;

        // Update local state
        const updatedTeams = teamRegistrations.map(team =>
          team.id === selectedTeam.id
            ? {
                ...team,
                ...data,
                member1_year: data.year,
                member1_department: data.department,
                member1_phone: data.phone,
                member1_email: data.email,
                problem_title: problems.find(p => p.problem_statement_id === data.problem_id)?.title || "Unknown Problem",
                theme: problems.find(p => p.problem_statement_id === data.problem_id)?.theme || "Unknown Theme"
              }
            : team
        );
        setTeamRegistrations(updatedTeams);
        recalculateStats(updatedTeams);
      }

      setTeamFormDialogOpen(false);
      setSelectedTeam(null);
    } catch (error) {
      console.error("Error saving team:", error);
    }
  };

  const handleViewDocument = async (team: TeamRegistration) => {
    if (!team.document_url) return;

    try {
      // Use authenticated download to get the file blob
      const { data, error } = await supabase.storage
        .from("team-documents")
        .download(team.document_url);

      if (error) throw error;

      if (data) {
        // Create a blob URL for the downloaded file
        const blob = new Blob([data], { type: data.type || 'application/octet-stream' });
        const blobUrl = URL.createObjectURL(blob);

        // Open the blob URL in a new tab
        window.open(blobUrl, '_blank');

        // Clean up the blob URL after a delay to ensure the tab has loaded
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      }
    } catch (error) {
      console.error("Error viewing document:", error);
    }
  };

  const handleDownloadPPT = async (team: TeamRegistration) => {
    if (!team.document_url) return;

    try {
      // Use Supabase download method for proper file download
      const { data, error } = await supabase.storage
        .from("team-documents")
        .download(team.document_url);

      if (error) throw error;

      if (data) {
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = team.document_filename || 'presentation.ppt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the object URL
        URL.revokeObjectURL(link.href);
      }
    } catch (error) {
      console.error("Error downloading PPT:", error);
    }
  };

  const statCards = [
    {
      title: "Total Problem Statements",
      value: stats.totalProblems,
      icon: FileText,
      color: "bg-primary",
      view: "problems" as const,
    },
    {
      title: "Team Registrations by Theme",
      value: themeStats.reduce((total, theme) => total + theme.count, 0),
      icon: TrendingUp,
      color: "bg-secondary",
      view: "themes" as const,
    },
    {
      title: "Department Admins",
      value: stats.adminCount,
      icon: Shield,
      color: "bg-accent",
      view: "deptAdmins" as const,
    },
    {
      title: "Student Users",
      value: stats.studentCount,
      icon: TrendingUp,
      color: "bg-muted",
      view: "studentUsers" as const,
    },
    {
      title: "All Registered Teams",
      value: teamRegistrations.length,
      icon: Users,
      color: "bg-primary",
      view: "allTeams" as const,
    },
  ];

  return (
    <AdminLayout>
      {/* Header */}
      <section className="bg-primary py-16 lg:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl lg:text-5xl font-poppins font-bold text-primary-foreground">
            Admin Dashboard
          </h1>
          <p className="mt-4 text-primary-foreground/80 text-lg max-w-2xl mx-auto">
            Overview of Samanvay statistics and management tools.
          </p>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4 animate-pulse">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <p className="text-muted-foreground">Loading statistics...</p>
            </div>
          ) : (
            <>
              {dashboardError && (
                <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {dashboardError}
                </div>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
                {statCards.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <button
                      type="button"
                      key={stat.title}
                      onClick={() => handleOpenDialog(stat.view)}
                      className="text-left bg-card rounded-xl p-6 shadow-card hover:shadow-elevated transition-all"
                    >
                      <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center mb-4`}>
                        <Icon className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">{stat.title}</p>
                      <p className="text-3xl font-poppins font-bold text-foreground mt-1">
                        {stat.value}
                      </p>
                    </button>
                  );
                })}
              </div>

              <Dialog open={dialogOpen} onOpenChange={(open) => {
                if (!open) {
                  handleCloseDialog();
                }
              }}>
                <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-hidden overflow-y-auto rounded-3xl p-6">
                  <DialogHeader>
                    <DialogTitle>
                      {dialogView === "problems" && "Team Registrations by Problem Statement"}
                      {dialogView === "themes" && "Team Registrations by Theme"}
                      {dialogView === "deptAdmins" && "Department Admins"}
                      {dialogView === "studentUsers" && "Student Users"}
                      {dialogView === "allTeams" && "All Registered Teams"}
                    </DialogTitle>
                    <DialogDescription>
                      {dialogView === "problems" && "Search, filter, and sort problem statements by registered team count."}
                      {dialogView === "themes" && "Review team registrations grouped by theme."}
                      {dialogView === "deptAdmins" && "View all users with department admin access."}
                      {dialogView === "studentUsers" && "View student profiles filtered by department or year, then download the visible data."}
                      {dialogView === "allTeams" && "View registered teams, apply filters, and download team information."}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mt-6 space-y-6">
                    {dialogView === "problems" && (
                      <div>
                        {problemStats.length > 0 ? (
                          <>
                            <div className="mb-6 space-y-4">
                              <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[220px]">
                                  <label className="block text-sm font-medium text-foreground mb-2">
                                    Search Problem Statement
                                  </label>
                                  <input
                                    type="text"
                                    value={problemStatsSearchTerm}
                                    onChange={(e) => setProblemStatsSearchTerm(e.target.value)}
                                    placeholder="Search by problem title"
                                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </div>

                                <div className="flex-1 min-w-[220px]">
                                  <label className="block text-sm font-medium text-foreground mb-2">
                                    Filter by Theme
                                  </label>
                                  <select
                                    value={problemStatsThemeFilter}
                                    onChange={(e) => setProblemStatsThemeFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    <option value="all">All Themes</option>
                                    {problemThemes.map((theme) => (
                                      <option key={theme} value={theme}>
                                        {theme}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[640px]">
                                <thead>
                                  <tr className="border-b border-border">
                                    <th className="text-left py-2 px-4 font-medium text-foreground">
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setProblemStatsSortField("title");
                                            setProblemStatsSortDirection((currentDirection) =>
                                              problemStatsSortField === "title" && currentDirection === "asc" ? "desc" : "asc"
                                            );
                                          }}
                                          className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                                          aria-label={`Sort problem title ${
                                            problemStatsSortField === "title" && problemStatsSortDirection === "asc"
                                              ? "descending"
                                              : "ascending"
                                          }`}
                                          title={`Sort problem title ${
                                            problemStatsSortField === "title" && problemStatsSortDirection === "asc"
                                              ? "descending"
                                              : "ascending"
                                          }`}
                                        >
                                          <ChevronUp
                                            className={`h-4 w-4 transition-transform ${
                                              problemStatsSortField !== "title" || problemStatsSortDirection === "desc"
                                                ? "rotate-180"
                                                : ""
                                            }`}
                                          />
                                        </button>
                                        <span>Problem Title</span>
                                      </div>
                                    </th>
                                    <th className="text-left py-2 px-4 font-medium text-foreground">Theme</th>
                                    <th className="text-right py-2 px-4 font-medium text-foreground">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setProblemStatsSortField("count");
                                            setProblemStatsSortDirection((currentDirection) =>
                                              problemStatsSortField === "count" && currentDirection === "asc" ? "desc" : "asc"
                                            );
                                          }}
                                          className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                                          aria-label={`Sort registered teams ${
                                            problemStatsSortField === "count" && problemStatsSortDirection === "asc"
                                              ? "descending"
                                              : "ascending"
                                          }`}
                                          title={`Sort registered teams ${
                                            problemStatsSortField === "count" && problemStatsSortDirection === "asc"
                                              ? "descending"
                                              : "ascending"
                                          }`}
                                        >
                                          <ChevronUp
                                            className={`h-4 w-4 transition-transform ${
                                              problemStatsSortField !== "count" || problemStatsSortDirection === "desc"
                                                ? "rotate-180"
                                                : ""
                                            }`}
                                          />
                                        </button>
                                        <span>Registered Teams</span>
                                      </div>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sortedProblemStats.length > 0 ? (
                                    sortedProblemStats.map((problem) => {
                                      const matchedProblem = problems.find((item) => item.problem_statement_id === problem.id);

                                      return (
                                        <tr key={problem.id} className="border-b border-border/50">
                                          <td className="py-3 px-4 text-foreground">{problem.title}</td>
                                          <td className="py-3 px-4 text-foreground">{matchedProblem?.theme || "--"}</td>
                                          <td className="py-3 px-4 text-right font-semibold text-primary">{problem.count}</td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    <tr>
                                      <td colSpan={3} className="py-6 text-center text-muted-foreground">
                                        No problem statements match the selected filters.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground">No registrations yet.</p>
                        )}
                      </div>
                    )}

                    {dialogView === "themes" && (
                      <div>
                        <div className="flex justify-end mb-4">
                          <Button onClick={() => setThemeManagerOpen((s) => !s)} size="sm">
                            {themeManagerOpen ? "Close theme manager" : "Manage themes"}
                          </Button>
                        </div>
                        {themeManagerOpen && (
                          <div className="mb-6">
                            <ThemeManager onClose={() => setThemeManagerOpen(false)} />
                          </div>
                        )}
                        {themeStats.length > 0 ? (
                          <>
                            <div className="mb-8">
                              <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={themeStats.map((theme, index) => ({
                                        name: theme.theme.charAt(0).toUpperCase() + theme.theme.slice(1),
                                        value: Math.max(theme.count, 0.1),
                                        actualCount: theme.count,
                                        fill: `hsl(${index * 137.5 % 360}, 70%, 50%)`
                                      }))}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      label={({ name, actualCount }) => {
                                        const totalRegistrations = themeStats.reduce((sum, theme) => sum + theme.count, 0);
                                        const percentage = totalRegistrations === 0 ? 0 : ((actualCount / totalRegistrations) * 100).toFixed(0);
                                        return `${name} ${percentage}%`;
                                      }}
                                      outerRadius={80}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {themeStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={`hsl(${index * 137.5 % 360}, 70%, 50%)`} />
                                      ))}
                                    </Pie>
                                    <Tooltip
                                      formatter={(value, name, props) => [
                                        `${props.payload.actualCount} teams`,
                                        name
                                      ]}
                                    />
                                    <Legend />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {themeStats.map((theme) => (
                                <div key={theme.theme} className="bg-muted/50 rounded-lg p-4">
                                  <h3 className="font-medium text-foreground capitalize">{theme.theme}</h3>
                                  <p className="text-2xl font-bold text-primary mt-1">{theme.count}</p>
                                  <p className="text-sm text-muted-foreground">teams registered</p>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground">No registrations yet.</p>
                        )}
                      </div>
                    )}

                    {dialogView === "deptAdmins" && (
                      <div className="space-y-4">
                        {deptAdminError && (
                          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                            {deptAdminError}
                          </div>
                        )}
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px] border-separate border-spacing-y-2">
                            <thead>
                              <tr className="text-left text-sm font-semibold text-foreground border-b border-border">
                                <th className="py-3 px-4">Name</th>
                                <th className="py-3 px-4">Email</th>
                                <th className="py-3 px-4">Joined</th>
                                <th className="py-3 px-4">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deptAdmins.length > 0 ? (
                                deptAdmins.map((user) => (
                                  <tr key={user.id} className="border-b border-border/50">
                                    <td className="py-3 px-4 text-foreground">{user.name || "—"}</td>
                                    <td className="py-3 px-4 text-foreground">{user.email || "—"}</td>
                                    <td className="py-3 px-4 text-foreground text-sm">{user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</td>
                                    <td className="py-3 px-4">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleDepartmentAdminRole(user)}
                                        disabled={deptAdminActionLoading === user.id}
                                      >
                                        {deptAdminActionLoading === user.id ? "Updating..." : "Revoke"}
                                      </Button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                                    No department admins assigned yet.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {dialogView === "studentUsers" && (
                      <div className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-4 items-end">
                          <div>
                            <Label htmlFor="student-filter-department">Filter by Department</Label>
                            <select
                              id="student-filter-department"
                              value={studentDepartmentFilter}
                              onChange={(e) => setStudentDepartmentFilter(e.target.value)}
                              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="all">All Departments</option>
                              {studentDepartments.map((dept) => (
                                <option key={dept} value={dept}>{dept}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="student-filter-year">Filter by Year</Label>
                            <select
                              id="student-filter-year"
                              value={studentYearFilter}
                              onChange={(e) => setStudentYearFilter(e.target.value)}
                              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="all">All Years</option>
                              {studentYears.map((year) => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => downloadStudentData("csv")}>
                              Download info
                            </Button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[760px] border-separate border-spacing-y-2">
                            <thead>
                              <tr className="text-left text-sm font-semibold text-foreground border-b border-border">
                                <th className="py-3 px-4">Name</th>
                                <th className="py-3 px-4">Email</th>
                                <th className="py-3 px-4">Year</th>
                                <th className="py-3 px-4">Department</th>
                                <th className="py-3 px-4">Phone</th>
                                <th className="py-3 px-4">Joined</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredStudentUsers.length > 0 ? (
                                filteredStudentUsers.map((student) => (
                                  <tr key={student.id} className="border-b border-border/50">
                                    <td className="py-3 px-4 text-foreground">{student.name || "--"}</td>
                                    <td className="py-3 px-4 text-foreground">{student.email || "--"}</td>
                                    <td className="py-3 px-4 text-foreground">{student.year || "--"}</td>
                                    <td className="py-3 px-4 text-foreground">{student.department || "--"}</td>
                                    <td className="py-3 px-4 text-foreground">{student.phone || "--"}</td>
                                    <td className="py-3 px-4 text-foreground text-sm">{student.created_at ? new Date(student.created_at).toLocaleDateString() : "--"}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                                    No student data matches the selected filters.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {dialogView === "allTeams" && (
                      <div className="space-y-6">
                        {/* Filter, Sort, and Download Controls */}
                        <div className="grid md:grid-cols-4 gap-4 items-end">
                          <div>
                            <Label htmlFor="team-filter-problem">Filter by Problem Statement</Label>
                            <select
                              id="team-filter-problem"
                              value={problemFilter}
                              onChange={(e) => setProblemFilter(e.target.value)}
                              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="all">All Problems</option>
                              {problems.map((problem) => (
                                <option key={problem.problem_statement_id} value={problem.problem_statement_id}>
                                  {problem.title}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="team-filter-theme">Filter by Theme</Label>
                            <select
                              id="team-filter-theme"
                              value={themeFilter}
                              onChange={(e) => setThemeFilter(e.target.value)}
                              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="all">All Themes</option>
                              {problemThemes.map((theme) => (
                                <option key={theme} value={theme}>
                                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="team-sort">Sort by</Label>
                            <div className="flex gap-2">
                              <select
                                id="team-sort"
                                value={sortField}
                                onChange={(e) => setSortField(e.target.value)}
                                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="created_at">Registration Date</option>
                                <option value="team_name">Team Name</option>
                                <option value="year">Year</option>
                                <option value="department">Department</option>
                              </select>
                              <Button
                                variant="outline"
                                onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                                className="px-3"
                              >
                                {sortDirection === "asc" ? "↑" : "↓"}
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Button className="w-full" onClick={() => downloadTeamData()}>
                              Download info
                            </Button>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          Showing {filteredTeams.length} of {teamRegistrations.length} teams
                        </div>

                        <div className="overflow-x-auto">
                          {filteredTeams.length > 0 ? (
                            <table className="w-full min-w-[900px] border-collapse">
                              <thead>
                                <tr className="text-left text-sm font-semibold text-foreground border-b-2 border-border pb-3">
                                  <th className="py-3 px-4 w-[15%]">Team Name</th>
                                  <th className="py-3 px-4 w-[15%]">Problem</th>
                                  <th className="py-3 px-4 w-[50%]">Members & Contact Details</th>
                                  <th className="py-3 px-4 w-[10%]">Registered</th>
                                  <th className="py-3 px-4 w-[10%]">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredTeams.map((team) => (
                                  <tr key={team.id} className="border-b-2 border-border/80 hover:bg-muted/10 transition-colors">
                                    <td className="py-6 px-4 text-foreground font-semibold align-top">{team.team_name}</td>
                                    <td className="py-6 px-4 text-foreground align-top">{team.problem_title}</td>
                                    <td className="py-6 px-4 text-foreground align-top">
                                      <div className="space-y-3 max-w-xl">
                                        {[
                                          {
                                            role: "Member 1 (Leader)",
                                            name: team.member1_name,
                                            roll: team.member1_roll,
                                            year: team.member1_year,
                                            dept: team.member1_department,
                                            phone: team.member1_phone,
                                            email: team.member1_email,
                                          },
                                          team.member2_name ? {
                                            role: "Member 2",
                                            name: team.member2_name,
                                            roll: team.member2_roll,
                                            year: team.member2_year,
                                            dept: team.member2_department,
                                            phone: team.member2_phone,
                                            email: team.member2_email,
                                          } : null,
                                          team.member3_name ? {
                                            role: "Member 3",
                                            name: team.member3_name,
                                            roll: team.member3_roll,
                                            year: team.member3_year,
                                            dept: team.member3_department,
                                            phone: team.member3_phone,
                                            email: team.member3_email,
                                          } : null,
                                          team.member4_name ? {
                                            role: "Member 4",
                                            name: team.member4_name,
                                            roll: team.member4_roll,
                                            year: team.member4_year,
                                            dept: team.member4_department,
                                            phone: team.member4_phone,
                                            email: team.member4_email,
                                          } : null,
                                        ]
                                          .filter(Boolean)
                                          .map((member: any, idx) => (
                                            <div
                                              key={idx}
                                              className="border border-border/60 rounded-xl p-3 bg-muted/30 shadow-sm transition-all hover:bg-muted/50"
                                            >
                                              <div className="flex items-center justify-between font-semibold text-sm text-foreground mb-1">
                                                <span>
                                                  {member.name}{" "}
                                                  <span className="text-xs font-normal text-muted-foreground">
                                                    ({member.roll})
                                                  </span>
                                                </span>
                                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                                                  {member.role}
                                                </span>
                                              </div>
                                              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                                <div>
                                                  <span className="font-medium text-foreground/75">Dept:</span> {member.dept || "--"}
                                                </div>
                                                <div>
                                                  <span className="font-medium text-foreground/75">Year:</span> {member.year || "--"}
                                                </div>
                                                <div className="col-span-2">
                                                  <span className="font-medium text-foreground/75">Email:</span> {member.email || "--"}
                                                </div>
                                                <div className="col-span-2">
                                                  <span className="font-medium text-foreground/75">Phone:</span> {member.phone || "--"}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    </td>
                                    <td className="py-6 px-4 text-foreground text-sm align-top">
                                      {new Date(team.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="py-6 px-4 align-top">
                                      <div className="flex gap-2">
                                        {team.document_url && (
                                          <>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleViewDocument(team)}
                                              className="h-8 w-8 p-0"
                                              title="View Document"
                                            >
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleDownloadPPT(team)}
                                              className="h-8 w-8 p-0"
                                              title="Download PPT"
                                            >
                                              <Download className="h-4 w-4" />
                                            </Button>
                                          </>
                                        )}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditTeam(team)}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDeleteTeam(team)}
                                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-center py-6 text-muted-foreground">No team registrations match the filters.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Registration Statistics placeholder - accordion removed */}

              {/* Quick Actions */}
              <div className="bg-card rounded-xl p-6 shadow-card mt-8">
                <h2 className="text-xl font-poppins font-semibold text-foreground mb-4">
                  Quick Actions
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Link
                    to={tenantPath(tenant!.slug, "/problems")}
                    className="p-4 rounded-lg border border-border hover:border-secondary hover:bg-accent/50 transition-all"
                  >
                    <FileText className="w-6 h-6 text-secondary mb-2" />
                    <h3 className="font-semibold text-foreground">Manage Problems</h3>
                    <p className="text-sm text-muted-foreground">Add, edit or delete problem statements</p>
                  </Link>
                  <Link
                    to={tenantPath(tenant!.slug, "/events")}
                    className="p-4 rounded-lg border border-border hover:border-secondary hover:bg-accent/50 transition-all"
                  >
                    <Calendar className="w-6 h-6 text-secondary mb-2" />
                    <h3 className="font-semibold text-foreground">Manage Events</h3>
                    <p className="text-sm text-muted-foreground">Add, edit or delete events</p>
                  </Link>
                  <Link
                    to={tenantPath(tenant!.slug, "/resources")}
                    className="p-4 rounded-lg border border-border hover:border-secondary hover:bg-accent/50 transition-all"
                  >
                    <FileText className="w-6 h-6 text-secondary mb-2" />
                    <h3 className="font-semibold text-foreground">Manage Resources</h3>
                    <p className="text-sm text-muted-foreground">Upload and update documents</p>
                  </Link>
                  <Button
                    onClick={handleDeleteAllTeams}
                    variant="destructive"
                    className="p-4 h-auto flex flex-col items-start"
                  >
                    <Trash2 className="w-6 h-6 mb-2" />
                    <h3 className="font-semibold">Delete All Teams</h3>
                    <p className="text-sm text-left">Remove all team registrations</p>
                  </Button>
                </div>
              </div>

              {/* Dialogs */}
              <TeamFormDialog
                open={teamFormDialogOpen}
                onOpenChange={setTeamFormDialogOpen}
                team={selectedTeam}
                problems={problems}
                onSave={handleSaveTeam}
                loading={loading}
              />

              <DeleteConfirmDialog
                open={deleteConfirmDialogOpen}
                onOpenChange={setDeleteConfirmDialogOpen}
                onConfirm={confirmDeleteTeam}
                title="Delete Team"
                description={`Are you sure you want to delete the team "${teamToDelete?.team_name}"? This action cannot be undone.`}
              />

              <DeleteConfirmDialog
                open={deleteAllConfirmDialogOpen}
                onOpenChange={setDeleteAllConfirmDialogOpen}
                onConfirm={confirmDeleteAllTeams}
                title="Delete All Teams"
                description="Are you sure you want to delete all team registrations? This action cannot be undone."
              />
            </>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}

