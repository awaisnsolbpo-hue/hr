import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import BookDemoDialog from "@/components/BookDemoDialog";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showDemoDialog, setShowDemoDialog] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    if (path.startsWith("/#")) {
      navigate("/");
      setTimeout(() => {
        const id = path.replace("/#", "");
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } else {
      navigate(path);
    }
  };

  const menuItems = [
    { label: "Features", path: "/#features" },
    { label: "How It Works", path: "/#how-it-works" },
    { label: "Pricing", path: "/#pricing" },
    { label: "FAQ", path: "/#faq" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-md shadow-[var(--shadow-elegant)]"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 hover-scale z-10"
            onClick={() => setIsOpen(false)}
          >
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-gradient">
              AI Hiring
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(item.path) ? "text-primary" : "text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Link to="/signup">
              <Button variant="default" size="default" className="bg-gradient-to-r from-primary to-accent">
                Start for Free
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="default"
              onClick={() => setShowDemoDialog(true)}
            >
              Book a Demo
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="min-h-touch min-w-touch"
                aria-label="Toggle menu"
              >
                {isOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </SheetTrigger>

            <SheetContent 
              side="right" 
              className="w-[85vw] sm:w-[400px] pt-12"
            >
              <SheetHeader className="mb-8">
                <SheetTitle className="text-left">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                      <Sparkles className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="text-xl font-bold text-gradient">
                      AI Hiring
                    </span>
                  </div>
                </SheetTitle>
              </SheetHeader>

              {/* Mobile Menu Items */}
              <div className="flex flex-col space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`text-left py-4 px-4 rounded-lg text-base font-medium transition-all min-h-touch ${
                      isActive(item.path)
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}

                {/* Mobile CTA Buttons */}
                <div className="flex flex-col space-y-3 pt-8 border-t mt-4">
                  <Button
                    size="lg"
                    onClick={() => handleNavigation("/signup")}
                    className="w-full min-h-touch text-base bg-gradient-to-r from-primary to-accent"
                  >
                    Start for Free
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setIsOpen(false);
                      setShowDemoDialog(true);
                    }}
                    className="w-full min-h-touch text-base"
                  >
                    Book a Demo
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Book Demo Dialog */}
      <BookDemoDialog 
        open={showDemoDialog} 
        onOpenChange={setShowDemoDialog}
        onSuccess={() => {
          // Optional: Handle success
        }}
      />
    </nav>
  );
};

export default Navbar;