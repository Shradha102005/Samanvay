import { Link } from "react-router-dom";
import { deleteStorageFiles } from "@/utils/storageCleanup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, FileText, Edit, Save, X, Plus, Trash2, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { useTenant } from "@/context/TenantContext";
import { tenantPath } from "@/utils/tenantPath";

import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HeroContent {
  chipText: string;
  title: string;
  subtitle: string;
  frontImage: string;
  backImage: string;
  sliderImages: string[];
  heroStyles?: {
    title?: {
      fontSize?: "text-4xl" | "text-5xl" | "text-6xl" | "text-7xl";
      fontStyle?: "default" | "serif" | "mono" | "italic";
      fontWeight?: "normal" | "semibold" | "bold";
      textEffect?: "none" | "shadow" | "highlight";
      animation?: "none" | "fadeIn" | "slideUp" | "bounce";
      textColor?: string;
    };
    subtitle?: {
      fontSize?: "text-base" | "text-lg" | "text-xl" | "text-2xl";
      fontStyle?: "default" | "serif" | "mono" | "italic";
      fontWeight?: "normal" | "semibold" | "bold";
      textEffect?: "none" | "shadow" | "highlight";
      animation?: "none" | "fadeIn" | "slideUp" | "bounce";
      textColor?: string;
    };
  };
}

const defaultHeroContent: HeroContent = {
  chipText: "Jharkhand's Societal Innovation Portal",
  title: "Samanvay",
  subtitle: "Connecting Citizens, Universities & Industry to Solve Real Societal Challenges",
  frontImage: "/logo.jpeg",
  backImage: "/back.png",
  sliderImages: [
    "/BackgroundSlider1.jpeg",
    "/BackgroundSlider2.JPG",
    "/BackgroundSlider3.JPG",
    "/BackgroundSlider4.jpeg",
    "/BackgroundSlider5.jpeg",
    "/BackgroundSlider6.jpeg",
    "/BackgroundSlider7.jpeg",
  ],
  heroStyles: {
    title: {
      fontSize: "text-6xl",
      fontStyle: "default",
      fontWeight: "bold",
      textEffect: "none",
      animation: "fadeIn",
      textColor: "#ffffff",
    },
    subtitle: {
      fontSize: "text-xl",
      fontStyle: "default",
      fontWeight: "normal",
      textEffect: "none",
      animation: "fadeIn",
      textColor: "#e6eef8",
    },
  },
};

const fontStyleClasses: Record<string, string> = {
  default: "",
  serif: "font-serif",
  mono: "font-mono",
  italic: "italic",
};

const titleSizeOptions = ["text-4xl", "text-5xl", "text-6xl", "text-7xl"];
const subtitleSizeOptions = ["text-base", "text-lg", "text-xl", "text-2xl"];

const fontWeightClasses: Record<string, string> = {
  normal: "font-normal",
  semibold: "font-semibold",
  bold: "font-bold",
};

const textEffectClasses: Record<string, string> = {
  none: "",
  shadow: "drop-shadow-lg",
  highlight: "bg-yellow-200/30 px-2 py-1 rounded",
};

const animationClasses: Record<string, string> = {
  none: "",
  fadeIn: "animate-fade-in",
  slideUp: "animate-slide-up",
  bounce: "animate-bounce",
};

