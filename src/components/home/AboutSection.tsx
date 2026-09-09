export function AboutSection() {
  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-secondary font-medium text-sm uppercase tracking-wider">
            About The Event
          </span>
          <h2 className="mt-3 text-3xl lg:text-4xl font-poppins font-bold text-foreground">
            What is Samanvay?
          </h2>
          
          <div className="mt-8 space-y-4 text-muted-foreground text-lg leading-relaxed">
            <p>
              <strong className="text-foreground">Samanvay</strong> is a platform connecting organizations, universities, and industry to build solutions for societal challenges in Jharkhand.-world problems within the campus ecosystem. We believe every challenge holds the seed of transformation.
            </p>
            <p>
              Through our structured <strong className="text-secondary">5D Framework</strong> — Discover, Define, Design, Develop, and Deliver — participants journey from problem identification to prototype creation, gaining invaluable entrepreneurial skills along the way.
            </p>
          </div>

          {/* 5D Framework Visual */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {["Discover", "Define", "Design", "Develop", "Deliver"].map((phase, index) => (
              <div
                key={phase}
                className="flex items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-poppins font-bold">
                    {index + 1}D
                  </span>
                </div>
                <span className="font-medium text-foreground">{phase}</span>
                {index < 4 && (
                  <span className="text-muted-foreground hidden sm:block">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

