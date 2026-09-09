import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { tenantPath } from "@/utils/tenantPath";
import { useAdmin } from "@/hooks/useAdmin";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldX } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  // If set, only users whose profile role is in this list can access.
  // platform_admin and admin always bypass this check.
  allowedRoles?: string[];
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { tenant } = useTenant();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const location = useLocation();

  const [roleCheckLoading, setRoleCheckLoading] = useState(!!allowedRoles);
  const [hasAllowedRole, setHasAllowedRole] = useState(!allowedRoles);

  useEffect(() => {
    if (!allowedRoles || !user) {
      setRoleCheckLoading(false);
      setHasAllowedRole(!allowedRoles); // no restriction = allowed
      return;
    }

    const check = async () => {
      setRoleCheckLoading(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const role = String(data?.role ?? "");
        // Admins always bypass role restrictions
        const superRoles = ["admin", "platform_admin", "institution_admin"];
        setHasAllowedRole(superRoles.includes(role) || allowedRoles.includes(role));
      } finally {
        setRoleCheckLoading(false);
      }
    };

    void check();
  }, [user, allowedRoles]);

  const isLoading = loading || (requireAdmin && adminLoading) || roleCheckLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-primary-foreground font-poppins font-bold text-xl">S</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    localStorage.setItem("redirectAfterLogin", location.pathname);
    return <Navigate to={tenantPath(tenant!.slug, "/auth")} state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center bg-card rounded-lg p-8 shadow">
          <ShieldX className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h1 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">This page is only available to platform admins.</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !hasAllowedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center bg-card rounded-lg p-8 shadow">
          <ShieldX className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h1 className="text-2xl font-semibold text-foreground mb-2">Not Authorized</h1>
          <p className="text-muted-foreground">
            Problem submission is available to Citizens, Government Officers, and Industry Partners only.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            If you are a university or faculty member, please use the{" "}
            <a href={tenantPath(tenant?.slug || "", "/university")} className="text-primary underline">
              University Dashboard
            </a>{" "}
            instead.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
