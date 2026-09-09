import { Outlet, useParams } from "react-router-dom";
import { TenantProvider } from "@/context/TenantContext";

function TenantContent() {
  // For the Jharkhand Societal Innovation Portal, all registered users can
  // browse any tenant page. Admin-level access is enforced by ProtectedRoute.
  return <Outlet />;
}

export default function TenantLayout() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  return (
    <TenantProvider tenantSlug={tenantSlug}>
      <TenantContent />
    </TenantProvider>
  );
}
