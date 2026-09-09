import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeptAdmin, setIsDeptAdmin] = useState(false);
  const [isUniversityAdmin, setIsUniversityAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasAdminRoleElsewhere, setHasAdminRoleElsewhere] = useState(false);
  const { tenant } = useTenant();

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user || !tenant?.id) {
        setIsAdmin(false);
        setIsDeptAdmin(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch roles for the user in the active tenant only.
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("tenant_id", tenant.id);

        if (rolesError) throw rolesError;

        const roles = (rolesData || []).map((r: any) => String(r.role));
        const hasAdminRole = roles.includes("admin") || roles.includes("institution_admin") || roles.includes("platform_admin");
        const hasDeptAdminRole = roles.includes("deptadmin") || roles.includes("department_admin");
        const hasUniversityAdminRole = roles.includes("university_admin") || roles.includes("faculty_mentor");

        // Confirm the user's profile belongs to the active tenant.
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", user.id)
          .eq("tenant_id", tenant.id)
          .maybeSingle();

        if (profileError) throw profileError;

        const hasCurrentTenantProfile = profileData?.tenant_id === tenant.id;

        if (hasAdminRole && hasCurrentTenantProfile) {
          setIsAdmin(true);
          setIsDeptAdmin(false);
          setIsUniversityAdmin(false);
          setHasAdminRoleElsewhere(false);
        } else if (hasDeptAdminRole && hasCurrentTenantProfile) {
          setIsAdmin(false);
          setIsDeptAdmin(true);
          setIsUniversityAdmin(false);
          setHasAdminRoleElsewhere(false);
        } else if (hasUniversityAdminRole && hasCurrentTenantProfile) {
          setIsAdmin(false);
          setIsDeptAdmin(false);
          setIsUniversityAdmin(true);
          setHasAdminRoleElsewhere(false);
        } else {
          setIsAdmin(false);
          setIsDeptAdmin(false);
          setIsUniversityAdmin(false);
          const { data: otherRoles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .neq("tenant_id", tenant.id);

          setHasAdminRoleElsewhere(
            (otherRoles || []).some((r: any) =>
              ["admin", "platform_admin", "institution_admin", "deptadmin", "department_admin"].includes(String(r.role))
            )
          );
        }
      } catch (err) {
        console.error("Error checking admin role:", err);
        setIsAdmin(false);
        setIsDeptAdmin(false);
        setHasAdminRoleElsewhere(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [user, tenant?.id]);

  return { isAdmin, isDeptAdmin, isUniversityAdmin, loading, hasAdminRoleElsewhere };
}
