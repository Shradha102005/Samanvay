import { Building2, Users, GraduationCap, Handshake, Heart, Star } from "lucide-react";

const departments = [
  "AIML", "CSE", "ECE", "EEE", "MECH", "CIVIL", "MBA", "PHARMACY"
];

const teamBlocks = [
  {
    title: "Geenovate Foundation",
    description: "The driving force behind Samanvay, fostering innovation and entrepreneurship across GCET.",
    icon: Building2,
  },
  {
    title: "Patrons & Leadership",
    description: "Chairman, Director, and institutional leaders providing vision and guidance.",
    icon: Star,
  },
  {
    title: "Core Organisers",
    description: "Head Coordinator and 5 Co-Coordinators managing event operations and participant experience.",
    icon: Users,
  },
  {
    title: "Department Support Group",
    description: "Academic supporters from each department ensuring curriculum alignment and mentorship.",
    icon: GraduationCap,
  },
  {
    title: "Partner Clubs & Councils",
    description: "Innovation Council, Tech Clubs, and professional bodies collaborating for success.",
    icon: Handshake,
  },
  {
    title: "Volunteers & Sponsors",
    description: "Dedicated student volunteers and external sponsors making this event possible.",
    icon: Heart,
  },
];

export function TeamSection() {
  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-secondary font-medium text-sm uppercase tracking-wider">
            The Team
          </span>
          <h2 className="mt-3 text-3xl lg:text-4xl font-poppins font-bold text-foreground">
            Behind Samanvay
          </h2>
        </div>

        {/* Team Blocks Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {teamBlocks.map((block) => {
            const Icon = block.icon;
            return (
              <div
                key={block.title}
                className="bg-card rounded-xl p-6 shadow-card hover:shadow-elevated transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-poppins font-semibold text-lg text-foreground">
                  {block.title}
                </h3>
                <p className="mt-2 text-muted-foreground text-sm">
                  {block.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Partnered Departments */}
        <div className="bg-muted rounded-2xl p-8 lg:p-12">
          <h3 className="text-center font-poppins font-semibold text-xl text-foreground mb-8">
            Partnered Departments
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            {departments.map((dept) => (
              <div
                key={dept}
                className="bg-card px-6 py-3 rounded-lg shadow-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-default"
              >
                {dept}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

