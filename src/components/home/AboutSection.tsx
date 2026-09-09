export function AboutSection() {
  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-secondary font-medium text-sm uppercase tracking-wider">
            About the Platform
          </span>
          <h2 className="mt-3 text-3xl lg:text-4xl font-poppins font-bold text-foreground">
            What is Samanvay?
          </h2>

          <div className="mt-8 space-y-4 text-muted-foreground text-lg leading-relaxed">
            <p>
              <strong className="text-foreground">Samanvay</strong> is a technology-enabled
              Societal Innovation Collaboration Portal that connects community challenges
              submitted by citizens, Panchayati Raj Institutions, Urban Local Bodies, and
              government agencies with Higher Education Institutions (HEIs) and industry
              partners across Jharkhand — transforming real-world problems into
              actionable, innovation-driven solutions.
            </p>
            <p>
              Aligned with the <strong className="text-secondary">National Education Policy (NEP) 2020</strong>,
              the platform enables demand-driven innovation by routing validated societal
              challenges to universities based on academic expertise, and facilitating
              collaboration with industries, startups, MSMEs, and CSR organisations for
              mentorship, co-development, funding, and deployment.
            </p>
          </div>

          {/* Platform Workflow */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {["Submit", "Categorise", "Route", "Collaborate", "Deploy"].map((phase, index) => (
              <div
                key={phase}
                className="flex items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-poppins font-bold text-sm">
                    {index + 1}
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
