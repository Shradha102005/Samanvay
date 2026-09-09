import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Download, HelpCircle, Upload, Trash2, Edit, Save, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { ResourceUploadDialog } from "@/components/admin/ResourceUploadDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { QuerySubmissionForm } from "@/components/resources/QuerySubmissionForm";
import { AdminQueryList } from "@/components/resources/AdminQueryList";
import { toast } from "sonner";
import { useTenant } from "@/context/TenantContext";
import { RESOURCE_ICON_MAP, getResourceIconKey } from "@/lib/resourceIcons";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  section_key: string;
}

interface PageTextContent {
  title: string;
  subtitle: string;
}

const defaultPageText: PageTextContent = {
  title: "Resources",
  subtitle: "Download templates, guidelines, and everything you need for your submission.",
};

const faqs = [
  {
    question: "Who can participate in Samanvay?",
    answer: "Any student currently enrolled in GCET across all departments can participate. Teams must have 3-5 members.",
  },
  {
    question: "Can we form cross-department teams?",
    answer: "Yes! Cross-functional teams from different departments are encouraged as they bring diverse perspectives.",
  },
  {
    question: "What is the registration fee?",
    answer: "Participation is free of cost. There are no registration fees for Samanvay.",
  },
  {
    question: "Can we change our problem statement after registration?",
    answer: "Problem statement changes are allowed until Phase 1 deadline. Contact the organizers for assistance.",
  },
  {
    question: "What kind of prototypes are expected?",
    answer: "Prototypes can be hardware, software, or hybrid. The focus is on demonstrating your solution's feasibility.",
  },
  {
    question: "Will mentorship be provided?",
    answer: "Yes, registered teams get access to faculty mentors and industry experts throughout the event.",
  },
];

