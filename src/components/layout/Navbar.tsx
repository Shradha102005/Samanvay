import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogIn, LogOut, User, Shield, ClipboardList, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useTenant } from "@/context/TenantContext";
import { tenantPath } from "@/utils/tenantPath";
import { NotificationBell } from "@/components/NotificationBell";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin, isUniversityAdmin } = useAdmin();
  const { tenant } = useTenant();
  const slug = tenant?.slug || "";
  const path = (value: string) => tenantPath(slug, value);

  // Roles allowed to submit problems
  const SUBMIT_ROLES = ["citizen", "govt_officer", "industry_partner", "admin", "platform_admin", "institution_admin"];
  const [canSubmit, setCanSubmit] = useState(false);

  useEffect(() => {
    if (!user) { setCanSubmit(false); return; }
    // Admins can always submit (for testing)
    if (isAdmin) { setCanSubmit(true); return; }
    // Fetch profile role
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
        .then(({ data }) => {
          setCanSubmit(SUBMIT_ROLES.includes(String(data?.role ?? "")));
        });
    });
  }, [user, isAdmin]);

  const username = user
    ? (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email?.split("@")[0] ||
      "User"
    : "";

  const navLinks = [
    { name: "Home", path: path("/") },
    { name: "Problems", path: path("/problems") },
    ...(canSubmit ? [{ name: "Submit Problem", path: path("/submit") }] : []),
    { name: "Events", path: path("/events") },
    { name: "Resources", path: path("/resources") },
    ...(isAdmin
      ? [
          { name: "Admin Dashboard", path: path("/admin") },
          { name: "Submissions Queue", path: path("/submissions") },
          { name: "Analytics", path: path("/analytics") },
          { name: "Approvals", path: path("/departments") },
        ]
      : []),
    ...(isUniversityAdmin && !isAdmin
      ? [{ name: "University Dashboard", path: path("/university") }]
      : []),
    { name: "About", path: path("/about") },
    { name: "Contact", path: path("/contact") },
  ];

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div className="container mx-auto px-4">

        {/* ================= TOP ROW ================= */}
        <div className="h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to={path("/")} className="flex items-center gap-2 shrink-0">
            <img
              src="/logo.jpeg"
              alt="Samanvay Logo"
              className="h-12 w-auto object-contain"
            />
          </Link>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3 whitespace-nowrap">
            {user ? (
              <>
                <NotificationBell />
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 rounded-full border border-border px-3 py-2"
                >
                  <Link to={path("/profile")}>
                    {isAdmin && <Shield className="w-4 h-4 text-secondary" />}
                    <User className="w-4 h-4" />
                    <span className="max-w-[140px] truncate text-sm">{username}</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </Button>
              </>
            ) : (
              <Button asChild variant="orange" size="sm">
                <Link to={path("/auth")}>
                  <LogIn className="w-4 h-4 mr-1" />
                  Login
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {/* ================= BOTTOM ROW (DESKTOP NAV) ================= */}
        <nav className="hidden md:flex h-12 items-center justify-center gap-6 bg-muted/40">

          {navLinks.map((link: any) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition ${
                location.pathname === link.path
                  ? "bg-primary text-primary-foreground"
                  : link.highlight
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* ================= MOBILE NAV ================= */}
        {isOpen && (
          <div className="md:hidden border-t py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-3 rounded-md text-sm font-medium ${
                  location.pathname === link.path
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                {link.name}
              </Link>
            ))}

            <div className="pt-4 mt-4 border-t">
              {user ? (
                <div className="px-4 space-y-3">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {isAdmin && <Shield className="w-4 h-4 text-secondary" />}
                    <User className="w-4 h-4" />
                    {username}
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={path("/profile")}>Profile</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Logout
                  </Button>
                </div>
              ) : (
                <Button
                  asChild
                  variant="orange"
                  className="mx-4"
                  onClick={() => setIsOpen(false)}
                >
                  <Link to={path("/auth")}>
                    <LogIn className="w-4 h-4 mr-1" />
                    Login / Sign Up
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
