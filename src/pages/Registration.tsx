import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { tenantPath } from "@/utils/tenantPath";
import { fetchProblemsUnlockAt } from "@/lib/contestSettings";

// Per-member field shape
interface MemberFields {
  name: string;
  roll: string;
  year: string;
  department: string;
  phone: string;
  email: string;
}

const blankMember = (): MemberFields => ({
  name: "",
  roll: "",
  year: "",
  department: "",
  phone: "",
  email: "",
});

export default function Registration() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [problemIdError, setProblemIdError] = useState<string>("");
  const [resolvedProblemUuid, setResolvedProblemUuid] = useState<string | null>(null);
  const [problemLimitInfo, setProblemLimitInfo] = useState<{ max: number | null; curr: number } | null>(null);
  const [isValidatingProblemId, setIsValidatingProblemId] = useState(false);
  const [phoneErrors, setPhoneErrors] = useState<string[]>(["", "", "", ""]);

  // Team size dropdown: 2, 3, or 4
  const [teamSize, setTeamSize] = useState<2 | 3 | 4>(2);

  // Countdown / unlock gate (mirrors Problems.tsx)
  const [unlockTime, setUnlockTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  useEffect(() => {
    const fetchUnlockTime = async () => {
      try {
        const unlockDate = await fetchProblemsUnlockAt(tenant!.id);

        if (!unlockDate) {
          setIsUnlocked(true);
          return;
        }

        setUnlockTime(unlockDate);

        if (isAdmin) {
          setIsUnlocked(true);
          return;
        }

        const now = new Date();
        if (now >= unlockDate) {
          setIsUnlocked(true);
        }
      } catch (err: any) {
        console.error("Error fetching unlock time:", err);
        setIsUnlocked(true);
      }
    };

    fetchUnlockTime();
  }, [isAdmin, tenant?.id]);

  useEffect(() => {
    if (!unlockTime || isUnlocked) return;

    const interval = setInterval(() => {
      const now = new Date();
      const distance = unlockTime.getTime() - now.getTime();

      if (distance < 0) {
        clearInterval(interval);
        setIsUnlocked(true);
        setTimeRemaining("");
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [unlockTime, isUnlocked]);

  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<MemberFields[]>([
    blankMember(),
    blankMember(),
    blankMember(),
    blankMember(),
  ]);
  const [problemId, setProblemId] = useState("");
  // Persist form state key (per-tenant)
  const storageKey = `registration_form_${tenant?.id || 'public'}`;

  // Load saved form state on mount (or when tenant changes)
  useEffect(() => {
    try {
      if (!tenant?.id) return;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.teamName) setTeamName(parsed.teamName);
      if (parsed.teamSize) setTeamSize(parsed.teamSize);
      if (parsed.members && Array.isArray(parsed.members)) {
        // merge into members keeping shape
        const merged = [blankMember(), blankMember(), blankMember(), blankMember()];
        parsed.members.forEach((m: any, i: number) => {
          if (i < 4) merged[i] = { ...merged[i], ...m };
        });
        setMembers(merged);
      }
      if (parsed.problemId) setProblemId(parsed.problemId);
      // we intentionally do NOT restore file inputs for security/size reasons
    } catch (err) {
      console.warn('Failed to load saved registration form:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  // Pre-fill problem ID from URL ?problem= query param (e.g. from Apply button)
  useEffect(() => {
    const psFromUrl = searchParams.get("problem");
    if (!psFromUrl || !tenant?.id) return;
    // Set immediately so the input shows the value
    setProblemId(psFromUrl);
    // Validate asynchronously
    setIsValidatingProblemId(true);
    validateAndResolveProblemId(psFromUrl).then(({ error, uuid }) => {
      setProblemIdError(error);
      setResolvedProblemUuid(uuid);
      setIsValidatingProblemId(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, tenant?.id]);

  // Save form state to localStorage with debounce
  useEffect(() => {
    if (!tenant?.id) return;
    const toSave = {
      teamName,
      teamSize,
      members,
      problemId,
      savedAt: new Date().toISOString(),
    };

    const id = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(toSave));
      } catch (e) {
        console.warn('Failed to save registration form:', e);
      }
    }, 500);

    return () => clearTimeout(id);
  }, [teamName, teamSize, members, problemId, tenant?.id]);

  const validatePhone = (phone: string): string => {
    if (!phone) return "";
    if (!/^\d+$/.test(phone)) return "Phone number must contain only numeric digits.";
    if (phone.length !== 10) return "Phone number must be exactly 10 digits.";
    if (!/^[6-9]/.test(phone)) return "Phone number must start with 6, 7, 8, or 9.";
    return "";
  };

  const validateAndResolveProblemId = async (id: string): Promise<{ error: string; uuid: string | null }> => {
    if (!id) return { error: "", uuid: null };

    try {
      let q: any = supabase
        .from("problem_statements")
        .select("id, max_registrations, curr_registrations")
        .eq("problem_statement_id", id);

      if (tenant?.id) q = q.eq("tenant_id", tenant.id);

      const { data, error } = await q.single();

      if (error || !data) {
        setProblemLimitInfo(null);
        return { error: "Invalid Problem ID", uuid: null };
      }

      setProblemLimitInfo({
        max: (data as any).max_registrations ?? null,
        curr: (data as any).curr_registrations ?? 0,
      });
      return { error: "", uuid: data.id };
    } catch (error) {
      console.error("Error validating problem ID:", error);
      setProblemLimitInfo(null);
      return { error: "Invalid Problem ID", uuid: null };
    }
  };

  const handleMemberChange = (
    index: number,
    field: keyof MemberFields,
    value: string
  ) => {
    setMembers((prev) => {
      const updated = prev.map((m, i) => (i === index ? { ...m, [field]: value } : m));
      return updated;
    });

    if (field === "phone") {
      const err = validatePhone(value);
      setPhoneErrors((prev) => {
        const updated = [...prev];
        updated[index] = err;
        return updated;
      });
    }
  };

  const handleProblemIdChange = async (value: string) => {
    setProblemId(value);
    setProblemLimitInfo(null);
    setIsValidatingProblemId(true);
    const { error, uuid } = await validateAndResolveProblemId(value);
    setProblemIdError(error);
    setResolvedProblemUuid(uuid);
    setIsValidatingProblemId(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleLoginRedirect = () => {
    localStorage.setItem("redirectAfterLogin", tenantPath(tenant!.slug, "/registration"));
    navigate(tenantPath(tenant!.slug, "/auth"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phones for active members
    const newPhoneErrors = ["", "", "", ""];
    let hasPhoneError = false;
    for (let i = 0; i < teamSize; i++) {
      const err = validatePhone(members[i].phone);
      newPhoneErrors[i] = err;
      if (err) hasPhoneError = true;
    }
    setPhoneErrors(newPhoneErrors);
    if (hasPhoneError) return;

    // Validate problem ID
    let resolvedUuid = resolvedProblemUuid;
    let problemIdErr = "";
    if (!resolvedUuid && problemId) {
      const { error, uuid } = await validateAndResolveProblemId(problemId);
      problemIdErr = error;
      resolvedUuid = uuid;
    } else if (!resolvedUuid) {
      problemIdErr = "Invalid Problem ID";
    }
    setProblemIdError(problemIdErr);
    if (problemIdErr || !resolvedUuid) return;

    // Re-fetch live limit from DB right before submitting (avoids stale cached state)
    const { data: livePS } = await supabase
      .from("problem_statements")
      .select("max_registrations, curr_registrations")
      .eq("id", resolvedUuid)
      .eq("tenant_id", tenant?.id)
      .single();

    if (livePS) {
      const max = (livePS as any).max_registrations;
      const curr = (livePS as any).curr_registrations ?? 0;
      if (max !== null && max !== undefined && curr >= max) {
        toast({
          title: "Registrations Full",
          description: "This problem statement has reached its maximum number of registrations.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

      if (userError || !authUser) {
        toast({
          title: "Authentication Required",
          description: "Please log in to register your team.",
          variant: "destructive",
        });
        return;
      }

      // Check if team name already exists for this tenant
      const { data: teamExists, error: checkError } = await (supabase as any)
        .from("team_registrations")
        .select("id")
        .eq("team_name", teamName.trim())
        .eq("tenant_id", tenant!.id)
        .maybeSingle();

      if (checkError) {
        toast({
          title: "Error",
          description: "Failed to check existing team names.",
          variant: "destructive",
        });
        return;
      }

      if (teamExists) {
        toast({
          title: "Team Name Already Exists",
          description: "A team with this name has already been registered. Please choose a different team name.",
          variant: "destructive",
        });
        return;
      }

      let documentUrl = null;

      if (selectedFile) {
        const sanitizedFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storageKey = `${authUser.id}_${Date.now()}_${sanitizedFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("team-documents")
          .upload(storageKey, selectedFile);

        if (uploadError) {
          console.error(uploadError);
          toast({
            title: "Upload Failed",
            description: uploadError.message,
            variant: "destructive",
          });
          return;
        }

        documentUrl = storageKey;
      }

      const m = members;

      const { error: insertError } = await supabase
        .from("team_registrations")
        .insert({
          user_id: authUser.id,
          team_name: teamName,
          problem_id: problemId,
          // Member 1
          member1_name: m[0].name,
          member1_roll: m[0].roll,
          member1_year: m[0].year,
          member1_department: m[0].department,
          member1_phone: m[0].phone,
          member1_email: m[0].email,
          // Member 2 (always required — min team size is 2)
          member2_name: m[1].name,
          member2_roll: m[1].roll,
          member2_year: m[1].year,
          member2_department: m[1].department,
          member2_phone: m[1].phone,
          member2_email: m[1].email,
          // Member 3
          member3_name: teamSize >= 3 ? m[2].name || null : null,
          member3_roll: teamSize >= 3 ? m[2].roll || null : null,
          member3_year: teamSize >= 3 ? m[2].year || null : null,
          member3_department: teamSize >= 3 ? m[2].department || null : null,
          member3_phone: teamSize >= 3 ? m[2].phone || null : null,
          member3_email: teamSize >= 3 ? m[2].email || null : null,
          // Member 4
          member4_name: teamSize >= 4 ? m[3].name || null : null,
          member4_roll: teamSize >= 4 ? m[3].roll || null : null,
          member4_year: teamSize >= 4 ? m[3].year || null : null,
          member4_department: teamSize >= 4 ? m[3].department || null : null,
          member4_phone: teamSize >= 4 ? m[3].phone || null : null,
          member4_email: teamSize >= 4 ? m[3].email || null : null,
          // Document
          document_url: documentUrl,
          document_filename: selectedFile ? selectedFile.name : null,
          tenant_id: tenant?.id,
        });

      if (insertError) {
        toast({
          title: "Registration Failed",
          description: "Failed to register team. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitted(true);
      toast({
        title: "Registration Successful!",
        description: "Your team has been registered.",
      });
      // clear saved draft
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        /* ignore */
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Layout>
        <section className="min-h-[80vh] flex items-center justify-center bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-lg mx-auto text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-poppins font-bold text-foreground">
                Registration Complete!
              </h1>
              <p className="mt-4 text-muted-foreground">
                Thank you for registering. You will receive a confirmation email shortly with further instructions.
              </p>
              <Button
                variant="default"
                size="lg"
                className="mt-8"
                onClick={() => setIsSubmitted(false)}
              >
                Register Another Team
              </Button>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  const isLocked = !user || (!!user && !isUnlocked && !isAdmin);
  const inputClass = (extra = "") =>
    `w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${isLocked ? "opacity-50 cursor-not-allowed" : ""} ${extra}`;

  const memberNums = Array.from({ length: teamSize }, (_, i) => i);

  return (
    <Layout>
      {/* Header */}
      <section className="bg-primary py-16 lg:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl lg:text-5xl font-poppins font-bold text-primary-foreground">
            University / Research Team Registration
          </h1>
          <p className="mt-4 text-primary-foreground/80 text-lg max-w-2xl mx-auto">
            Register your institution or research team to collaborate on validated societal challenges. Fill in all the required details below.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="container mx-auto px-4">
          <form
            onSubmit={user && isUnlocked ? handleSubmit : (e) => e.preventDefault()}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-card rounded-2xl shadow-card p-8 space-y-8">
              {/* Alerts */}
              {!user && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-medium">
                    You must be logged in to register for this event.
                  </p>
                </div>
              )}
              {user && !isUnlocked && !isAdmin && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-medium">
                    Registration will be available after the problem statements open.
                    {timeRemaining && ` Opens in: ${timeRemaining}`}
                  </p>
                </div>
              )}

              {/* Team Info */}
              <div>
                <h3 className="font-poppins font-semibold text-lg text-foreground border-b border-border pb-3 mb-6">
                  Team Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      disabled={isLocked}
                      className={inputClass()}
                      placeholder="Enter your team name"
                    />
                  </div>

                  {/* Team Size Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Number of Team Members *
                    </label>
                    <select
                      value={teamSize}
                      onChange={(e) => setTeamSize(Number(e.target.value) as 2 | 3 | 4)}
                      disabled={isLocked}
                      className={inputClass()}
                    >
                      <option value={2}>2 Members</option>
                      <option value={3}>3 Members</option>
                      <option value={4}>4 Members</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Team Members — one full block per member */}
              <div>
                <h3 className="font-poppins font-semibold text-lg text-foreground border-b border-border pb-3 mb-6">
                  Team Member Details
                </h3>
                <div className="space-y-8">
                  {memberNums.map((i) => (
                    <div key={i} className="rounded-xl border border-border p-5 space-y-4">
                      <h4 className="font-poppins font-semibold text-base text-foreground">
                        Member {i + 1} Details
                      </h4>

                      {/* Name & Roll */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={members[i].name}
                            onChange={(e) => handleMemberChange(i, "name", e.target.value)}
                            disabled={isLocked}
                            className={inputClass()}
                            placeholder="Full name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Roll Number *
                          </label>
                          <input
                            type="text"
                            required
                            value={members[i].roll}
                            onChange={(e) => handleMemberChange(i, "roll", e.target.value)}
                            disabled={isLocked}
                            className={inputClass()}
                            placeholder="Roll number"
                          />
                        </div>
                      </div>

                      {/* Year & Department */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Year *
                          </label>
                          <select
                            required
                            value={members[i].year}
                            onChange={(e) => handleMemberChange(i, "year", e.target.value)}
                            disabled={isLocked}
                            className={inputClass()}
                          >
                            <option value="">Select Year</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Department *
                          </label>
                          <select
                            required
                            value={members[i].department}
                            onChange={(e) => handleMemberChange(i, "department", e.target.value)}
                            disabled={isLocked}
                            className={inputClass()}
                          >
                            <option value="">Select Department</option>
                            <option value="AIML">AIML</option>
                            <option value="CSE">CSE</option>
                            <option value="ECE">ECE</option>
                            <option value="EEE">EEE</option>
                            <option value="MECH">MECH</option>
                            <option value="CIVIL">CIVIL</option>
                            <option value="MBA">MBA</option>
                            <option value="PHARMACY">PHARMACY</option>
                          </select>
                        </div>
                      </div>

                      {/* Phone & Email */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            required
                            value={members[i].phone}
                            onChange={(e) => handleMemberChange(i, "phone", e.target.value)}
                            disabled={isLocked}
                            className={`w-full px-4 py-3 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${phoneErrors[i] ? "border-red-500" : "border-input"} ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                            placeholder="10-digit mobile number"
                          />
                          {phoneErrors[i] && (
                            <p className="text-red-500 text-sm mt-1">{phoneErrors[i]}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Email *
                          </label>
                          <input
                            type="email"
                            required
                            value={members[i].email}
                            onChange={(e) => handleMemberChange(i, "email", e.target.value)}
                            disabled={isLocked}
                            className={inputClass()}
                            placeholder="Email address"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Problem Selection */}
              <div>
                <h3 className="font-poppins font-semibold text-lg text-foreground border-b border-border pb-3 mb-6">
                  Problem Selection
                </h3>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Problem ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={problemId}
                    onChange={(e) => handleProblemIdChange(e.target.value)}
                    disabled={isLocked}
                    className={`w-full px-4 py-3 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${problemIdError ? "border-red-500" : "border-input"} ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                    placeholder="Enter problem ID (e.g., PS001)"
                  />
                  {problemIdError && (
                    <p className="text-red-500 text-sm mt-1">{problemIdError}</p>
                  )}
                </div>
              </div>

              {/* File Upload */}
              <div>
                <h3 className="font-poppins font-semibold text-lg text-foreground border-b border-border pb-3 mb-6">
                  Upload Documents
                </h3>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">
                    Drag and drop your files here, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Accepted formats: PDF, PPT, PPTX (Max 10MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.ppt,.pptx"
                    onChange={handleFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={handleFileButtonClick}
                    disabled={isLocked}
                  >
                    Choose Files
                  </Button>
                  {selectedFile && (
                    <p className="text-sm text-foreground mt-2">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit */}
              {!user ? (
                <Button
                  type="button"
                  variant="orange"
                  size="xl"
                  className="w-full"
                  onClick={handleLoginRedirect}
                >
                  Login to Register
                </Button>
              ) : user && !isUnlocked && !isAdmin ? (
                <Button
                  type="button"
                  variant="orange"
                  size="xl"
                  className="w-full opacity-50 cursor-not-allowed"
                  disabled
                >
                  Submit Registration
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="orange"
                  size="xl"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Submitting..." : "Submit Registration"}
                </Button>
              )}
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
}
