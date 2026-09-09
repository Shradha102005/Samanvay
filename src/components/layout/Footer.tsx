import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { tenantPath } from "@/utils/tenantPath";
import { supabase } from "@/integrations/supabase/client";

const quickLinks = [
  { name: "Problem Statements", path: "/problems" },
  { name: "Events", path: "/events" },
  { name: "Resources", path: "/resources" },
  { name: "Registration", path: "/registration" },
  { name: "Contact", path: "/contact" },
];

export function Footer() {
  const { tenant } = useTenant();
  const slug = tenant?.slug || "";
  const [contactInfo, setContactInfo] = useState<{ email: string; phone: string }>({
    email: "hello.geenovate@gcet.edu.in",
    phone: "",
  });

  useEffect(() => {
    if (!tenant?.id) return;

    const fetchContactInfo = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("page_content")
          .select("*")
          .eq("page_name", "contact")
          .eq("tenant_id", tenant.id);

        if (data && !error) {
          const itemsData = data.find((d: any) => d.section_key === "general_enquiries");
          const infoData = data.find((d: any) => d.section_key === "general_info");

          let email = "";
          let phone = "";

          if (itemsData) {
            const parsed = typeof itemsData.content === "string"
              ? JSON.parse(itemsData.content)
              : itemsData.content;
            
            if (Array.isArray(parsed)) {
              const emailItem = parsed.find((item: any) => 
                item.icon === "Mail" || item.title?.toLowerCase().includes("email")
              );
              const phoneItem = parsed.find((item: any) => 
                item.icon === "Phone" || item.title?.toLowerCase().includes("phone") || item.title?.toLowerCase().includes("help")
              );

              if (emailItem) email = emailItem.description;
              if (phoneItem) phone = phoneItem.description;
            }
          } else if (infoData) {
            const parsed = typeof infoData.content === "string"
              ? JSON.parse(infoData.content)
              : infoData.content;
            if (parsed) {
              email = parsed.email || "";
              phone = parsed.phone || "";
            }
          }

          if (email || phone) {
            setContactInfo({
              email: email || "hello.geenovate@gcet.edu.in",
              phone: phone || "",
            });
          }
        }
      } catch (err) {
        console.error("Error fetching footer contact info:", err);
      }
    };

    void fetchContactInfo();
  }, [tenant?.id]);

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {/* Logo & Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img
                src="/logo.jpeg"
                alt="Samanvay Logo"
                className="h-14 w-auto object-contain"
              />
            </div>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              Build solutions for societal challenges — connecting organizations, universities &amp; industry across Jharkhand.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-poppins font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={tenantPath(slug, link.path)}
                    className="text-primary-foreground/80 hover:text-secondary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-poppins font-semibold text-lg mb-4">Contact Us</h4>
            <div className="space-y-3">
              {contactInfo.email && (
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="flex items-center gap-2 text-primary-foreground/80 hover:text-secondary transition-colors text-sm"
                >
                  <Mail className="w-4 h-4" />
                  {contactInfo.email}
                </a>
              )}
              {contactInfo.phone && (
                <a
                  href={`tel:${contactInfo.phone}`}
                  className="flex items-center gap-2 text-primary-foreground/80 hover:text-secondary transition-colors text-sm"
                >
                  <Phone className="w-4 h-4" />
                  {contactInfo.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/20">
          <p className="text-center text-primary-foreground/60 text-sm">
            © {new Date().getFullYear()} Samanvay. Jharkhand Innovation Portal. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

