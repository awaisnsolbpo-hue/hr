import { FileText, Users, Brain, Award } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Post Your Job",
    description: "Create detailed job postings or import from LinkedIn. Share public links to reach candidates and expand your talent pool.",
    icon: FileText,
  },
  {
    number: "02",
    title: "Collect Applications",
    description: "Receive applications through multiple channels - direct uploads, email integration, or public links. All resumes are automatically organized.",
    icon: Users,
  },
  {
    number: "03",
    title: "AI Evaluates Candidates",
    description: "Our system analyzes each resume against your requirements, scoring candidates on skills, experience, and qualifications. Top candidates are automatically identified.",
    icon: Brain,
  },
  {
    number: "04",
    title: "Review Top Talent",
    description: "Access a ranked shortlist with detailed analysis, interview transcripts, and performance scores to make informed hiring decisions.",
    icon: Award,
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-[var(--gradient-subtle)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            A streamlined four-step process that transforms how you find and evaluate talent. From job posting to final selection, we handle the heavy lifting.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative group animate-fade-in-up hover-scale"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="bg-card rounded-2xl p-8 shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-glow)] transition-all border border-border h-full">
                {/* Step Number */}
                <div className="text-5xl font-bold text-primary/20 mb-4">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent mb-6 group-hover:scale-110 transition-transform">
                  <step.icon className="h-7 w-7 text-primary-foreground" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>

                {/* Connector Line (hidden on mobile and last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 right-0 w-8 h-0.5 bg-gradient-to-r from-primary to-accent transform translate-x-full -translate-y-1/2" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
