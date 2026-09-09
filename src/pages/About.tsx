import { useEffect, useState } from "react";
import { deleteStorageFiles } from "@/utils/storageCleanup";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Save, X, Plus, Trash2, ImagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useTenant } from "@/context/TenantContext";
import { toast } from "sonner";

interface PageHeader {
  title: string;
  subtitle: string;
  teamTitle: string;
  teamSubtitle: string;
}

interface DescriptiveBox {
  id: string;
  text: string;
  fontSize: "sm" | "base" | "lg" | "xl" | "2xl";
  fontStyle: "default" | "serif" | "mono" | "italic";
  fontWeight: "normal" | "semibold" | "bold";
  textEffect: "none" | "shadow" | "highlight";
  animation: "none" | "fadeIn" | "slideUp" | "bounce";
  textColor?: string;
}

interface AboutCard {
  id: string;
  title: string;
  description: string;
  image_url?: string | null;
}

const defaultHeader: PageHeader = {
  title: "What is Samanvay?",
  subtitle:
    "Samanvay is a platform connecting organizations, universities, and industry to build solutions for societal challenges in Jharkhand.-world problems within the campus ecosystem. We believe every challenge holds the seed of transformation.",
  teamTitle: "The Team",
  teamSubtitle: "Behind Samanvay",
};

const defaultDescriptiveBoxes: DescriptiveBox[] = [
  {
    id: "box-1",
    text: "Samanvay is a platform connecting organizations, universities, and industry to build solutions for societal challenges in Jharkhand.-world problems within the campus ecosystem. We believe every challenge holds the seed of transformation.",
    fontSize: "lg",
    fontStyle: "default",
    fontWeight: "normal",
    textEffect: "none",
    animation: "fadeIn",
    textColor: "#0f172a",
  },
  {
    id: "box-2",
    text: "Through our structured 5D Framework — Discover, Define, Design, Develop, and Deliver — participants journey from problem identification to prototype creation, gaining invaluable entrepreneurial skills along the way.",
    fontSize: "lg",
    fontStyle: "default",
    fontWeight: "normal",
    textEffect: "none",
    animation: "fadeIn",
    textColor: "#0f172a",
  },
];

const defaultTeamCards: AboutCard[] = [
  {
    id: "geenovate",
    title: "Geenovate Foundation",
    description:
      "The driving force behind Samanvay, fostering innovation and entrepreneurship across GCET.",
    image_url: null,
  },
  {
    id: "patrons",
    title: "Patrons & Leadership",
    description:
      "Chairman, Director, and institutional leaders providing vision and guidance.",
    image_url: null,
  },
  {
    id: "core",
    title: "Core Organisers",
    description:
      "Head Coordinator and 5 Co-Coordinators managing event operations and participant experience.",
    image_url: null,
  },
  {
    id: "support",
    title: "Department Support Group",
    description:
      "Academic supporters from each department ensuring curriculum alignment and mentorship.",
    image_url: null,
  },
  {
    id: "partners",
    title: "Partner Clubs & Councils",
    description:
      "Innovation Council, Tech Clubs, and professional bodies collaborating for success.",
    image_url: null,
  },
  {
    id: "volunteers",
    title: "Volunteers & Sponsors",
    description:
      "Dedicated student volunteers and external sponsors making this event possible.",
    image_url: null,
  },
];

const fontStyleClasses: Record<DescriptiveBox["fontStyle"], string> = {
  default: "",
  serif: "font-serif",
  mono: "font-mono",
  italic: "italic",
};

const fontSizeClasses: Record<DescriptiveBox["fontSize"], string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
};

const fontWeightClasses: Record<DescriptiveBox["fontWeight"], string> = {
  normal: "font-normal",
  semibold: "font-semibold",
  bold: "font-bold",
};

const textEffectClasses: Record<DescriptiveBox["textEffect"], string> = {
  none: "",
  shadow: "drop-shadow-lg",
  highlight: "bg-yellow-200/30 px-2 py-1 rounded",
};

const animationClasses: Record<DescriptiveBox["animation"], string> = {
  none: "",
  fadeIn: "animate-fade-in",
  slideUp: "animate-slide-up",
  bounce: "animate-bounce",
};

