import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Eye, EyeOff, LogIn, UserPlus, Building2, GraduationCap, Users, Briefcase, ShieldCheck, User } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { tenantPath } from "@/utils/tenantPath";

// Role options for the platform
const ROLE_OPTIONS = [
  {
    value: "student",
    label: "Student / Researcher",
    icon: GraduationCap,
    description: "University student or research scholar",
  },
  {
    value: "faculty_mentor",
    label: "Faculty Mentor",
    icon: Users,
    description: "Faculty member mentoring student projects",
  },
  {
    value: "university_admin",
    label: "University Admin",
    icon: Building2,
    description: "Administrative representative of a university",
  },
  {
    value: "industry_partner",
    label: "Industry / Startup",
    icon: Briefcase,
    description: "Company, startup, MSME, or CSR organization",
  },
  {
    value: "govt_officer",
    label: "Government Officer",
    icon: ShieldCheck,
    description: "State / department government official",
  },
  {
    value: "citizen",
    label: "Citizen",
    icon: User,
    description: "Individual citizen or community member",
  },
];

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  role: z.string().min(1, "Please select your role"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPostLoginRouting, setIsPostLoginRouting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user, session, signIn, signUp } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const { toast } = useToast();
  const homePath = tenantPath(tenant?.slug || "", "/");

  const routeUserAfterLogin = useCallback(async (
    userId: string,
    fallbackUrl: string
  ) => {
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("tenant_id", tenant!.id);

    if (roleError) {
      console.error("Error checking user role after login:", roleError);
      navigate(fallbackUrl, { replace: true });
      return;
    }

    const roles = (roleRows || []).map((r) => String((r as any).role));

    // Route based on role
    if (roles.includes("admin") || roles.includes("platform_admin")) {
      navigate(tenantPath(tenant?.slug || "", "/admin"), { replace: true });
      return;
    }

    if (roles.includes("university_admin") || roles.includes("faculty_mentor")) {
      navigate(tenantPath(tenant?.slug || "", "/university"), { replace: true });
      return;
    }

    navigate(fallbackUrl, { replace: true });
  }, [navigate, tenant?.id, tenant?.slug]);

  // Redirect if already logged in
  useEffect(() => {
    if (!user || isPostLoginRouting) return;
    void routeUserAfterLogin(user.id, homePath);
  }, [user, isPostLoginRouting, routeUserAfterLogin, homePath]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (isLogin) {
        setIsPostLoginRouting(true);
        const result = loginSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setLoading(false);
          setIsPostLoginRouting(false);
          return;
        }

        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast({
            title: "Login Failed",
            description: error.message.includes("Invalid login credentials")
              ? "Invalid email or password. Please try again."
              : error.message,
            variant: "destructive",
          });
          setIsPostLoginRouting(false);
        } else {
          const [{ data: authUserData }, { data: sessionData }] = await Promise.all([
            supabase.auth.getUser(),
            supabase.auth.getSession(),
          ]);
          const signedInUser = authUserData.user;
          const signedInSession = sessionData.session;

          toast({ title: "Welcome back!", description: "You have successfully logged in." });

          if (!signedInUser) {
            setIsPostLoginRouting(false);
            return;
          }

          const redirectUrl = localStorage.getItem("redirectAfterLogin") || homePath;
          localStorage.removeItem("redirectAfterLogin");
          await routeUserAfterLogin(signedInUser.id, redirectUrl);
        }
      } else {
        // Sign up
        const result = signupSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        // Check if email already exists
        const { data: emailExists } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", formData.email)
          .maybeSingle();

        if (emailExists) {
          setErrors({ email: "This email is already registered. Please log in instead." });
          setLoading(false);
          return;
        }

        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.name,
          formData.role,
          tenant?.id,
        );

        if (error) {
          if (error.message.includes("already registered")) {
            setErrors({ email: "This email is already registered. Please log in instead." });
          } else {
            toast({ title: "Sign Up Failed", description: error.message, variant: "destructive" });
          }
        } else {
          toast({
            title: "Account Created!",
            description: "You can now log in with your credentials.",
          });
          setIsLogin(true);
          setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
        }
      }
    } catch (err) {
      if (isLogin) setIsPostLoginRouting(false);
      toast({ title: "Error", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 bg-highlight">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
                <span className="text-primary-foreground font-poppins font-bold text-2xl">S</span>
              </div>
              <h1 className="text-2xl font-poppins font-bold text-foreground">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {isLogin
                  ? "Sign in to the Societal Innovation Collaboration Portal"
                  : "Join the platform connecting citizens, universities & industry"}
              </p>
            </div>

            {/* Form Card */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              {/* Toggle Tabs */}
              <div className="flex rounded-lg bg-muted p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    !isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Signup-only fields */}
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Your full name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={errors.name ? "border-destructive" : ""}
                      />
                      {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                    </div>

                    {/* Role selector */}
                    <div className="space-y-2">
                      <Label>I am a...</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {ROLE_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          const isSelected = formData.role === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, role: opt.value }));
                                if (errors.role) setErrors((prev) => ({ ...prev, role: "" }));
                              }}
                              className={`flex items-start gap-2 p-3 rounded-lg border text-left transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-border hover:border-primary/50 text-foreground"
                              }`}
                            >
                              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                              <div>
                                <p className="text-xs font-semibold leading-tight">{opt.label}</p>
                                <p className="text-xs text-muted-foreground leading-tight mt-0.5">{opt.description}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
                    </div>
                  </>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={errors.password ? "border-destructive pr-10" : "pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                {/* Confirm Password (signup only) */}
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={errors.confirmPassword ? "border-destructive" : ""}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  variant="orange"
                  className="w-full"
                  disabled={loading}
                >
                  {loading
                    ? "Please wait..."
                    : isLogin
                    ? "Sign In"
                    : "Create Account"}
                </Button>
              </form>

              {/* Toggle Link */}
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setErrors({}); }}
                  className="text-primary hover:text-secondary font-medium"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>

              {/* Public submission note */}
              {!isLogin && (
                <p className="mt-3 text-center text-xs text-muted-foreground border-t border-border pt-3">
                  Want to submit a problem without an account?{" "}
                  <a
                    href={tenantPath(tenant?.slug || "", "/submit")}
                    className="text-primary hover:underline font-medium"
                  >
                    Submit anonymously →
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
