import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    company: "",
    password: "",
    confirmPassword: "",
  });

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handlePasswordChange = (value: string) => {
    setFormData({ ...formData, password: value });
    
    // Validate password
    const error = validatePassword(value);
    setErrors({ ...errors, password: error || undefined });

    // Check if confirm password matches
    if (formData.confirmPassword && value !== formData.confirmPassword) {
      setErrors({ ...errors, confirmPassword: "Passwords do not match" });
    } else if (formData.confirmPassword) {
      setErrors({ ...errors, confirmPassword: undefined });
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setFormData({ ...formData, confirmPassword: value });
    
    // Check if passwords match
    if (value !== formData.password) {
      setErrors({ ...errors, confirmPassword: "Passwords do not match" });
    } else {
      setErrors({ ...errors, confirmPassword: undefined });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    if (!formData.fullName || !formData.email || !formData.company || !formData.password || !formData.confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to create your account.",
        variant: "destructive",
      });
      return;
    }

    // Validate password
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      toast({
        title: "Invalid Password",
        description: passwordError,
        variant: "destructive",
      });
      return;
    }

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company_name: formData.company,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create/update profile with company name
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: formData.email,
            full_name: formData.fullName,
            company_name: formData.company,
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }

        toast({
          title: "Account Created!",
          description: "Welcome to AI Hiring. Redirecting to your dashboard...",
        });
        
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      }
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-gradient">AI Hiring</span>
          </Link>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Create your account</h1>
            <p className="text-muted-foreground">
              Start hiring smarter in minutes
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company Name *</Label>
                <Input
                  id="company"
                  placeholder="Acme Inc."
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className={errors.password ? "border-red-500" : ""}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                )}
                <div className="text-xs text-muted-foreground space-y-1 mt-2">
                  <p>Password must contain:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li className={formData.password.length >= 8 ? "text-green-600" : ""}>
                      At least 8 characters
                    </li>
                    <li className={/[A-Z]/.test(formData.password) ? "text-green-600" : ""}>
                      One uppercase letter
                    </li>
                    <li className={/[a-z]/.test(formData.password) ? "text-green-600" : ""}>
                      One lowercase letter
                    </li>
                    <li className={/[0-9]/.test(formData.password) ? "text-green-600" : ""}>
                      One number
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    className={errors.confirmPassword ? "border-red-500" : ""}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
                )}
                {!errors.confirmPassword && formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <span>✓</span> Passwords match
                  </p>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              variant="hero" 
              size="lg" 
              className="w-full group" 
              disabled={loading || !!errors.password || !!errors.confirmPassword}
            >
              {loading ? "Creating Account..." : "Create Account"}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Login Link */}
          <Link to="/login">
            <Button variant="outline" size="lg" className="w-full">
              Log In
            </Button>
          </Link>
        </div>
      </div>

      {/* Right Side - Benefits */}
      <div className="hidden lg:flex w-1/2 bg-[var(--gradient-hero)] items-center justify-center p-12">
        <div className="max-w-lg space-y-8 text-center">
          <h2 className="text-4xl font-bold">
            Join thousands of companies hiring smarter
          </h2>
          <div className="space-y-6 text-left">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">✓</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Save 80% of screening time</h3>
                <p className="text-sm text-muted-foreground">
                  Let AI handle initial candidate screening and interviews
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">✓</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Get better matches</h3>
                <p className="text-sm text-muted-foreground">
                  AI analyzes thousands of data points to find the best fit
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">✓</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Reduce hiring bias</h3>
                <p className="text-sm text-muted-foreground">
                  Objective AI screening ensures fair evaluation for all candidates
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;