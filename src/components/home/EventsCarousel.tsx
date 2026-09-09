import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  image_url: string;
}

export function EventsCarousel() {
  const { tenant } = useTenant();
  const [events, setEvents] = useState<Event[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [loading, setLoading] = useState(true);
  const [cardsPerView, setCardsPerView] = useState(3);
  const [autoScrollResetKey, setAutoScrollResetKey] = useState(0);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsEvent, setDetailsEvent] = useState<Event | null>(null);

  const getPreviewDescription = (text: string, wordLimit = 10, charLimit = 100) => {
    if (!text) return "";
    const cleaned = text.trim().replace(/\s+/g, " ");
    const words = cleaned.split(" ");

    if (words.length > wordLimit) {
      return `${words.slice(0, wordLimit).join(" ")}...`;
    }

    if (cleaned.length > charLimit) {
      return `${cleaned.slice(0, charLimit).trimEnd()}...`;
    }

    return cleaned;
  };

  const openDetails = (evt: Event) => {
    setDetailsEvent(evt);
    setDetailsOpen(true);
  };

  useEffect(() => {
    fetchEvents();
  }, [tenant?.id]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .eq("is_active", true)
        .order("event_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateCardsPerView = () => {
    const w = window.innerWidth;
    if (w < 768) setCardsPerView(1);
    else if (w < 1024) setCardsPerView(2);
    else setCardsPerView(3);
  };

  useEffect(() => {
    updateCardsPerView();
    window.addEventListener("resize", updateCardsPerView);
    return () => window.removeEventListener("resize", updateCardsPerView);
  }, []);

  const canSlide = events.length > cardsPerView;
  const renderedEvents = canSlide
    ? [...events.slice(-cardsPerView), ...events, ...events.slice(0, cardsPerView)]
    : events;

  useEffect(() => {
    setIsTransitioning(true);
    setSlideIndex(canSlide ? cardsPerView : 0);
  }, [canSlide, cardsPerView, events.length]);

  const getRealStartIndex = () => {
    if (!canSlide || events.length === 0) return 0;
    const raw = (slideIndex - cardsPerView) % events.length;
    return raw < 0 ? raw + events.length : raw;
  };

  const resetAutoScrollTimer = () => {
    setAutoScrollResetKey((prev) => prev + 1);
  };

  const nextSlide = (manual = false) => {
    if (!canSlide) return;
    setIsTransitioning(true);
    setSlideIndex((prev) => prev + 1);
    if (manual) resetAutoScrollTimer();
  };

  const prevSlide = () => {
    if (!canSlide) return;
    setIsTransitioning(true);
    setSlideIndex((prev) => prev - 1);
    resetAutoScrollTimer();
  };

  const goToSlide = (index: number) => {
    if (!canSlide) return;
    setIsTransitioning(true);
    setSlideIndex(cardsPerView + index);
    resetAutoScrollTimer();
  };

  const handleTrackTransitionEnd = () => {
    if (!canSlide) return;

    if (slideIndex >= events.length + cardsPerView) {
      setIsTransitioning(false);
      setSlideIndex(cardsPerView);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsTransitioning(true)));
      return;
    }

    if (slideIndex < cardsPerView) {
      setIsTransitioning(false);
      setSlideIndex(events.length + slideIndex);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsTransitioning(true)));
    }
  };

  useEffect(() => {
    if (!canSlide) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [canSlide, autoScrollResetKey]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Calendar className="w-6 h-6 text-primary-foreground" />
            </div>
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No upcoming events at the moment.</p>
          </div>
        </div>
      </section>
    );
  }

  const visibleStartIndex = getRealStartIndex();

  return (
    <section className="py-16 bg-gradient-to-b from-slate-100/70 to-slate-200/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-poppins font-semibold tracking-tight text-slate-900 mb-3">
            Upcoming Events
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
            Stay updated with the latest Samanvay events, workshops, and important dates.
          </p>
          <p className="inline-flex items-center gap-2 text-sm text-slate-700 mt-4 rounded-full border border-slate-300/80 bg-white/70 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Showing {visibleStartIndex + 1}-{Math.min(visibleStartIndex + cardsPerView, events.length)} of {events.length}
          </p>
        </div>

        <div className="relative mx-auto max-w-6xl px-12 md:px-16">
          <div className="overflow-hidden">
            <div
              className={`flex ${isTransitioning ? "transition-transform duration-500 ease-out" : ""}`}
              style={{ transform: `translateX(-${(slideIndex * 100) / cardsPerView}%)` }}
              onTransitionEnd={handleTrackTransitionEnd}
            >
              {renderedEvents.map((evt, idx) => (
                <div
                  key={`${evt.id}-${idx}`}
                  className="flex-shrink-0 px-3 py-2"
                  style={{ flex: `0 0 ${100 / cardsPerView}%` }}
                >
                  <Card className="group h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                    <div className="relative">
                      <img
                        src={evt.image_url || "/og-image.png"}
                        alt={evt.title}
                        className="h-44 w-full object-cover md:h-48 lg:h-52"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
                    </div>

                    <CardContent className="p-5">
                      <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{evt.title}</h3>
                      <p className="mt-2 min-h-[2.75rem] text-sm leading-relaxed text-slate-600 break-words">
                        {getPreviewDescription(evt.description)}
                      </p>

                      <div className="mt-4 space-y-2 text-sm text-slate-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          <span className="leading-none">{formatDate(evt.event_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-500" />
                          <span className="leading-none">{formatTime(evt.event_date)}</span>
                        </div>
                      </div>

                      <Button
                        variant="orange"
                        size="sm"
                        className="mt-5 h-11 w-full rounded-xl text-base font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_22px_rgba(249,115,22,0.35)]"
                        onClick={() => openDetails(evt)}
                      >
                        Learn More
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {canSlide && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-0 top-1/2 z-20 h-12 w-12 -translate-y-1/2 rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition-all duration-200 hover:-translate-y-1/2 hover:scale-105 hover:bg-slate-50 hover:shadow-[0_16px_36px_rgba(15,23,42,0.24)]"
                onClick={prevSlide}
                aria-label="Previous events"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="absolute right-0 top-1/2 z-20 h-12 w-12 -translate-y-1/2 rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition-all duration-200 hover:-translate-y-1/2 hover:scale-105 hover:bg-slate-50 hover:shadow-[0_16px_36px_rgba(15,23,42,0.24)]"
                onClick={() => nextSlide(true)}
                aria-label="Next events"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>

        {canSlide && (
          <div className="mt-6 flex items-center justify-center gap-2">
            {events.map((evt, index) => (
              <button
                key={evt.id}
                type="button"
                aria-label={`Go to event ${index + 1}`}
                onClick={() => goToSlide(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  visibleStartIndex === index
                    ? "w-8 bg-slate-800"
                    : "w-2.5 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {detailsEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{detailsEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <img
                  src={detailsEvent.image_url || "/og-image.png"}
                  alt={detailsEvent.title}
                  className="w-full h-60 object-cover rounded-lg"
                />
                <p className="text-muted-foreground">{detailsEvent.description}</p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(detailsEvent.event_date)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTime(detailsEvent.event_date)}
                  </div>
                  {detailsEvent.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {detailsEvent.location}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