export default function Resources() {
  const { isAdmin } = useAdmin();
  const { tenant } = useTenant();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [pageHeader, setPageHeader] = useState<PageTextContent>(defaultPageText);
  const [editPageHeader, setEditPageHeader] = useState<PageTextContent>(defaultPageText);
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerSaving, setHeaderSaving] = useState(false);
  const [downloadsHeader, setDownloadsHeader] = useState<PageTextContent>({
    title: "Downloads",
    subtitle: "Add, update, or remove download cards and keep the resources page fresh.",
  });
  const [editDownloadsHeader, setEditDownloadsHeader] = useState<PageTextContent>({
    title: "Downloads",
    subtitle: "Add, update, or remove download cards and keep the resources page fresh.",
  });
  const [editingDownloadsHeader, setEditingDownloadsHeader] = useState(false);
  const [downloadsSaving, setDownloadsSaving] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("resources")
      .select("*")
      .eq("tenant_id", tenant!.id)
      .order("section_key");

    if (data) {
      setResources(data);
    }
    setLoading(false);
  };

  const fetchPageHeader = async () => {
    try {
      const { data } = await supabase
        .from("page_content")
        .select("*")
        .eq("page_name", "resources")
        .eq("section_key", "header")
        .eq("tenant_id", tenant!.id);

      if (data && data.length > 0) {
        const row = data[0];
        const parsed = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
        setPageHeader(parsed);
        setEditPageHeader(parsed);
      }
    } catch (error) {
      console.error("Failed to load Resources page header:", error);
    }
  };

  const fetchDownloadsHeader = async () => {
    try {
      const { data } = await supabase
        .from("page_content")
        .select("*")
        .eq("page_name", "resources")
        .eq("section_key", "downloads")
        .eq("tenant_id", tenant!.id);

      if (data && data.length > 0) {
        const row = data[0];
        const parsed = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
        setDownloadsHeader(parsed);
        setEditDownloadsHeader(parsed);
      }
    } catch (error) {
      console.error("Failed to load Resources downloads header:", error);
    }
  };

  useEffect(() => {
    fetchResources();
    fetchPageHeader();
    fetchDownloadsHeader();
    }, [tenant?.id]);

  const savePageHeader = async () => {
    setHeaderSaving(true);
    try {
      const entry = {
        page_name: "resources",
        section_key: "header",
        content: editPageHeader,
        tenant_id: tenant!.id,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("page_content").upsert([entry], {
        onConflict: "page_name,section_key,tenant_id",
      });
      if (error) throw error;
      setPageHeader(editPageHeader);
      setEditingHeader(false);
      toast.success("Resources page header updated.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save resources header.");
    } finally {
      setHeaderSaving(false);
    }
  };

  const saveDownloadsHeader = async () => {
    setDownloadsSaving(true);
    try {
      const entry = {
        page_name: "resources",
        section_key: "downloads",
        content: editDownloadsHeader,
        tenant_id: tenant!.id,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("page_content").upsert([entry], {
        onConflict: "page_name,section_key,tenant_id",
      });
      if (error) throw error;
      setDownloadsHeader(editDownloadsHeader);
      setEditingDownloadsHeader(false);
      toast.success("Downloads section updated.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save downloads section.");
    } finally {
      setDownloadsSaving(false);
    }
  };

  const openEditDialog = (resource: Resource | null) => {
    setSelectedResource(resource);
    setEditDialogOpen(true);
  };

  const handleDownload = (resource: Resource) => {
    if (resource.file_url) {
      window.open(resource.file_url, "_blank");
    }
  };

  const openDeleteDialog = (resource: Resource) => {
    setSelectedResource(resource);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedResource) return;

    try {
      if (selectedResource.file_url) {
        const fileName = selectedResource.file_url.split("/").pop();
        if (fileName) {
          await supabase.storage.from("resources").remove([fileName]);
        }
      }

      const { error } = await supabase
        .from("resources")
        .delete()
        .eq("id", selectedResource.id)
        .eq("tenant_id", tenant!.id);

      if (error) throw error;

      toast.success("Resource deleted successfully");
      fetchResources();
      setDeleteDialogOpen(false);
      setSelectedResource(null);
    } catch (error: any) {
      console.error("Error deleting resource:", error);
      toast.error(error.message || "Failed to delete resource");
    }
  };

  return (
    <Layout>
      <section className="relative overflow-hidden bg-primary py-24 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),transparent_40%)]" />
        <div className="relative container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            {editingHeader ? (
              <div className="space-y-4">
                <Input
                  value={editPageHeader.title}
                  onChange={(e) => setEditPageHeader({ ...editPageHeader, title: e.target.value })}
                  className="bg-white text-slate-900"
                  placeholder="Page title"
                />
                <Textarea
                  value={editPageHeader.subtitle}
                  onChange={(e) => setEditPageHeader({ ...editPageHeader, subtitle: e.target.value })}
                  className="min-h-[140px] bg-white text-slate-900"
                  placeholder="Page subtitle"
                />
              </div>
            ) : (
              <>
                <h1 className="text-3xl lg:text-5xl font-poppins font-bold text-primary-foreground">
                  {pageHeader.title}
                </h1>
                <p className="mt-4 text-primary-foreground/80 text-lg max-w-2xl mx-auto">
                  {pageHeader.subtitle}
                </p>
              </>
            )}

            {isAdmin && (
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {editingHeader ? (
                  <>
                    <Button onClick={savePageHeader} disabled={headerSaving} variant="orange" size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      {headerSaving ? "Saving..." : "Save Header"}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingHeader(false);
                        setEditPageHeader(pageHeader);
                      }}
                      variant="orange"
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setEditingHeader(true)} variant="orange" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Page Header
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            {editingDownloadsHeader ? (
              <div className="space-y-4 max-w-3xl mx-auto">
                <Input
                  value={editDownloadsHeader.title}
                  onChange={(e) => setEditDownloadsHeader({ ...editDownloadsHeader, title: e.target.value })}
                  placeholder="Section title"
                  className="mx-auto max-w-xl"
                />
                <Textarea
                  value={editDownloadsHeader.subtitle}
                  onChange={(e) => setEditDownloadsHeader({ ...editDownloadsHeader, subtitle: e.target.value })}
                  placeholder="Section subtitle"
                  className="mx-auto max-w-xl min-h-[120px]"
                />
              </div>
            ) : (
              <>
                <h2 className="text-2xl lg:text-3xl font-poppins font-bold text-foreground">
                  {downloadsHeader.title}
                </h2>
                <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
                  {downloadsHeader.subtitle}
                </p>
              </>
            )}

            {isAdmin && (
              <div className="mt-6 inline-flex flex-wrap justify-center gap-3">
                {editingDownloadsHeader ? (
                  <>
                    <Button onClick={saveDownloadsHeader} disabled={downloadsSaving} variant="orange" size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      {downloadsSaving ? "Saving..." : "Save Downloads"}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingDownloadsHeader(false);
                        setEditDownloadsHeader(downloadsHeader);
                      }}
                      variant="orange"
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setEditingDownloadsHeader(true)} variant="orange" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Downloads
                  </Button>
                )}
                <Button variant="orange" size="sm" onClick={() => openEditDialog(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Resource
                </Button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading resources...</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {resources.map((resource) => {
                const Icon = RESOURCE_ICON_MAP[getResourceIconKey(resource.section_key)] || FileText;
                return (
                  <Card
                    key={resource.id}
                    className="overflow-hidden border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1"
                  >
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                        <Icon className="w-7 h-7 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground">
                          {resource.title}
                        </h3>
                        <p className="mt-3 text-sm text-muted-foreground">
                          {resource.description}
                        </p>
                      </div>
                      <div className="mt-6 space-y-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          size="sm"
                          onClick={() => handleDownload(resource)}
                          disabled={!resource.file_url}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {resource.file_url ? `Download ${resource.file_type || "File"}` : "Not Available"}
                        </Button>
                        {isAdmin && (
                          <div className="grid gap-2">
                            <Button
                              variant="ghost"
                              className="w-full"
                              size="sm"
                              onClick={() => openEditDialog(resource)}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Edit Card
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-full"
                              size="sm"
                              onClick={() => openDeleteDialog(resource)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Resource
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {isAdmin && (
        <section className="py-16 lg:py-24 bg-muted">
          <div className="container mx-auto px-4">
            <AdminQueryList />
          </div>
        </section>
      )}

      {!isAdmin && (
        <section className="py-16 lg:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <QuerySubmissionForm />
            </div>
          </div>
        </section>
      )}

      <section className="py-16 lg:py-24 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-secondary font-medium text-sm uppercase tracking-wider">
              Got Questions?
            </span>
            <h2 className="mt-3 text-2xl lg:text-3xl font-poppins font-bold text-foreground">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-card rounded-xl p-6 shadow-card">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-4 h-4 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-poppins font-semibold text-foreground">
                      {faq.question}
                    </h3>
                    <p className="mt-2 text-muted-foreground">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ResourceUploadDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        resource={selectedResource}
        onSuccess={() => {
          fetchResources();
          setSelectedResource(null);
        }}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Resource"
        description={`Are you sure you want to delete "${selectedResource?.title}"? This will permanently remove the resource.`}
      />
    </Layout>
  );
}

