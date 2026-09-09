import { useState, useRef } from "react";
import { categorizeProblem } from "@/utils/aiCategorize";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { tenantPath } from "@/utils/tenantPath";
import { toast } from "sonner";
import {
  CheckCircle, ChevronRight, ChevronLeft, MapPin,
  FileText, Upload, X, Loader2, Leaf, Droplets, Heart,
  GraduationCap, Tractor, Zap, Building2, Accessibility,
  Landmark, Users, Lightbulb, Building, Sprout, HandHeart,
  ShieldCheck, Factory, TreePine
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const SUBMITTER_TYPES = [
  {
    value: "panchayat",
    label: "Gram / Block Panchayat",
    icon: Landmark,
    description: "Gram Panchayat, Block Panchayat, Zila Parishad",
    requiresReg: true,
    regLabel: "Panchayat Registration / Code",
  },
  {
    value: "urban_local_body",
    label: "Urban Local Body",
    icon: Building2,
    description: "Municipality, Nagar Panchayat, Municipal Corporation",
    requiresReg: true,
    regLabel: "ULB Code / ID",
  },
  {
    value: "govt_dept",
    label: "Government Department",
    icon: ShieldCheck,
    description: "State / Central government department or agency",
    requiresReg: false,
    regLabel: "Department Code",
  },
  {
    value: "ngo",
    label: "NGO / Civil Society Org",
    icon: HandHeart,
    description: "Registered NGO, Trust, Society, or CBO",
    requiresReg: true,
    regLabel: "NGO Registration Number (12A / CSR-1)",
  },
  {
    value: "fpo",
    label: "Farmer Producer Org (FPO)",
    icon: Sprout,
    description: "Farmer Producer Company or Cooperative",
    requiresReg: true,
    regLabel: "FPO Registration Number",
  },
  {
    value: "shg",
    label: "Self Help Group (SHG)",
    icon: Users,
    description: "Women's SHG, JEEVIKA group, or similar",
    requiresReg: true,
    regLabel: "SHG Registration / ID",
  },
  {
    value: "industry_assoc",
    label: "Industry / Trade Association",
    icon: Factory,
    description: "MSME cluster, industry body, or trade association",
    requiresReg: true,
    regLabel: "Association Registration Number",
  },
  {
    value: "community_org",
    label: "Community Organization",
    icon: TreePine,
    description: "Resident Welfare Association, Village Committee, etc.",
    requiresReg: false,
    regLabel: "Community Group ID (if any)",
  },
  {
    value: "educational_institution",
    label: "Educational Institution",
    icon: GraduationCap,
    description: "School, College, or Research Institution",
    requiresReg: true,
    regLabel: "UDISE / AISHE Code",
  },
];

const DOMAINS = [
  { value: "education", label: "Education", icon: GraduationCap, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "healthcare", label: "Healthcare", icon: Heart, color: "bg-red-100 text-red-700 border-red-200" },
  { value: "agriculture", label: "Agriculture", icon: Tractor, color: "bg-green-100 text-green-700 border-green-200" },
  { value: "water_management", label: "Water Management", icon: Droplets, color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "environment", label: "Environment", icon: Leaf, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "energy", label: "Energy", icon: Zap, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "urban_infrastructure", label: "Urban Infrastructure", icon: Building2, color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "accessibility", label: "Accessibility", icon: Accessibility, color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "public_service", label: "Public Service Delivery", icon: Landmark, color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "rural_livelihoods", label: "Rural Livelihoods", icon: Users, color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "sanitation", label: "Sanitation", icon: Lightbulb, color: "bg-teal-100 text-teal-700 border-teal-200" },
];

const JHARKHAND_DISTRICTS = [
  "Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum",
  "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara",
  "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu",
  "Ramgarh", "Ranchi", "Sahebganj", "Seraikela Kharsawan", "Simdega",
  "West Singhbhum"
];

const PRIORITIES = [
  { value: "low", label: "Low", desc: "Affects a small locality" },
  { value: "medium", label: "Medium", desc: "Community or village level" },
  { value: "high", label: "High", desc: "Block or district level" },
  { value: "critical", label: "Critical", desc: "Multi-district or emergency" },
];

const STEPS = [
  { id: 1, title: "Organization", icon: Building },
  { id: 2, title: "Problem", icon: FileText },
  { id: 3, title: "Location", icon: MapPin },
  { id: 4, title: "Evidence", icon: Upload },
];

// ── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1 — Org
  submitter_type: string;
  submitter_org_name: string;
  reg_number: string;
  contact_person_name: string;
  contact_person_designation: string;
  submitter_email: string;
  submitter_phone: string;
  // Step 2 — Problem
  title: string;
  description: string;
  detailed_description: string;
  domain: string;
  sub_domain: string;
  priority: string;
  tags: string;
  beneficiaries_count: string;
  // Step 3 — Location
  location_state: string;
  location_district: string;
  location_block: string;
  location_village: string;
  location_pincode: string;
}

