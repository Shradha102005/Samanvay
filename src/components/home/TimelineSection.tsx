import { useEffect, useState } from "react";
import { deleteStorageFiles } from "@/utils/storageCleanup";
import { useAdmin } from "@/hooks/useAdmin";
import { useTenant } from "@/context/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Award,
  BookOpen,
  Briefcase,
  Check,
  Code,
  Compass,
  Edit,
  Flag,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  Map,
  MapPin,
  Milestone,
  PenTool,
  Play,
  Plus,
  Presentation,
  Rocket,
  Save,
  Search,
  Settings,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TimelineCard {
  id: string;
  name: string;
  title: string;
  description: string;
  icon_url?: string | null;
  image_urls?: string[];
  icon_name?: string | null;
}

interface TimelineHeader {
  label: string;
  title: string;
  subtitle: string;
  photo_url?: string | null;
  photo_urls?: string[];
}

const iconLibrary: Record<string, React.ElementType> = {
  Target, Users, Rocket, Check, Award, Lightbulb, Search, Code, PenTool, 
  Presentation, Flag, Compass, Layers, Milestone, Zap, BookOpen, 
  Briefcase, Map, MapPin, Play, TrendingUp, Settings
};

const fallbackIcons = [Target, Users, Rocket, Check, Award];

const defaultTimelineHeader: TimelineHeader = {
  label: "Platform Journey",
  title: "How It Works",
  subtitle: "A transparent end-to-end innovation lifecycle — from community-identified challenges to real-world deployed solutions.",
  photo_url: null,
  photo_urls: [],
};

const defaultTimelineCards: TimelineCard[] = [
  {
    id: "phase-1",
    name: "Step 1",
    title: "Challenge Submission",
    description: "Citizens, Panchayats, ULBs, NGOs, and government departments submit local societal challenges with multimedia evidence, location data, and supporting documents through the portal.",
    image_urls: [],
  },
  {
    id: "phase-2",
    name: "Step 2",
    title: "AI Categorisation & Validation",
    description: "The platform automatically categorises submitted challenges by thematic domain — education, healthcare, agriculture, water, sanitation, environment — prioritises them, and removes duplicates.",
    image_urls: [],
  },
  {
    id: "phase-3",
    name: "Step 3",
    title: "University Routing & Evaluation",
    description: "Validated challenges are routed to appropriate Higher Education Institutions based on academic disciplines, research expertise, and faculty specialisation. Universities form multidisciplinary teams and prepare solution proposals.",
    image_urls: [],
  },
  {
    id: "phase-4",
    name: "Step 4",
    title: "Industry Collaboration",
    description: "Industries, startups, MSMEs, CSR organisations, and research labs collaborate with university teams for mentorship, co-development, funding, prototyping, and pilot implementation.",
    image_urls: [],
  },
  {
    id: "phase-5",
    name: "Step 5",
    title: "Deployment & Impact Tracking",
    description: "Solutions are tested, validated, and deployed in the community. Government dashboards track outcomes including challenge resolution rates, patents generated, startups created, and measurable social impact across districts.",
    image_urls: [],
  },
];