export default function About() {
  const { isAdmin } = useAdmin();
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [header, setHeader] = useState<PageHeader>(defaultHeader);
  const [descriptiveBoxes, setDescriptiveBoxes] = useState<DescriptiveBox[]>(defaultDescriptiveBoxes);
  const [teamCards, setTeamCards] = useState<AboutCard[]>(defaultTeamCards);

  const [editHeader, setEditHeader] = useState<PageHeader>(defaultHeader);
  const [editDescriptiveBoxes, setEditDescriptiveBoxes] = useState<DescriptiveBox[]>(defaultDescriptiveBoxes);
  const [editTeamCards, setEditTeamCards] = useState<AboutCard[]>(defaultTeamCards);
  const [selectedCard, setSelectedCard] = useState<AboutCard | null>(null);

  useEffect(() => {
    fetchContent();
  }, [tenant?.id]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("page_content")
        .select("*")
        .eq("page_name", "about")
        .eq("tenant_id", tenant!.id);

      if (data) {
        const headerRow = data.find((row) => row.section_key === "header");
        const boxesRow = data.find((row) => row.section_key === "descriptive_boxes");
        const cardsRow = data.find((row) => row.section_key === "team_cards");

        if (headerRow) {
          const parsed = typeof headerRow.content === "string" ? JSON.parse(headerRow.content) : headerRow.content;
          setHeader(parsed);
          setEditHeader(parsed);
        }

        if (boxesRow) {
          const parsed = typeof boxesRow.content === "string" ? JSON.parse(boxesRow.content) : boxesRow.content;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDescriptiveBoxes(parsed);
            setEditDescriptiveBoxes(parsed);
          }
        }

        if (cardsRow) {
          const parsed = typeof cardsRow.content === "string" ? JSON.parse(cardsRow.content) : cardsRow.content;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTeamCards(parsed);
            setEditTeamCards(parsed);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load About page content:", error);
      toast.error("Unable to load About page content.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = [
        {
          page_name: "about",
          section_key: "header",
          content: editHeader,
          tenant_id: tenant!.id,
          updated_at: new Date().toISOString(),
        },
        {
          page_name: "about",
          section_key: "descriptive_boxes",
          content: editDescriptiveBoxes,
          tenant_id: tenant!.id,
          updated_at: new Date().toISOString(),
        },
        {
          page_name: "about",
          section_key: "team_cards",
          content: editTeamCards,
          tenant_id: tenant!.id,
          updated_at: new Date().toISOString(),
        },
      ];

      const { error } = await supabase.from("page_content").upsert(entries, {
        onConflict: "page_name,section_key,tenant_id",
      });

      if (error) throw error;

      setHeader(editHeader);
      setDescriptiveBoxes(editDescriptiveBoxes);
      setTeamCards(editTeamCards);
      setEditing(false);
      toast.success("About page content updated successfully.");
    } catch (error: any) {
      console.error("Save failed:", error);
      toast.error(error?.message || "Failed to save About page content.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditHeader(header);
    setEditDescriptiveBoxes(descriptiveBoxes);
    setEditTeamCards(teamCards);
    setEditing(false);
  };

  const updateBoxField = (boxId: string, field: keyof DescriptiveBox, value: string | number) => {
    setEditDescriptiveBoxes((current) =>
      current.map((box) => (box.id === boxId ? { ...box, [field]: value } : box))
    );
  };

  const removeBox = (boxId: string) => {
    if (editDescriptiveBoxes.length > 1) {
      setEditDescriptiveBoxes((current) => current.filter((box) => box.id !== boxId));
    } else {
      toast.error("You must keep at least one descriptive box.");
    }
  };

  const addBox = () => {
    setEditDescriptiveBoxes((current) => [
      ...current,
      {
        id: crypto.randomUUID?.() || `${Date.now()}`,
        text: "",
        fontSize: "lg",
        fontStyle: "default",
        fontWeight: "normal",
        textEffect: "none",
        animation: "fadeIn",
      },
    ]);
  };

  const addTeamCard = () => {
    setEditTeamCards((current) => [
      ...current,
      {
        id: crypto.randomUUID?.() || `${Date.now()}`,
        title: "",
        description: "",
        image_url: null,
      },
    ]);
  };

  const removeTeamCard = async (id: string) => {
    const card = editTeamCards.find((c) => c.id === id);
    // Delete the card's image from storage if present
    if (card?.image_url) {
      await deleteStorageFiles([card.image_url]);
    }
    setEditTeamCards((current) => current.filter((c) => c.id !== id));
  };

  const updateTeamCard = (id: string, field: keyof AboutCard, value: string) => {
    setEditTeamCards((current) =>
      current.map((card) => (card.id === id ? { ...card, [field]: value } : card))
    );
  };

  const uploadCardImage = async (id: string, file: File) => {
    setUploadingImage(true);
    try {
      // Delete old image from storage if exists
      const existingCard = editTeamCards.find((c) => c.id === id);
      if (existingCard?.image_url) {
        await deleteStorageFiles([existingCard.image_url]);
      }

      const sanitized = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
      const filePath = `about_cards/${sanitized}`;

      const { error: uploadError } = await supabase.storage
        .from("resources")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData, error: urlError } = supabase.storage
        .from("resources")
        .getPublicUrl(filePath);

      if (urlError) throw urlError;

      updateTeamCard(id, "image_url", urlData.publicUrl);
      toast.success("Image uploaded successfully.");
    } catch (error: any) {
      console.error("Failed to upload image:", error);
      toast.error(error?.message || "Unable to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading page...</p>
        </div>
      </Layout>
    );
  }

  

  return (
    <Layout>
      <section className="relative overflow-hidden bg-primary py-24 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.20),transparent_35%)]" />
        <div className="relative container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
              <div className="text-center">
                <span className="text-secondary font-medium text-sm uppercase tracking-wider">
                  About The Event
                </span>
                {editing ? (
                  <div className="mt-3 space-y-4">
                    <Input
                      value={editHeader.title}
                      onChange={(e) => setEditHeader({ ...editHeader, title: e.target.value })}
                      placeholder="Page heading"
                      className="bg-white text-foreground"
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="mt-3 text-3xl lg:text-5xl font-poppins font-bold text-primary-foreground">
                      {header.title}
                    </h2>
                    <div className="mt-8 space-y-6">
                      {descriptiveBoxes.map((box) => (
                        <div
                          key={box.id}
                          className={`${fontSizeClasses[box.fontSize]} ${fontStyleClasses[box.fontStyle]} ${fontWeightClasses[box.fontWeight]} ${textEffectClasses[box.textEffect]} ${animationClasses[box.animation]} leading-relaxed`}
                          style={{ color: (box as any).textColor || undefined }}
                        >
                          {box.text}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {isAdmin && (
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {editing ? (
                      <>
                        <Button onClick={handleSave} disabled={saving || uploadingImage} variant="orange" size="sm">
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

              {editing && (
                <div className="mt-10 bg-slate-50 rounded-3xl p-8 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">Descriptive Boxes</h3>
                    <Button onClick={addBox} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Box
                    </Button>
                  </div>

                  <div className="space-y-8">
                    {editDescriptiveBoxes.map((box, index) => (
                      <div key={box.id} className="p-6 bg-white rounded-2xl border-2 border-slate-200 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-foreground">Box {index + 1}</h4>
                          {editDescriptiveBoxes.length > 1 && (
                            <Button
                              onClick={() => removeBox(box.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </Button>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Box Text
                          </label>
                          <Textarea
                            value={box.text}
                            onChange={(e) => updateBoxField(box.id, "text", e.target.value)}
                            placeholder="Enter descriptive text..."
                            className="min-h-[120px]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Font Size
                            </label>
                            <select
                              value={box.fontSize}
                              onChange={(e) =>
                                updateBoxField(box.id, "fontSize", e.target.value as DescriptiveBox["fontSize"])
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                              <option value="sm">Small</option>
                              <option value="base">Base</option>
                              <option value="lg">Large</option>
                              <option value="xl">Extra Large</option>
                              <option value="2xl">2XL</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Font Weight
                            </label>
                            <select
                              value={box.fontWeight}
                              onChange={(e) =>
                                updateBoxField(box.id, "fontWeight", e.target.value as DescriptiveBox["fontWeight"])
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                              <option value="normal">Normal</option>
                              <option value="semibold">Semi Bold</option>
                              <option value="bold">Bold</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Font Style
                            </label>
                            <select
                              value={box.fontStyle}
                              onChange={(e) =>
                                updateBoxField(box.id, "fontStyle", e.target.value as DescriptiveBox["fontStyle"])
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                              <option value="default">Default</option>
                              <option value="serif">Serif</option>
                              <option value="mono">Monospace</option>
                              <option value="italic">Italic</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Text Effect
                            </label>
                            <select
                              value={box.textEffect}
                              onChange={(e) =>
                                updateBoxField(box.id, "textEffect", e.target.value as DescriptiveBox["textEffect"])
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                              <option value="none">None</option>
                              <option value="shadow">Drop Shadow</option>
                              <option value="highlight">Highlight</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Animation
                            </label>
                            <select
                              value={box.animation}
                              onChange={(e) =>
                                updateBoxField(box.id, "animation", e.target.value as DescriptiveBox["animation"])
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                              <option value="none">None</option>
                              <option value="fadeIn">Fade In</option>
                              <option value="slideUp">Slide Up</option>
                              <option value="bounce">Bounce</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Text Color</label>
                            <input
                              type="color"
                              value={box.textColor || "#0f172a"}
                              onChange={(e) => updateBoxField(box.id, "textColor", e.target.value)}
                              className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                          </div>
                        </div>

                          <div className="p-6 bg-primary rounded-lg">
                            <p className="text-xs font-medium text-primary-foreground/80 mb-2">Preview:</p>
                            <div className="p-6 rounded-md">
                              <div
                                className={`${fontSizeClasses[box.fontSize]} ${fontStyleClasses[box.fontStyle]} ${fontWeightClasses[box.fontWeight]} ${textEffectClasses[box.textEffect]} ${animationClasses[box.animation]} leading-relaxed text-center`}
                                style={{ color: box.textColor || undefined }}
                              >
                                {box.text || "Your preview will appear here..."}
                              </div>
                            </div>
                          </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            {editing ? (
              <div className="space-y-4 max-w-2xl mx-auto">
                <Input
                  value={editHeader.teamTitle}
                  onChange={(e) => setEditHeader({ ...editHeader, teamTitle: e.target.value })}
                  placeholder="Section title"
                />
                <Input
                  value={editHeader.teamSubtitle}
                  onChange={(e) => setEditHeader({ ...editHeader, teamSubtitle: e.target.value })}
                  placeholder="Section subtitle"
                />
              </div>
            ) : (
              <>
                <span className="text-secondary font-medium text-sm uppercase tracking-wider">
                  {header.teamTitle}
                </span>
                <h2 className="mt-3 text-3xl lg:text-4xl font-poppins font-bold text-foreground">
                  {header.teamSubtitle}
                </h2>
              </>
            )}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {(editing ? editTeamCards : teamCards).map((card) => (
              <Card
                key={card.id}
                onClick={() => !editing && setSelectedCard(card)}
                className={`overflow-hidden shadow-card hover:shadow-elevated transition-all ${!editing ? "cursor-pointer" : ""}`}
              >
                <CardContent className="p-6">
                  {editing ? (
                    <div className="space-y-4">
                      <div className="h-44 rounded-2xl bg-slate-100 overflow-hidden relative">
                        {card.image_url ? (
                          <img
                            src={card.image_url}
                            alt={card.title || "Team card image"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex flex-col items-center justify-center text-sm text-muted-foreground">
                            <ImagePlus className="w-8 h-8 mb-2" />
                            Upload image for about us card
                          </div>
                        )}
                      </div>
                      <Input
                        value={card.title}
                        onChange={(e) => updateTeamCard(card.id, "title", e.target.value)}
                        placeholder="Card title"
                      />
                      <Textarea
                        value={card.description}
                        onChange={(e) => updateTeamCard(card.id, "description", e.target.value)}
                        placeholder="Card description"
                        className="min-h-[100px]"
                      />
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground">Card image</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              uploadCardImage(card.id, e.target.files[0]);
                            }
                          }}
                          className="block w-full text-sm text-foreground"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeTeamCard(card.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove card
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="h-44 rounded-2xl bg-slate-100 overflow-hidden mb-5">
                        {card.image_url ? (
                          <img
                            src={card.image_url}
                            alt={card.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                            No image uploaded
                          </div>
                        )}
                      </div>
                      <h3 className="font-poppins font-semibold text-lg text-foreground">
                        {card.title}
                      </h3>
                      <p className="mt-3 text-muted-foreground text-sm">{card.description}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Card details dialog */}
          <Dialog open={!!selectedCard} onOpenChange={(open) => { if (!open) setSelectedCard(null); }}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedCard?.title}</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                {selectedCard?.image_url ? (
                  <img src={selectedCard.image_url} alt={selectedCard.title} className="w-full h-64 object-cover rounded-md mb-4" />
                ) : null}
                <p className="text-sm text-muted-foreground">{selectedCard?.description}</p>
              </div>
            </DialogContent>
          </Dialog>

          {editing && (
            <div className="flex justify-center">
              <Button onClick={addTeamCard} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add card
              </Button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