const INITIAL_FORM: FormData = {
  submitter_type: "",
  submitter_org_name: "",
  reg_number: "",
  contact_person_name: "",
  contact_person_designation: "",
  submitter_email: "",
  submitter_phone: "",
  title: "",
  description: "",
  detailed_description: "",
  domain: "",
  sub_domain: "",
  priority: "medium",
  tags: "",
  beneficiaries_count: "",
  location_state: "Jharkhand",
  location_district: "",
  location_block: "",
  location_village: "",
  location_pincode: "",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubmitProblem() {
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const photoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  // current org type metadata
  const currentOrgType = SUBMITTER_TYPES.find((t) => t.value === form.submitter_type);

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!form.submitter_type) errs.submitter_type = "Please select your organization type";
      if (!form.submitter_org_name.trim()) errs.submitter_org_name = "Organization name is required";
      if (!form.contact_person_name.trim()) errs.contact_person_name = "Contact person name is required";
      if (!form.contact_person_designation.trim()) errs.contact_person_designation = "Designation is required";
      if (!form.submitter_email.trim()) errs.submitter_email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.submitter_email))
        errs.submitter_email = "Please enter a valid email";
      if (form.submitter_phone && !/^[6-9]\d{9}$/.test(form.submitter_phone.replace(/\s/g, "")))
        errs.submitter_phone = "Please enter a valid 10-digit mobile number";
    }

    if (step === 2) {
      if (!form.title.trim()) errs.title = "Title is required";
      else if (form.title.length < 10) errs.title = "Title must be at least 10 characters";
      if (!form.description.trim()) errs.description = "Description is required";
      else if (form.description.length < 30) errs.description = "Please describe in at least 30 characters";
      if (!form.domain) errs.domain = "Please select a domain";
    }

    if (step === 3) {
      if (!form.location_district) errs.location_district = "Please select a district";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (validate()) setStep((s) => s + 1); };
  const back = () => setStep((s) => s - 1);

  // ── File upload helpers ───────────────────────────────────────────────────

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/") && f.size < 5 * 1024 * 1024);
    if (valid.length < files.length) toast.warning("Some files skipped — only images under 5MB allowed");
    setPhotos((prev) => [...prev, ...valid].slice(0, 5));
  };

  const addDocs = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) => f.size < 10 * 1024 * 1024);
    if (valid.length < files.length) toast.warning("Some files skipped — max 10MB per document");
    setDocuments((prev) => [...prev, ...valid].slice(0, 5));
  };

  const uploadFiles = async (files: File[], folder: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("resources").upload(path, file, { upsert: false });
      if (!error) {
        const { data } = supabase.storage.from("resources").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const [photoUrls, docUrls] = await Promise.all([
        photos.length > 0 ? uploadFiles(photos, "submissions/photos") : Promise.resolve([]),
        documents.length > 0 ? uploadFiles(documents, "submissions/docs") : Promise.resolve([]),
      ]);

      const tagsArr = form.tags.split(",").map((t) => t.trim()).filter(Boolean);

      // Build org name with reg number if available
      const orgName = form.reg_number.trim()
        ? `${form.submitter_org_name.trim()} (${form.reg_number.trim()})`
        : form.submitter_org_name.trim();

      const { data, error } = await supabase
        .from("citizen_submissions")
        .insert({
          title: form.title.trim(),
          description: form.description.trim(),
          detailed_description: form.detailed_description.trim() || null,
          domain: form.domain,
          sub_domain: form.sub_domain.trim() || null,
          priority: form.priority,
          tags: tagsArr.length > 0 ? tagsArr : null,
          location_state: form.location_state,
          location_district: form.location_district,
          location_block: form.location_block.trim() || null,
          location_village: form.location_village.trim() || null,
          location_pincode: form.location_pincode.trim() || null,
          submitter_type: form.submitter_type,
          submitter_name: form.contact_person_name.trim(),
          submitter_email: form.submitter_email.trim(),
          submitter_phone: form.submitter_phone.trim() || null,
          submitter_org_name: orgName,
          photo_urls: photoUrls.length > 0 ? photoUrls : null,
          document_urls: docUrls.length > 0 ? docUrls : null,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw error;
      setSubmissionId(data.id);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast.error(err?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-16 px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-poppins font-bold text-foreground mb-3">
              Problem Submitted Successfully!
            </h1>
            <p className="text-muted-foreground mb-2">
              Thank you. Your organization's submission has been received and will be reviewed. It will be routed to the most suitable university partner for an innovation-driven solution.
            </p>
            {submissionId && (
              <div className="bg-muted rounded-lg px-4 py-3 mt-4 mb-6">
                <p className="text-xs text-muted-foreground mb-1">Reference ID — share this for follow-up</p>
                <p className="font-mono font-bold text-foreground text-sm tracking-wider">
                  {submissionId.slice(0, 8).toUpperCase()}
                </p>
              </div>
            )}
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => {
                  setSubmitted(false);
                  setSubmissionId(null);
                  setForm(INITIAL_FORM);
                  setPhotos([]);
                  setDocuments([]);
                  setStep(1);
                }}
              >
                Submit Another Problem
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(tenantPath(tenant?.slug || "", "/problems"))}
              >
                Browse All Submissions
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <Layout>
      {/* Hero */}
      <div className="bg-primary text-primary-foreground py-10 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <h1 className="text-3xl md:text-4xl font-poppins font-bold mb-3">
            Submit a Societal Problem
          </h1>
          <p className="text-primary-foreground/80 text-base">
            Organizations can submit challenges from their communities for evaluation and innovation-driven resolution by universities and industry.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4 text-xs text-primary-foreground/70">
            <span className="bg-primary-foreground/10 rounded-full px-3 py-1">Panchayats</span>
            <span className="bg-primary-foreground/10 rounded-full px-3 py-1">NGOs</span>
            <span className="bg-primary-foreground/10 rounded-full px-3 py-1">Govt Departments</span>
            <span className="bg-primary-foreground/10 rounded-full px-3 py-1">FPOs</span>
            <span className="bg-primary-foreground/10 rounded-full px-3 py-1">SHGs</span>
            <span className="bg-primary-foreground/10 rounded-full px-3 py-1">ULBs</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-10">
        {/* Step indicators */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isCompleted = step > s.id;
              const isCurrent = step === s.id;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted ? "bg-primary border-primary text-primary-foreground"
                        : isCurrent ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground bg-background"
                    }`}>
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs hidden sm:block font-medium ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                      {s.title}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-2 transition-all ${step > s.id ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.max(progress, 5)}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8">

          {/* ── Step 1: Organization Details ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-poppins font-semibold mb-1">Organization Details</h2>
                <p className="text-sm text-muted-foreground">Tell us about the organization submitting this problem.</p>
              </div>

              {/* Org type selector */}
              <div className="space-y-2">
                <Label>Organization Type <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUBMITTER_TYPES.map((t) => {
                    const Icon = t.icon;
                    const selected = form.submitter_type === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => {
                          setForm((p) => ({ ...p, submitter_type: t.value, reg_number: "" }));
                          if (errors.submitter_type) setErrors((p) => ({ ...p, submitter_type: "" }));
                        }}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                          selected
                            ? "border-primary border-2 bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                        <div>
                          <p className={`text-sm font-semibold ${selected ? "text-primary" : "text-foreground"}`}>{t.label}</p>
                          <p className="text-xs text-muted-foreground leading-tight">{t.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.submitter_type && <p className="text-sm text-destructive">{errors.submitter_type}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="submitter_org_name">Organization Name <span className="text-destructive">*</span></Label>
                <Input
                  id="submitter_org_name"
                  placeholder="Full official name of the organization"
                  value={form.submitter_org_name}
                  onChange={set("submitter_org_name")}
                  className={errors.submitter_org_name ? "border-destructive" : ""}
                />
                {errors.submitter_org_name && <p className="text-sm text-destructive">{errors.submitter_org_name}</p>}
              </div>

              {currentOrgType && (
                <div className="space-y-2">
                  <Label htmlFor="reg_number">
                    {currentOrgType.regLabel}
                    <span className="text-muted-foreground text-xs ml-1">(optional)</span>
                  </Label>
                  <Input
                    id="reg_number"
                    placeholder={`Enter ${currentOrgType.regLabel}`}
                    value={form.reg_number}
                    onChange={set("reg_number")}
                  />
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_person_name">Contact Person Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="contact_person_name"
                    placeholder="Full name"
                    value={form.contact_person_name}
                    onChange={set("contact_person_name")}
                    className={errors.contact_person_name ? "border-destructive" : ""}
                  />
                  {errors.contact_person_name && <p className="text-sm text-destructive">{errors.contact_person_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person_designation">Designation <span className="text-destructive">*</span></Label>
                  <Input
                    id="contact_person_designation"
                    placeholder="e.g., Sarpanch, Director, Secretary"
                    value={form.contact_person_designation}
                    onChange={set("contact_person_designation")}
                    className={errors.contact_person_designation ? "border-destructive" : ""}
                  />
                  {errors.contact_person_designation && <p className="text-sm text-destructive">{errors.contact_person_designation}</p>}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="submitter_email">Official Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="submitter_email"
                    type="email"
                    placeholder="official@org.gov.in"
                    value={form.submitter_email}
                    onChange={set("submitter_email")}
                    className={errors.submitter_email ? "border-destructive" : ""}
                  />
                  {errors.submitter_email && <p className="text-sm text-destructive">{errors.submitter_email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submitter_phone">Mobile Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    id="submitter_phone"
                    type="tel"
                    placeholder="10-digit mobile"
                    value={form.submitter_phone}
                    onChange={set("submitter_phone")}
                    className={errors.submitter_phone ? "border-destructive" : ""}
                    maxLength={10}
                  />
                  {errors.submitter_phone && <p className="text-sm text-destructive">{errors.submitter_phone}</p>}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Problem Details ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-poppins font-semibold mb-1">Describe the Problem</h2>
                <p className="text-sm text-muted-foreground">What challenge does your community / constituency face?</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Problem Title <span className="text-destructive">*</span></Label>
                <Input
                  id="title"
                  placeholder="e.g., Contaminated drinking water in Bero Block affecting 3 villages"
                  value={form.title}
                  onChange={set("title")}
                  className={errors.title ? "border-destructive" : ""}
                  maxLength={120}
                />
                <div className="flex justify-between">
                  {errors.title ? <p className="text-sm text-destructive">{errors.title}</p> : <span />}
                  <span className="text-xs text-muted-foreground">{form.title.length}/120</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Brief Description <span className="text-destructive">*</span></Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Briefly explain the problem, who it affects, and the scale of impact (min. 30 characters)"
                  value={form.description}
                  onChange={set("description")}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none ${errors.description ? "border-destructive" : "border-border"}`}
                  maxLength={500}
                />
                <div className="flex justify-between">
                  {errors.description ? <p className="text-sm text-destructive">{errors.description}</p> : <span />}
                  <span className="text-xs text-muted-foreground">{form.description.length}/500</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="detailed_description">Detailed Description <span className="text-muted-foreground text-xs">(optional but recommended)</span></Label>
                <textarea
                  id="detailed_description"
                  rows={4}
                  placeholder="Provide more context — duration, existing efforts, root causes, what a solution might look like"
                  value={form.detailed_description}
                  onChange={set("detailed_description")}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* AI Suggest button */}
              {(form.title.length >= 10 && form.description.length >= 30) && (
                <div className="flex items-center gap-3 bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-violet-900">✨ Auto-fill with AI</p>
                    <p className="text-xs text-violet-600">Suggest domain, priority &amp; tags from your description</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={aiLoading}
                    className="bg-violet-600 hover:bg-violet-700 text-white gap-2 shrink-0"
                    onClick={async () => {
                      setAiLoading(true);
                      try {
                        const suggestion = await categorizeProblem(form.title, form.description, form.location_district);
                        setForm((prev) => ({
                          ...prev,
                          domain: suggestion.domain || prev.domain,
                          sub_domain: suggestion.sub_domain || prev.sub_domain,
                          priority: suggestion.priority || prev.priority,
                          tags: suggestion.tags?.join(", ") || prev.tags,
                        }));
                        toast.success("AI suggestions applied!");
                      } catch (err: any) {
                        toast.error(err?.message || "AI suggestion failed");
                      } finally {
                        setAiLoading(false);
                      }
                    }}
                  >
                    {aiLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</> : "✨ AI Suggest"}
                  </Button>
                </div>
              )}

              {/* Domain selector */}
              <div className="space-y-2">
                <Label>Domain <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DOMAINS.map((d) => {
                    const Icon = d.icon;
                    const selected = form.domain === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => {
                          setForm((p) => ({ ...p, domain: d.value }));
                          if (errors.domain) setErrors((p) => ({ ...p, domain: "" }));
                        }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-sm font-medium transition-all ${
                          selected ? `${d.color} border-2 shadow-sm` : "border-border hover:border-primary/40 text-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                {errors.domain && <p className="text-sm text-destructive">{errors.domain}</p>}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sub_domain">Sub-domain <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    id="sub_domain"
                    placeholder="e.g., Drinking water, Primary education"
                    value={form.sub_domain}
                    onChange={set("sub_domain")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority Level</Label>
                  <select
                    value={form.priority}
                    onChange={set("priority")}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="beneficiaries_count">Approx. Beneficiaries <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    id="beneficiaries_count"
                    type="number"
                    placeholder="e.g., 5000"
                    value={form.beneficiaries_count}
                    onChange={set("beneficiaries_count")}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                  <Input
                    id="tags"
                    placeholder="e.g., water, health, tribal"
                    value={form.tags}
                    onChange={set("tags")}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Location ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-poppins font-semibold mb-1">Problem Location</h2>
                <p className="text-sm text-muted-foreground">Precise location helps assign the nearest university partner.</p>
              </div>

              <div className="space-y-2">
                <Label>State</Label>
                <Input value="Jharkhand" disabled className="bg-muted text-muted-foreground" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_district">District <span className="text-destructive">*</span></Label>
                <select
                  id="location_district"
                  value={form.location_district}
                  onChange={set("location_district")}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary ${errors.location_district ? "border-destructive" : "border-border"}`}
                >
                  <option value="">Select District</option>
                  {JHARKHAND_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {errors.location_district && <p className="text-sm text-destructive">{errors.location_district}</p>}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location_block">Block / Taluka <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="location_block" placeholder="e.g., Bero Block" value={form.location_block} onChange={set("location_block")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location_village">Village / Ward <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="location_village" placeholder="e.g., Harmu Village" value={form.location_village} onChange={set("location_village")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_pincode">PIN Code <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input id="location_pincode" placeholder="e.g., 834001" value={form.location_pincode} onChange={set("location_pincode")} maxLength={6} />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <MapPin className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Location data is used to match problems with nearby university and industry partners for faster resolution.
              </div>
            </div>
          )}

          {/* ── Step 4: Evidence & Review ── */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-poppins font-semibold mb-1">Evidence &amp; Review</h2>
                <p className="text-sm text-muted-foreground">Attach supporting files, then review and submit.</p>
              </div>

              {/* Photos */}
              <div className="space-y-3">
                <Label>Photos <span className="text-muted-foreground text-xs">(up to 5, max 5MB each)</span></Label>
                <div
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/60 transition-colors"
                  onClick={() => photoRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); addPhotos(e.dataTransfer.files); }}
                >
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click or drag photos here</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WEBP — max 5MB each</p>
                  <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
                </div>
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((file, i) => (
                      <div key={i} className="relative group">
                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-24 object-cover rounded-lg border border-border" />
                        <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Documents */}
              <div className="space-y-3">
                <Label>Supporting Documents <span className="text-muted-foreground text-xs">(up to 5, max 10MB each)</span></Label>
                <div
                  className="border-2 border-dashed border-border rounded-xl p-5 cursor-pointer hover:border-primary/60 transition-colors"
                  onClick={() => docRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); addDocs(e.dataTransfer.files); }}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-7 h-7 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">Click to attach reports, data, MoM, or other documents</p>
                  </div>
                  <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" multiple className="hidden" onChange={(e) => addDocs(e.target.files)} />
                </div>
                {documents.length > 0 && (
                  <ul className="space-y-2">
                    {documents.map((file, i) => (
                      <li key={i} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                        </div>
                        <button type="button" onClick={() => setDocuments((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-muted-foreground hover:text-destructive ml-2 flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Summary */}
              <div className="bg-muted rounded-xl p-5 space-y-3 text-sm border border-border">
                <p className="font-semibold text-foreground">Submission Summary</p>
                <div className="grid grid-cols-2 gap-y-2 text-muted-foreground">
                  <span className="font-medium text-foreground">Organization</span>
                  <span className="truncate">{form.submitter_org_name}</span>
                  <span className="font-medium text-foreground">Contact</span>
                  <span className="truncate">{form.contact_person_name} ({form.contact_person_designation})</span>
                  <span className="font-medium text-foreground">Problem Title</span>
                  <span className="truncate">{form.title}</span>
                  <span className="font-medium text-foreground">Domain</span>
                  <span className="capitalize">{DOMAINS.find((d) => d.value === form.domain)?.label || form.domain}</span>
                  <span className="font-medium text-foreground">District</span>
                  <span>{form.location_district}, Jharkhand</span>
                  <span className="font-medium text-foreground">Priority</span>
                  <span className="capitalize">{form.priority}</span>
                  <span className="font-medium text-foreground">Attachments</span>
                  <span>{photos.length} photo(s), {documents.length} document(s)</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button type="button" variant="outline" onClick={back} disabled={step === 1 || submitting} className="gap-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            {step < STEPS.length ? (
              <Button type="button" onClick={next} className="gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={submitting} className="gap-2 min-w-36" variant="orange">
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  : <><CheckCircle className="w-4 h-4" /> Submit Problem</>
                }
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
