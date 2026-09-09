import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, UserPlus, Download } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { tenantPath } from "@/utils/tenantPath";

export function CTASection() {
  const { tenant } = useTenant();
  const slug = tenant?.slug || "";

  return (
    <section className="py-20 lg:py-28 bg-primary relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-secondary blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-secondary blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-poppins font-bold text-primary-foreground">
            Ready to Innovate?
          </h2>
          <p className="mt-4 text-primary-foreground/80 text-lg">
            Join Samanvay and help solve real societal challenges across Jharkhand.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="orange" size="xl">
              <Link to={tenantPath(slug, "/registration")}>
                <UserPlus className="w-5 h-5" />
                Register Now
              </Link>
            </Button>
            <Button asChild size="xl" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              <Link to={tenantPath(slug, "/problems")}>
                <FileText className="w-5 h-5" />
                View Problems
              </Link>
            </Button>
            <Button asChild size="xl" className="bg-transparent border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to={tenantPath(slug, "/resources")}>
                <Download className="w-5 h-5" />
                Download Template
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