export function TimelineSection() {
  const { isAdmin } = useAdmin();
  const { tenant } = useTenant();
  const [cards, setCards] = useState<TimelineCard[]>(defaultTimelineCards);
  const [editCards, setEditCards] = useState<TimelineCard[]>(defaultTimelineCards);
  const [header, setHeader] = useState<TimelineHeader>(defaultTimelineHeader);
  const [editHeader, setEditHeader] = useState<TimelineHeader>(defaultTimelineHeader);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIconId, setUploadingIconId] = useState<string | null>(null);
  const [uploadingCardPhotosId, setUploadingCardPhotosId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const [{ data: cardData, error: cardError }, { data: headerData, error: headerError }] =
          await Promise.all([
            supabase
              .from("page_content")
              .select("*")
              .eq("page_name", "home")
              .eq("section_key", "timeline_cards")
              .eq("tenant_id", tenant!.id)
              .maybeSingle(),
            supabase
              .from("page_content")
              .select("*")
              .eq("page_name", "home")
              .eq("section_key", "timeline_header")
              .eq("tenant_id", tenant!.id)
              .maybeSingle(),
          ]);

        if (!cardError && cardData?.content) {
          const parsed = typeof cardData.content === "string" ? JSON.parse(cardData.content) : cardData.content;
          const normalized = (parsed as TimelineCard[]).map((card) => ({
            ...card,
            image_urls: card.image_urls ?? [],
          }));
          setCards(normalized);
          setEditCards(normalized);
        } else {
          setCards(defaultTimelineCards);
          setEditCards(defaultTimelineCards);
        }

        if (!headerError && headerData?.content) {
          const parsed = typeof headerData.content === "string" ? JSON.parse(headerData.content) : headerData.content;
          const normalized = {
            ...defaultTimelineHeader,
            ...parsed,
            photo_urls: (parsed as any).photo_urls
              ? [...(parsed as any).photo_urls]
              : (parsed as any).photo_url
              ? [(parsed as any).photo_url]
              : [],
          };
          setHeader(normalized);
          setEditHeader(normalized);
        } else {
          setHeader(defaultTimelineHeader);
          setEditHeader(defaultTimelineHeader);
        }
      } catch (error) {
        console.error("Failed to load timeline content:", error);
        setCards(defaultTimelineCards);
        setEditCards(defaultTimelineCards);
        setHeader(defaultTimelineHeader);
        setEditHeader(defaultTimelineHeader);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [tenant?.id]);

  const saveCards = async () => {
    setSaving(true);
    try {
      const cardEntry = {
        page_name: "home",
        section_key: "timeline_cards",
        content: editCards,
        tenant_id: tenant!.id,
        updated_at: new Date().toISOString(),
      };

      const headerEntry = {
        page_name: "home",
        section_key: "timeline_header",
        content: editHeader,
        tenant_id: tenant!.id,
        updated_at: new Date().toISOString(),
      };

      const { error: cardsError } = await supabase.from("page_content").upsert([cardEntry], {
        onConflict: "page_name,section_key,tenant_id",
      });
      if (cardsError) throw cardsError;

      const { error: headerError } = await supabase.from("page_content").upsert([headerEntry], {
        onConflict: "page_name,section_key,tenant_id",
      });
      if (headerError) throw headerError;

      setCards(editCards);
      setHeader(editHeader);
      setEditing(false);
      toast.success("Home timeline updated.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save home timeline.");
    } finally {
      setSaving(false);
    }
  };

  const updateCard = (id: string, field: keyof TimelineCard, value: string) => {
    setEditCards((current) =>
      current.map((card) => (card.id === id ? { ...card, [field]: value } : card))
    );
  };

  const addCard = () => {
    setEditCards((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: `Phase ${current.length}`,
        title: "New Phase",
        description: "Describe the next step in the journey.",
        icon_url: null,
        image_urls: [],
        icon_name: null,
      },
    ]);
  };

  const removeCard = async (id: string) => {
    const card = editCards.find((c) => c.id === id);
    if (card) {
      // Delete card icon from storage
      if (card.icon_url) {
        await deleteStorageFiles([card.icon_url]);
      }
      // Delete card photos from storage
      if (card.image_urls?.length) {
        await deleteStorageFiles(card.image_urls);
      }
    }
    setEditCards((current) => current.filter((c) => c.id !== id));
  };

  const uploadIcon = async (id: string, file: File) => {
    setUploadingIconId(id);
    try {
      const sanitized = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
      const filePath = `home_timeline_icons/${sanitized}`;

      const { error: uploadError } = await supabase.storage
        .from("resources")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData, error: urlError } = supabase.storage
        .from("resources")
        .getPublicUrl(filePath);

      if (urlError) throw urlError;

      updateCard(id, "icon_url", urlData.publicUrl);
      toast.success("Icon uploaded successfully.");
    } catch (error: any) {
      console.error("Failed to upload icon:", error);
      toast.error(error?.message || "Unable to upload icon.");
    } finally {
      setUploadingIconId(null);
    }
  };

  const uploadCardPhotos = async (id: string, files: FileList) => {
    setUploadingCardPhotosId(id);
    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        const sanitized = `${Date.now()}_${index}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
        const filePath = `home_timeline_images/${sanitized}`;

        const { error: uploadError } = await supabase.storage
          .from("resources")
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData, error: urlError } = supabase.storage
          .from("resources")
          .getPublicUrl(filePath);

        if (urlError) throw urlError;

        return urlData.publicUrl;
      });

      const urls = await Promise.all(uploadPromises);

      setEditCards((current) =>
        current.map((card) =>
          card.id === id
            ? {
                ...card,
                image_urls: [...(card.image_urls ?? []), ...urls],
              }
            : card
        )
      );

      toast.success("Photos uploaded successfully.");
    } catch (error: any) {
      console.error("Failed to upload photos:", error);
      toast.error(error?.message || "Unable to upload photos.");
    } finally {
      setUploadingCardPhotosId(null);
    }
  };

  const removeCardPhoto = async (cardId: string, photoUrl: string) => {
    const ok = await deleteStorageFiles([photoUrl]);
    if (!ok) toast.error("Photo could not be deleted from storage.");

    setEditCards((current) =>
      current.map((card) =>
        card.id === cardId
          ? {
              ...card,
              image_urls: (card.image_urls ?? []).filter((url) => url !== photoUrl),
            }
          : card
      )
    );
  };

  const removeCardPhotos = async (cardId: string) => {
    const card = editCards.find((currentCard) => currentCard.id === cardId);
    const photoUrls = card?.image_urls ?? [];
    if (!photoUrls.length) return;

    const ok = await deleteStorageFiles(photoUrls);
    if (!ok) toast.error("Some photos could not be deleted from storage.");

    setEditCards((current) =>
      current.map((currentCard) =>
        currentCard.id === cardId ? { ...currentCard, image_urls: [] } : currentCard
      )
    );
  };

  const uploadHeaderPhoto = async (files: FileList) => {
    setUploadingPhoto(true);
    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        const sanitized = `${Date.now()}_${index}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
        const filePath = `home_timeline_header/${sanitized}`;

        const { error: uploadError } = await supabase.storage
          .from("resources")
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData, error: urlError } = supabase.storage
          .from("resources")
          .getPublicUrl(filePath);

        if (urlError) throw urlError;

        return urlData.publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      setEditHeader((current) => ({
        ...current,
        photo_urls: [...(current.photo_urls ?? []), ...urls],
      }));
      toast.success("Header photos uploaded successfully.");
    } catch (error: any) {
      console.error("Failed to upload header photos:", error);
      toast.error(error?.message || "Unable to upload header photos.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeHeaderPhoto = async () => {
    // Permanently delete header photos from Supabase storage
    const ok = await deleteStorageFiles(editHeader.photo_urls ?? []);
    if (!ok) toast.error("Some header photos could not be deleted from storage.");
    setEditHeader((current) => ({ ...current, photo_urls: [] }));
  };

  const displayedCards = editing ? editCards : cards;

  return (
    <section className="py-20 lg:py-28 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-secondary font-medium text-sm uppercase tracking-wider">
            {editing ? (
              <Input
                value={editHeader.label}
                onChange={(e) => setEditHeader({ ...editHeader, label: e.target.value })}
                className="mx-auto max-w-2xl text-center uppercase tracking-wider"
              />
            ) : (
              header.label
            )}
          </span>
          {editing ? (
            <div className="space-y-4">
              <Input
                value={editHeader.title}
                onChange={(e) => setEditHeader({ ...editHeader, title: e.target.value })}
                className="mx-auto max-w-2xl text-center"
              />
              <Textarea
                value={editHeader.subtitle}
                onChange={(e) => setEditHeader({ ...editHeader, subtitle: e.target.value })}
                className="mx-auto max-w-2xl text-center min-h-[100px]"
                placeholder="Optional subtitle"
              />
              <div className="flex flex-col items-center gap-3">
                {editHeader.photo_urls?.length ? (
                  <div className="w-full flex flex-col items-center gap-4 py-2">
                    {editHeader.photo_urls.map((url, index) => (
                      <img
                        key={`${url}-${index}`}
                        src={url}
                        alt={`Timeline header photo ${index + 1}`}
                        className="max-w-full h-auto object-contain rounded-lg shadow-sm"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="w-full max-w-3xl bg-slate-100 border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground px-4 py-8">
                    No photo uploaded
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm hover:bg-slate-100">
                    <Upload className="w-4 h-4" />
                    {uploadingPhoto ? "Uploading..." : "Upload center photos"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) uploadHeaderPhoto(e.target.files);
                      }}
                    />
                  </label>
                  {editHeader.photo_urls?.length ? (
                    <Button variant="outline" size="sm" onClick={removeHeaderPhoto}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove photos
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <>
              <h2 className="mt-3 text-3xl lg:text-4xl font-poppins font-bold text-foreground">
                {header.title}
              </h2>
              {header.subtitle && (
                <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                  {header.subtitle}
                </p>
              )}
              {header.photo_urls?.length ? (
                <div className="mt-8 flex flex-col items-center gap-4">
                  {header.photo_urls.map((url, index) => (
                    <img
                      key={`${url}-${index}`}
                      src={url}
                      alt={`Timeline header photo ${index + 1}`}
                      className="max-w-full h-auto object-contain transition-transform duration-300 hover:scale-[1.01]"
                    />
                  ))}
                </div>
              ) : null}
            </>
          )}

          {isAdmin && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {editing ? (
                <>
                  <Button onClick={saveCards} disabled={saving} variant="orange" size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Journey"}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditing(false);
                      setEditCards(cards);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)} variant="orange" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Journey Cards
                </Button>
              )}
            </div>
          )}
        </div>

        {editing && (
          <div className="mb-12 space-y-6">
            {editCards.map((card, index) => {
              const Icon = card.icon_name && iconLibrary[card.icon_name]
                ? iconLibrary[card.icon_name]
                : fallbackIcons[index % fallbackIcons.length];
              return (
                <Card key={card.id} className="border border-border bg-card shadow-card">
                  <CardContent className="space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          {card.icon_url ? (
                            <img
                              src={card.icon_url}
                              alt={card.title}
                              className="w-10 h-10 object-contain"
                            />
                          ) : (
                            <Icon className="w-8 h-8 text-primary" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <Input
                            value={card.name}
                            onChange={(e) => updateCard(card.id, "name", e.target.value)}
                            placeholder="Phase label"
                          />
                          <Input
                            value={card.title}
                            onChange={(e) => updateCard(card.id, "title", e.target.value)}
                            placeholder="Card title"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="bg-background">
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Change Icon
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-4 z-50 bg-background border border-border rounded-lg shadow-lg">
                              <div className="mb-3 text-sm font-medium text-foreground">Select an icon</div>
                              <div className="grid grid-cols-6 gap-2">
                                {Object.entries(iconLibrary).map(([name, IconComponent]) => (
                                  <button
                                    key={name}
                                    className={`p-2 flex items-center justify-center rounded-md border transition-colors ${card.icon_name === name ? 'border-primary bg-primary/10 text-primary' : 'border-transparent text-muted-foreground hover:bg-slate-100'}`}
                                    onClick={() => {
                                      setEditCards((current) =>
                                        current.map((c) =>
                                          c.id === card.id ? { ...c, icon_name: name, icon_url: null } : c
                                        )
                                      );
                                    }}
                                    title={name}
                                  >
                                    <IconComponent className="w-5 h-5" />
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <label className="cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm hover:bg-slate-100">
                            <Upload className="w-4 h-4 inline-block mr-2" />
                            {uploadingCardPhotosId === card.id ? "Uploading..." : "Upload Photos"}
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.length) {
                                  uploadCardPhotos(card.id, e.target.files);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => removeCard(card.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={card.description}
                      onChange={(e) => updateCard(card.id, "description", e.target.value)}
                      placeholder="Card description"
                      className="min-h-[120px]"
                    />
                    {card.image_urls?.length ? (
                      <div className="space-y-6 pt-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm font-medium text-muted-foreground">Uploaded photos</div>
                          <Button variant="outline" size="sm" onClick={() => removeCardPhotos(card.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove Photos
                          </Button>
                        </div>
                        <div className="flex flex-col items-center gap-8">
                          {card.image_urls.map((url, idx) => (
                            <div key={`${url}-${idx}`} className="relative w-full flex justify-center rounded-lg border border-border bg-slate-50 p-3">
                              <img
                                src={url}
                                alt={`${card.title} photo ${idx + 1}`}
                                className="mx-auto block"
                                style={{ width: "auto", maxWidth: "100%", height: "auto" }}
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeCardPhoto(card.id, url)}
                                className="absolute right-3 top-3"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
            <div className="flex justify-center">
              <Button onClick={addCard} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Journey Card
              </Button>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute left-6 lg:left-1/2 top-0 bottom-0 w-0.5 bg-border lg:-translate-x-1/2" />

            {displayedCards.map((phase, index) => {
              const isEven = index % 2 === 0;
              const Icon = phase.icon_name && iconLibrary[phase.icon_name]
                ? iconLibrary[phase.icon_name]
                : fallbackIcons[index % fallbackIcons.length];

              return (
                <div
                  key={phase.id}
                  className={`relative flex items-center gap-6 mb-8 lg:mb-12 ${
                    isEven ? "lg:flex-row" : "lg:flex-row-reverse"
                  }`}
                >
                  <div className="absolute left-6 lg:left-1/2 lg:-translate-x-1/2 w-12 h-12 rounded-full bg-primary flex items-center justify-center z-10">
                    {phase.icon_url ? (
                      <img src={phase.icon_url} alt={phase.title} className="w-6 h-6 object-contain" />
                    ) : (
                      <Icon className="w-5 h-5 text-primary-foreground" />
                    )}
                  </div>

                  <div
                    className={`ml-20 lg:ml-0 lg:w-[calc(50%-3rem)] ${
                      isEven ? "lg:mr-auto lg:pr-8" : "lg:ml-auto lg:pl-8"
                    }`}
                  >
                    <div className="bg-card rounded-xl p-6 shadow-card hover:shadow-elevated transition-shadow">
                      <span className="text-secondary font-medium text-sm">{phase.name}</span>
                      <h3 className="mt-1 font-poppins font-semibold text-xl text-foreground">
                        {phase.title}
                      </h3>
                      <p className="mt-2 text-muted-foreground text-sm">{phase.description}</p>
                      {phase.image_urls?.length ? (
                        <div className="mt-6 flex flex-col items-center gap-8">
                          {phase.image_urls.map((url, idx) => (
                            <div key={`${url}-${idx}`} className="w-full flex justify-center">
                              <img
                                src={url}
                                alt={`${phase.title} photo ${idx + 1}`}
                                className="mx-auto block"
                                style={{ width: "auto", maxWidth: "100%", height: "auto" }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