export function HeroSection() {
  const { isAdmin } = useAdmin();
  const { tenant } = useTenant();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [heroContent, setHeroContent] = useState<HeroContent>(defaultHeroContent);
  const [editContent, setEditContent] = useState<HeroContent>(defaultHeroContent);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [cardAspectRatio, setCardAspectRatio] = useState(1.25);

  useEffect(() => {
    const loadHero = async () => {
      try {
        const { data, error } = await supabase
          .from("page_content")
          .select("*")
          .eq("page_name", "home")
          .eq("section_key", "hero")
          .eq("tenant_id", tenant!.id)
          .maybeSingle();

        if (!error && data?.content) {
          const parsed = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
          setHeroContent(parsed);
          setEditContent(parsed);
        }
      } catch (error) {
        console.error("Failed to load hero content:", error);
      }
    };

    loadHero();
  }, [tenant?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroContent.sliderImages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [heroContent.sliderImages.length]);

  const saveHeroContent = async () => {
    setSaving(true);
    try {
      const entry = {
        page_name: "home",
        section_key: "hero",
        content: editContent as any,
        tenant_id: tenant!.id,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("page_content").upsert([entry], {
        onConflict: "page_name,section_key,tenant_id",
      });
      if (error) throw error;
      setHeroContent(editContent);
      setEditing(false);
      toast.success("Hero content updated.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save hero content.");
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (field: keyof Pick<HeroContent, "frontImage" | "backImage">, file: File) => {
    setUploadingFor(field);
    try {
      // Delete old image from storage if it was uploaded (not a default static asset)
      const oldUrl = editContent[field];
      if (oldUrl && oldUrl.includes("/storage/v1/")) {
        await deleteStorageFiles([oldUrl]);
      }

      const sanitized = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
      const filePath = `home_hero_images/${sanitized}`;

      const { error: uploadError } = await supabase.storage
        .from("resources")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from("resources")
        .getPublicUrl(filePath);

      setEditContent((current) => ({ ...current, [field]: urlData.publicUrl }));
      toast.success("Image uploaded successfully.");
    } catch (error: any) {
      console.error("Failed to upload image:", error);
      toast.error(error?.message || "Unable to upload image.");
    } finally {
      setUploadingFor(null);
    }
  };

  const uploadSliderImage = async (file: File) => {
    setUploadingFor("slider");
    try {
      const sanitized = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
      const filePath = `home_slider_images/${sanitized}`;

      const { error: uploadError } = await supabase.storage
        .from("resources")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from("resources")
        .getPublicUrl(filePath);

      setEditContent((current) => ({
        ...current,
        sliderImages: [...current.sliderImages, urlData.publicUrl],
      }));
      toast.success("Slider image added.");
    } catch (error: any) {
      console.error("Failed to upload slider image:", error);
      toast.error(error?.message || "Unable to upload slider image.");
    } finally {
      setUploadingFor(null);
    }
  };

  const removeSliderImage = async (index: number) => {
    const urlToDelete = editContent.sliderImages[index];
    // Only delete from storage if it's a Supabase-uploaded image (not a static default)
    if (urlToDelete && urlToDelete.includes("/storage/v1/")) {
      await deleteStorageFiles([urlToDelete]);
    }
    setEditContent((current) => ({
      ...current,
      sliderImages: current.sliderImages.filter((_, idx) => idx !== index),
    }));
  };

  // Choose which content to render: live edit preview when editing, otherwise saved hero
  const displayedContent = editing ? editContent : heroContent;

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Image Slider */}
      <div className="absolute inset-0 z-0">
        <img
          src={displayedContent.sliderImages[currentImageIndex]}
          alt="Background"
          className="w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
        />
      </div>

      {/* Semi-transparent Overlay */}
      <div
        className="absolute inset-0 z-10"
        style={{ background: "linear-gradient(135deg, rgba(33, 37, 41, 0.3) 0%, rgba(33, 37, 41, 0.4) 100%)" }}
      ></div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 z-20">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-secondary blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-secondary blur-3xl" />
      </div>

        <div className="container mx-auto px-4 py-20 relative z-30">
        <div className="max-w-3xl mx-auto">
          {/* Hero Content */}
          <div className="text-center space-y-6">
            <div className="inline-block">
              <span className="bg-secondary/20 text-secondary px-4 py-1.5 rounded-full text-sm font-medium">
                {displayedContent.chipText}
              </span>
            </div>

            <h1
              className={`${displayedContent.heroStyles?.title?.fontSize || "text-6xl"} font-poppins ${fontStyleClasses[displayedContent.heroStyles?.title?.fontStyle || "default"]} ${fontWeightClasses[displayedContent.heroStyles?.title?.fontWeight || "bold"]} leading-tight ${animationClasses[displayedContent.heroStyles?.title?.animation || "fadeIn"]}`}
              style={{ color: displayedContent.heroStyles?.title?.textColor || undefined }}
            >
              {displayedContent.title}
            </h1>

            <p
              className={`${displayedContent.heroStyles?.subtitle?.fontSize || "text-xl"} ${fontStyleClasses[displayedContent.heroStyles?.subtitle?.fontStyle || "default"]} ${fontWeightClasses[displayedContent.heroStyles?.subtitle?.fontWeight || "normal"]} ${animationClasses[displayedContent.heroStyles?.subtitle?.animation || "fadeIn"]} text-primary-foreground/90 font-light`}
              style={{ color: displayedContent.heroStyles?.subtitle?.textColor || undefined }}
            >
              {displayedContent.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up animation-delay-200">
              <Button asChild variant="orange" size="xl">
                <Link to={tenantPath(tenant?.slug || "", "/problems")}>
                  <FileText className="w-5 h-5" />
                  View Problems
                </Link>
              </Button>

              <Button asChild variant="orangeOutline" size="xl" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                <Link to={tenantPath(tenant?.slug || "", "/registration")}>

                  Apply Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>

            {isAdmin && !editing && (
              <Button onClick={() => setEditing(true)} variant="orange" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit Hero Section
              </Button>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-10 bg-white/95 rounded-[2rem] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-foreground">Chip text</label>
                <Input
                  value={editContent.chipText}
                  onChange={(e) => setEditContent({ ...editContent, chipText: e.target.value })}
                />

                <label className="block text-sm font-medium text-foreground">Title</label>
                <Input
                  value={editContent.title}
                  onChange={(e) => setEditContent({ ...editContent, title: e.target.value })}
                />

                <label className="block text-sm font-medium text-foreground">Subtitle</label>
                <Textarea
                  value={editContent.subtitle}
                  onChange={(e) => setEditContent({ ...editContent, subtitle: e.target.value })}
                  className="min-h-[120px]"
                />

                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Title Style</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={editContent.heroStyles?.title?.fontSize}
                      onChange={(e) =>
                        setEditContent((c) => ({
                          ...c,
                          heroStyles: { ...(c.heroStyles || {}), title: { ...(c.heroStyles?.title || {}), fontSize: e.target.value as HeroContent["heroStyles"]["title"]["fontSize"] } },
                        }))
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      {titleSizeOptions.map((s) => (
                        <option key={s} value={s}>{s.replace("text-", "")}</option>
                      ))}
                    </select>

                    <select
                      value={editContent.heroStyles?.title?.fontWeight}
                      onChange={(e) =>
                        setEditContent((c) => ({
                          ...c,
                          heroStyles: { ...(c.heroStyles || {}), title: { ...(c.heroStyles?.title || {}), fontWeight: e.target.value as HeroContent["heroStyles"]["title"]["fontWeight"] } },
                        }))
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="normal">Normal</option>
                      <option value="semibold">Semi Bold</option>
                      <option value="bold">Bold</option>
                    </select>

                    <select
                      value={editContent.heroStyles?.title?.fontStyle}
                      onChange={(e) =>
                        setEditContent((c) => ({
                          ...c,
                          heroStyles: { ...(c.heroStyles || {}), title: { ...(c.heroStyles?.title || {}), fontStyle: e.target.value as HeroContent["heroStyles"]["title"]["fontStyle"] } },
                        }))
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="default">Default</option>
                      <option value="serif">Serif</option>
                      <option value="mono">Monospace</option>
                      <option value="italic">Italic</option>
                    </select>

                    <select
                      value={editContent.heroStyles?.title?.animation}
                      onChange={(e) =>
                        setEditContent((c) => ({
                          ...c,
                          heroStyles: { ...(c.heroStyles || {}), title: { ...(c.heroStyles?.title || {}), animation: e.target.value as HeroContent["heroStyles"]["title"]["animation"] } },
                        }))
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="none">None</option>
                      <option value="fadeIn">Fade In</option>
                      <option value="slideUp">Slide Up</option>
                      <option value="bounce">Bounce</option>
                    </select>

                    <input
                      type="color"
                      value={editContent.heroStyles?.title?.textColor || "#ffffff"}
                      onChange={(e) =>
                        setEditContent((c) => ({
                          ...c,
                          heroStyles: { ...(c.heroStyles || {}), title: { ...(c.heroStyles?.title || {}), textColor: e.target.value } },
                        }))
                      }
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>

                  <h4 className="text-sm font-semibold mt-4 mb-2">Subtitle Style</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={editContent.heroStyles?.subtitle?.fontSize}
                      onChange={(e) =>
                        setEditContent((c) => ({
                          ...c,
                          heroStyles: { ...(c.heroStyles || {}), subtitle: { ...(c.heroStyles?.subtitle || {}), fontSize: e.target.value as NonNullable<HeroContent["heroStyles"]["subtitle"]>["fontSize"] } },
                        }))
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      {subtitleSizeOptions.map((s) => (
                        <option key={s} value={s}>{s.replace("text-", "")}</option>
                      ))}
                    </select>

                    <select
                      value={editContent.heroStyles?.subtitle?.fontWeight}
                      onChange={(e) =>
                        setEditContent((c) => ({
                          ...c,
                          heroStyles: { ...(c.heroStyles || {}), subtitle: { ...(c.heroStyles?.subtitle || {}), fontWeight: e.target.value as NonNullable<HeroContent["heroStyles"]["subtitle"]>["fontWeight"] } },
                        }))
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="normal">Normal</option>
                      <option value="semibold">Semi Bold</option>
                      <option value="bold">Bold</option>
                    </select>

                    <select
                      value={editContent.heroStyles?.subtitle?.fontStyle}
                      onChange={(e) =>
                        setEditContent((c) => ({
                          ...c,
                          heroStyles: { ...(c.heroStyles || {}), subtitle: { ...(c.heroStyles?.subtitle || {}), fontStyle: e.target.value as NonNullable<HeroContent["heroStyles"]["subtitle"]>["fontStyle"] } },
                        }))
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="default">Default</option>
                      <option value="serif">Serif</option>
                      <option value="mono">Monospace</option>
                      <option value="italic">Italic</option>
                    </select>

                    <select
                      value={editContent.heroStyles?.subtitle?.animation}
                      onChange={(e) =>
                        setEditContent((c) => ({
                          ...c,
                          heroStyles: { ...(c.heroStyles || {}), subtitle: { ...(c.heroStyles?.subtitle || {}), animation: e.target.value as NonNullable<HeroContent["heroStyles"]["subtitle"]>["animation"] } },
                        }))
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="none">None</option>
                      <option value="fadeIn">Fade In</option>
                      <option value="slideUp">Slide Up</option>
                      <option value="bounce">Bounce</option>
                    </select>

                    <input
                      type="color"
                      value={editContent.heroStyles?.subtitle?.textColor || "#e6eef8"}
                      onChange={(e) =>
                        setEditContent((c) => ({
                          ...c,
                          heroStyles: { ...(c.heroStyles || {}), subtitle: { ...(c.heroStyles?.subtitle || {}), textColor: e.target.value } },
                        }))
                      }
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground">Front image</label>
                  <div className="mt-2 flex items-center gap-4">
                    <img src={editContent.frontImage} alt="Front preview" className="w-24 h-24 rounded-xl object-cover border" />
                    <label className="cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm hover:bg-slate-100">
                      <Upload className="w-4 h-4 inline-block mr-2" />
                      {uploadingFor === "frontImage" ? "Uploading..." : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) uploadImage("frontImage", e.target.files[0]);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">Back image</label>
                  <div className="mt-2 flex items-center gap-4">
                    <img src={editContent.backImage} alt="Back preview" className="w-24 h-24 rounded-xl object-cover border" />
                    <label className="cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm hover:bg-slate-100">
                      <Upload className="w-4 h-4 inline-block mr-2" />
                      {uploadingFor === "backImage" ? "Uploading..." : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) uploadImage("backImage", e.target.files[0]);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Right-side preview column (sticky so it's visible while editing) */}
              <div className="space-y-4 col-span-1 sticky top-24 self-start">
                <h3 className="text-lg font-semibold text-foreground">Preview</h3>
                <div className="rounded-xl overflow-hidden border border-border">
                  <div className="relative w-full h-96">
                    <img
                      src={editContent.sliderImages[currentImageIndex]}
                      alt="Preview background"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(33, 37, 41, 0.3) 0%, rgba(33, 37, 41, 0.4) 100%)" }} />
                    <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center">
                      <div>
                        <span className="inline-block bg-secondary/20 text-secondary px-3 py-1 rounded-full text-sm mb-4">
                          {editContent.chipText}
                        </span>
                        <h2 className={`${editContent.heroStyles?.title?.fontSize || 'text-6xl'} ${fontStyleClasses[editContent.heroStyles?.title?.fontStyle || 'default']} ${fontWeightClasses[editContent.heroStyles?.title?.fontWeight || 'bold']} leading-tight ${textEffectClasses[editContent.heroStyles?.title?.textEffect || 'none']}`} style={{ color: editContent.heroStyles?.title?.textColor || undefined }}>
                          {editContent.title}
                        </h2>
                        <p className={`${editContent.heroStyles?.subtitle?.fontSize || 'text-xl'} ${fontStyleClasses[editContent.heroStyles?.subtitle?.fontStyle || 'default']} ${fontWeightClasses[editContent.heroStyles?.subtitle?.fontWeight || 'normal']} mt-3`} style={{ color: editContent.heroStyles?.subtitle?.textColor || undefined }}>
                          {editContent.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-foreground">Background slider images</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {editContent.sliderImages.map((image, index) => (
                  <div key={image} className="rounded-xl border border-border overflow-hidden bg-slate-50">
                    <img src={image} alt={`Slider ${index + 1}`} className="w-full h-40 object-cover" />
                    <div className="flex items-center justify-between p-3">
                      <span className="text-sm text-muted-foreground">Image {index + 1}</span>
                      <button
                        type="button"
                        className="text-sm text-destructive"
                        onClick={() => removeSliderImage(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm hover:bg-slate-100">
                  <Upload className="w-4 h-4" />
                  {uploadingFor === "slider" ? "Uploading..." : "Add slider image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) uploadSliderImage(e.target.files[0]);
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-end gap-3">
              <Button onClick={saveHeroContent} disabled={saving} variant="orange" size="sm">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Hero"}
              </Button>
              <Button
                onClick={() => {
                  setEditing(false);
                  setEditContent(heroContent);
                }}
                variant="outline"
                size="sm"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 120L60 110C120 100 240 80 360 75C480 70 600 80 720 85C840 90 960 90 1080 85C1200 80 1320 70 1380 65L1440 60V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
}

