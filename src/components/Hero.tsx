import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import BookDemoDialog from "@/components/BookDemoDialog";

const Hero = () => {
  const [showDemoDialog, setShowDemoDialog] = useState(false);

  const handleDemoClick = () => {
    setShowDemoDialog(true);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 md:pt-16">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-[var(--gradient-hero)]" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-12 md:py-0">
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 animate-fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <span className="text-xs sm:text-sm font-medium">
              AI That Identifies Qualified Talent in Minutes
            </span>
          </div>

          {/* Main Headline - Mobile Optimized */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight px-2 sm:px-0">
            Stop Sorting{" "}
            <span className="text-gradient animate-glow-pulse">Resumes</span>
            <br />
            Start Finding the{" "}
            <span className="text-gradient">Right People</span>
          </h1>

          {/* Subheading - Mobile Optimized */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto px-2 sm:px-4">
            Automatically screen applicants, assess job fit, and deliver ranked shortlists. Accelerate hiring by removing repetitive steps and focusing on the best candidates.
          </p>

          {/* CTA Buttons - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-4 px-4 sm:px-0">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button 
                variant="default" 
                size="lg" 
                className="w-full sm:w-auto min-h-touch bg-gradient-to-r from-primary to-accent hover:opacity-90 group text-base sm:text-lg px-6 sm:px-8"
              >
                Start for Free
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto min-h-touch group text-base sm:text-lg px-6 sm:px-8"
              onClick={handleDemoClick}
            >
              <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Book a Demo
            </Button>
          </div>

          {/* Trust Indicators - Mobile Optimized */}
          <div className="pt-8 sm:pt-12 space-y-4">
            <p className="text-xs sm:text-sm text-muted-foreground px-4">
              Trusted by leading companies worldwide
            </p>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 bg-gradient-to-t from-background to-transparent z-10" />

      {/* Book Demo Dialog */}
      <BookDemoDialog 
        open={showDemoDialog} 
        onOpenChange={setShowDemoDialog}
        onSuccess={() => {
          // Optional: Handle success (e.g., show thank you message)
        }}
      />
    </section>
  );
};

export default Hero;