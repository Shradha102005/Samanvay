import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Mail, Phone, MapPin, User, Edit, Save, X, Plus, Trash2, MessageCircle, Globe, Info, HelpCircle, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";
import { useTenant } from "@/context/TenantContext";

interface Coordinator {
  role: string;
  name: string;
  email: string;
  phone: string;
  description: string;
}

interface ContactHeader {
  title: string;
  subtitle: string;
  organizingTitle: string;
  enquiriesTitle: string;
  styles?: ContactHeaderStyles;
}

interface TextStyle {
  fontSize: string;
  fontType: string;
  fontWeight: string;
  color: string;
  effect: string;
}

interface ContactHeaderStyles {
  backgroundColor: string;
  title: TextStyle;
  subtitle: TextStyle;
}

interface ContactEnquiry {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export default function Contact() {
  const { isAdmin } = useAdmin();
  const { tenant } = useTenant();
  const defaultHeader: ContactHeader = {
    title: "Contact Us",
    subtitle: "Have questions about the platform? Reach out to the Samanvay coordination team for assistance.",
    organizingTitle: "Coordination Team",
    enquiriesTitle: "General Enquiries",
    styles: {
      backgroundColor: "#0b3a82",
      title: {
        fontSize: "text-5xl",
        fontType: "font-poppins",
        fontWeight: "font-bold",
        color: "#ffffff",
        effect: "none",
      },
      subtitle: {
        fontSize: "text-lg",
        fontType: "font-sans",
        fontWeight: "font-normal",
        color: "#dbeafe",
        effect: "none",
      },
    },
  };
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [header, setHeader] = useState<ContactHeader>(defaultHeader);
  const [generalEnquiries, setGeneralEnquiries] = useState<ContactEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit states
  const [editCoordinators, setEditCoordinators] = useState<Coordinator[]>([]);
  const [editHeader, setEditHeader] = useState<ContactHeader>(defaultHeader);
  const [editGeneralEnquiries, setEditGeneralEnquiries] = useState<ContactEnquiry[]>([]);

  const normalizeHeader = (content?: Partial<ContactHeader>): ContactHeader => ({
    ...defaultHeader,
    ...content,
    styles: {
      ...defaultHeader.styles!,
      ...(content?.styles ?? {}),
      title: {
        ...defaultHeader.styles!.title,
        ...(content?.styles?.title ?? {}),
      },
      subtitle: {
        ...defaultHeader.styles!.subtitle,
        ...(content?.styles?.subtitle ?? {}),
      },
    },
  });

  const fontSizeOptions = {
    title: [
      { value: "text-3xl", label: "Small" },
      { value: "text-4xl", label: "Medium" },
      { value: "text-5xl", label: "Large" },
      { value: "text-6xl", label: "Hero" },
    ],
    subtitle: [
      { value: "text-base", label: "Small" },
      { value: "text-lg", label: "Medium" },
      { value: "text-xl", label: "Large" },
      { value: "text-2xl", label: "Hero" },
    ],
  };

  const fontTypeOptions = [
    { value: "font-sans", label: "Sans" },
    { value: "font-poppins", label: "Poppins" },
    { value: "font-serif", label: "Serif" },
    { value: "font-mono", label: "Mono" },
  ];

  const fontWeightOptions = [
    { value: "font-normal", label: "Regular" },
    { value: "font-medium", label: "Medium" },
    { value: "font-semibold", label: "Semibold" },
    { value: "font-bold", label: "Bold" },
  ];

  const effectOptions = [
    { value: "none", label: "None" },
    { value: "uppercase", label: "Uppercase" },
    { value: "tracking-wide", label: "Wide" },
    { value: "drop-shadow-lg", label: "Shadow" },
  ];

  useEffect(() => {
    fetchContent();
  }, [tenant?.id]);

  const fetchContent = async () => {
    setLoading(true);
    
    const { data } = await (supabase as any)
      .from("page_content")
      .select("*")
      .eq("page_name", "contact")
      .eq("tenant_id", tenant!.id);

    if (data) {
      const coordData = data.find((d) => d.section_key === "coordinators");
      const headerData = data.find((d) => d.section_key === "contact_header");
      const itemsData = data.find((d) => d.section_key === "general_enquiries");
      const infoData = data.find((d) => d.section_key === "general_info");

      if (coordData) {
        const parsed = typeof coordData.content === "string"
          ? JSON.parse(coordData.content)
          : coordData.content;
        setCoordinators(parsed);
        setEditCoordinators(parsed);
      }

      if (headerData) {
        const parsed = typeof headerData.content === "string"
          ? JSON.parse(headerData.content)
          : headerData.content;
        const normalizedHeader = normalizeHeader(parsed);
        setHeader(normalizedHeader);
        setEditHeader(normalizedHeader);
      }

      if (itemsData) {
        const parsed = typeof itemsData.content === "string"
          ? JSON.parse(itemsData.content)
          : itemsData.content;
        const enquiries: ContactEnquiry[] = Array.isArray(parsed)
          ? parsed.map((item: any) => ({
              id: item.id || crypto.randomUUID(),
              icon: item.icon || "Mail",
              title: item.title || "",
              description: item.description || "",
            }))
          : [];
        setGeneralEnquiries(enquiries);
        setEditGeneralEnquiries(enquiries);
      } else if (infoData) {
        const parsed = typeof infoData.content === "string"
          ? JSON.parse(infoData.content)
          : infoData.content;
        const fallbackEnquiries: ContactEnquiry[] = [
          { id: crypto.randomUUID(), icon: "Mail", title: "Email", description: parsed.email || "" },
          { id: crypto.randomUUID(), icon: "Phone", title: "Helpline", description: parsed.phone || "" },
          { id: crypto.randomUUID(), icon: "MapPin", title: "Address", description: parsed.address || "" },
        ];
        setGeneralEnquiries(fallbackEnquiries);
        setEditGeneralEnquiries(fallbackEnquiries);
      }
    }
    
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
const entries = [
  {
    page_name: "contact",
    section_key: "coordinators",
    content: editCoordinators as any,
    tenant_id: tenant!.id,
    updated_at: new Date().toISOString(),
  },
  {
    page_name: "contact",
    section_key: "contact_header",
    content: editHeader as any,
    tenant_id: tenant!.id,
    updated_at: new Date().toISOString(),
  },
  {
    page_name: "contact",
    section_key: "general_enquiries",
    content: editGeneralEnquiries as any,
    tenant_id: tenant!.id,
    updated_at: new Date().toISOString(),
  },
];

const { error } = await supabase.from("page_content").upsert(entries, {
  onConflict: "page_name,section_key,tenant_id",
});

if (error) throw error;

      setCoordinators(editCoordinators);
      setHeader(editHeader);
      setGeneralEnquiries(editGeneralEnquiries);
      setEditing(false);
      toast.success("Content saved successfully");
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditCoordinators(coordinators);
    setEditHeader(header);
    setEditGeneralEnquiries(generalEnquiries);
    setEditing(false);
  };

  const updateCoordinator = (index: number, field: keyof Coordinator, value: string) => {
    const updated = [...editCoordinators];
    updated[index] = { ...updated[index], [field]: value };
    setEditCoordinators(updated);
  };

  const addCoordinator = () => {
    setEditCoordinators([
      ...editCoordinators,
      { role: "", name: "", email: "", phone: "", description: "" },
    ]);
  };

  const removeCoordinator = (index: number) => {
    setEditCoordinators(editCoordinators.filter((_, idx) => idx !== index));
  };

  const updateEnquiry = (index: number, field: keyof ContactEnquiry, value: string) => {
    const updated = [...editGeneralEnquiries];
    updated[index] = { ...updated[index], [field]: value };
    setEditGeneralEnquiries(updated);
  };

  const addEnquiry = () => {
    setEditGeneralEnquiries([
      ...editGeneralEnquiries,
      { id: crypto.randomUUID(), icon: "Mail", title: "", description: "" },
    ]);
  };

  const removeEnquiry = (index: number) => {
    setEditGeneralEnquiries(editGeneralEnquiries.filter((_, idx) => idx !== index));
  };

  const updateHeaderTextStyle = (
    target: "title" | "subtitle",
    field: keyof TextStyle,
    value: string
  ) => {
    setEditHeader((current) => ({
      ...current,
      styles: {
        ...normalizeHeader(current).styles!,
        [target]: {
          ...normalizeHeader(current).styles![target],
          [field]: value,
        },
      },
    }));
  };

  const renderSelect = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { value: string; label: string }[]
  ) => (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );

  const renderColorInput = (
    label: string,
    value: string,
    onChange: (value: string) => void
  ) => (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <Input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 bg-background p-1"
      />
    </label>
  );

  const enquiryIconOptions = ["Mail", "Phone", "MapPin", "MessageCircle", "Globe", "Info", "HelpCircle", "AtSign"];

  const getIconComponent = (icon: string) => {
    switch (icon) {
      case "Phone":
        return Phone;
      case "MapPin":
        return MapPin;
      case "MessageCircle":
        return MessageCircle;
      case "Globe":
        return Globe;
      case "Info":
        return Info;
      case "HelpCircle":
        return HelpCircle;
      case "AtSign":
        return AtSign;
      case "Mail":
      default:
        return Mail;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  const displayCoordinators = editing ? editCoordinators : coordinators;
  const displayEnquiries = editing ? editGeneralEnquiries : generalEnquiries;
  const displayHeader = normalizeHeader(editing ? editHeader : header);
  const editHeaderWithDefaults = normalizeHeader(editHeader);

  return (
    <Layout>
      {/* Header */}
      <section
        className="py-16 lg:py-24"
        style={{ backgroundColor: displayHeader.styles?.backgroundColor }}
      >
        <div className="container mx-auto px-4 text-center">
          {editing ? (
            <div className="mx-auto max-w-3xl space-y-4">
              <Input
                value={editHeader.title}
                onChange={(e) => setEditHeader({ ...editHeader, title: e.target.value })}
                placeholder="Page title"
                className="bg-white text-foreground"
              />
              <Textarea
                value={editHeader.subtitle}
                onChange={(e) => setEditHeader({ ...editHeader, subtitle: e.target.value })}
                placeholder="Page subtitle"
                rows={3}
                className="bg-white text-foreground"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  value={editHeader.organizingTitle}
                  onChange={(e) => setEditHeader({ ...editHeader, organizingTitle: e.target.value })}
                  placeholder="Organizing team title"
                  className="bg-white text-foreground"
                />
                <Input
                  value={editHeader.enquiriesTitle}
                  onChange={(e) => setEditHeader({ ...editHeader, enquiriesTitle: e.target.value })}
                  placeholder="General enquiries title"
                  className="bg-white text-foreground"
                />
              </div>
              <div className="rounded-lg border border-white/20 bg-white p-4 text-left shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Header Style</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderColorInput("Title Color", editHeaderWithDefaults.styles!.title.color, (value) =>
                    updateHeaderTextStyle("title", "color", value)
                  )}
                  {renderColorInput("Subtitle Color", editHeaderWithDefaults.styles!.subtitle.color, (value) =>
                    updateHeaderTextStyle("subtitle", "color", value)
                  )}
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  {renderSelect("Title Size", editHeaderWithDefaults.styles!.title.fontSize, (value) =>
                    updateHeaderTextStyle("title", "fontSize", value), fontSizeOptions.title)}
                  {renderSelect("Title Type", editHeaderWithDefaults.styles!.title.fontType, (value) =>
                    updateHeaderTextStyle("title", "fontType", value), fontTypeOptions)}
                  {renderSelect("Title Weight", editHeaderWithDefaults.styles!.title.fontWeight, (value) =>
                    updateHeaderTextStyle("title", "fontWeight", value), fontWeightOptions)}
                  {renderSelect("Title Effect", editHeaderWithDefaults.styles!.title.effect, (value) =>
                    updateHeaderTextStyle("title", "effect", value), effectOptions)}
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  {renderSelect("Subtitle Size", editHeaderWithDefaults.styles!.subtitle.fontSize, (value) =>
                    updateHeaderTextStyle("subtitle", "fontSize", value), fontSizeOptions.subtitle)}
                  {renderSelect("Subtitle Type", editHeaderWithDefaults.styles!.subtitle.fontType, (value) =>
                    updateHeaderTextStyle("subtitle", "fontType", value), fontTypeOptions)}
                  {renderSelect("Subtitle Weight", editHeaderWithDefaults.styles!.subtitle.fontWeight, (value) =>
                    updateHeaderTextStyle("subtitle", "fontWeight", value), fontWeightOptions)}
                  {renderSelect("Subtitle Effect", editHeaderWithDefaults.styles!.subtitle.effect, (value) =>
                    updateHeaderTextStyle("subtitle", "effect", value), effectOptions)}
                </div>
              </div>
            </div>
          ) : (
            <>
              <h1
                className={`${displayHeader.styles!.title.fontSize} ${displayHeader.styles!.title.fontType} ${displayHeader.styles!.title.fontWeight} ${displayHeader.styles!.title.effect} leading-tight`}
                style={{ color: displayHeader.styles!.title.color }}
              >
                {displayHeader.title}
              </h1>
              <p
                className={`mt-4 max-w-2xl mx-auto ${displayHeader.styles!.subtitle.fontSize} ${displayHeader.styles!.subtitle.fontType} ${displayHeader.styles!.subtitle.fontWeight} ${displayHeader.styles!.subtitle.effect}`}
                style={{ color: displayHeader.styles!.subtitle.color }}
              >
                {displayHeader.subtitle}
              </p>
            </>
          )}

          {isAdmin && (
            <div className="mt-6 flex justify-center gap-2">
              {editing ? (
                <>
                  <Button onClick={handleSave} disabled={saving} variant="orange" size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button onClick={handleCancel} variant="orange" size="sm">
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)} variant="orange" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Content
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Coordinators Grid */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-4 items-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-poppins font-bold text-foreground">
              {displayHeader.organizingTitle}
            </h2>
            {editing && (
              <Button onClick={addCoordinator} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Organizer
              </Button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {displayCoordinators.map((coordinator, index) => (
              <div
                key={coordinator.email + index}
                className="bg-card rounded-xl p-6 shadow-card hover:shadow-elevated transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    {editing ? (
                      <div className="space-y-3">
                        <Input
                          value={coordinator.role}
                          onChange={(e) => updateCoordinator(index, "role", e.target.value)}
                          placeholder="Role"
                          className="text-sm"
                        />
                        <Input
                          value={coordinator.name}
                          onChange={(e) => updateCoordinator(index, "name", e.target.value)}
                          placeholder="Name"
                        />
                        <Input
                          value={coordinator.email}
                          onChange={(e) => updateCoordinator(index, "email", e.target.value)}
                          placeholder="Email"
                          type="email"
                        />
                        <Input
                          value={coordinator.phone}
                          onChange={(e) => updateCoordinator(index, "phone", e.target.value)}
                          placeholder="Phone"
                        />
                        <Textarea
                          value={coordinator.description}
                          onChange={(e) => updateCoordinator(index, "description", e.target.value)}
                          placeholder="Add 1-2 lines of description"
                          rows={3}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeCoordinator(index)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Organizer
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-secondary text-sm font-medium">
                          {coordinator.role}
                        </span>
                        <h3 className="font-poppins font-semibold text-lg text-foreground mt-1">
                          {coordinator.name}
                        </h3>
                        <p className="mt-3 text-muted-foreground text-sm">
                          {coordinator.description}
                        </p>
                        <div className="mt-4 space-y-2">
                          <a
                            href={`mailto:${coordinator.email}`}
                            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
                          >
                            <Mail className="w-4 h-4" />
                            {coordinator.email}
                          </a>
                          <a
                            href={`tel:${coordinator.phone}`}
                            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
                          >
                            <Phone className="w-4 h-4" />
                            {coordinator.phone}
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* General Contact */}
      <section className="py-16 lg:py-24 bg-muted">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-card rounded-2xl shadow-card p-8 lg:p-12 space-y-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-2xl font-poppins font-bold text-foreground">
                  {displayHeader.enquiriesTitle}
                </h2>
                {editing && (
                  <Button onClick={addEnquiry} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Query
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                {displayEnquiries.map((item, index) => {
                  const Icon = getIconComponent(item.icon);
                  return (
                    <div key={item.id} className="rounded-2xl border border-border bg-background p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            {editing ? (
                              <div className="space-y-3">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <label className="block text-sm font-medium text-foreground">
                                    Icon
                                    <select
                                      className="mt-2 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                                      value={item.icon}
                                      onChange={(e) => updateEnquiry(index, "icon", e.target.value)}
                                    >
                                      {enquiryIconOptions.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <Input
                                    value={item.title}
                                    onChange={(e) => updateEnquiry(index, "title", e.target.value)}
                                    placeholder="Query title"
                                  />
                                </div>
                                <Textarea
                                  value={item.description}
                                  onChange={(e) => updateEnquiry(index, "description", e.target.value)}
                                  placeholder="Description or details"
                                  rows={3}
                                />
                              </div>
                            ) : (
                              <>
                                <h4 className="text-lg font-semibold text-foreground">
                                  {item.title}
                                </h4>
                                <p className="mt-2 text-muted-foreground">
                                  {item.description}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                        {editing && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeEnquiry(index)}
                            className="self-start"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
