import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const Login = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [sendingReset, setSendingReset] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    useEffect(() => {
        // Check if user is already logged in
        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error("Session check error:", error);
                    setCheckingSession(false);
                    return;
                }

                if (session) {
                    // User is already logged in, redirect to dashboard
                    navigate("/dashboard", { replace: true });
                } else {
                    setCheckingSession(false);
                }
            } catch (error) {
                console.error("Error checking session:", error);
                setCheckingSession(false);
            }
        };

        checkSession();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    navigate("/dashboard", { replace: true });
                }
            }
        );

        // Cleanup subscription
        return () => {
            subscription.unsubscribe();
        };
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            toast({
                title: "Missing Information",
                description: "Please enter both email and password",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) throw error;

            if (data.user) {
                toast({
                    title: "Welcome back!",
                    description: "Redirecting to dashboard...",
                });
                // Navigation will be handled by onAuthStateChange listener
            }
        } catch (error: any) {
            console.error("Login error:", error);
            
            // Provide user-friendly error messages
            let errorMessage = "Invalid email or password. Please try again.";
            
            if (error.message.includes("Invalid login credentials")) {
                errorMessage = "Invalid email or password. Please check your credentials.";
            } else if (error.message.includes("Email not confirmed")) {
                errorMessage = "Please verify your email address before logging in.";
            } else if (error.message.includes("User not found")) {
                errorMessage = "No account found with this email. Please sign up first.";
            }

            toast({
                title: "Login failed",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!resetEmail) {
            toast({
                title: "Email Required",
                description: "Please enter your email address",
                variant: "destructive",
            });
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(resetEmail)) {
            toast({
                title: "Invalid Email",
                description: "Please enter a valid email address",
                variant: "destructive",
            });
            return;
        }

        setSendingReset(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setResetSent(true);
            toast({
                title: "Reset Email Sent!",
                description: "Check your email for the password reset link",
            });

            // Close dialog after 3 seconds
            setTimeout(() => {
                setShowForgotPassword(false);
                setResetSent(false);
                setResetEmail("");
            }, 3000);

        } catch (error: any) {
            console.error("Password reset error:", error);
            toast({
                title: "Reset Failed",
                description: error.message || "Failed to send reset email. Please try again.",
                variant: "destructive",
            });
        } finally {
            setSendingReset(false);
        }
    };

    // Show loading state while checking session
    if (checkingSession) {
        return (
            <div className="min-h-screen bg-[var(--gradient-subtle)] flex items-center justify-center">
                <div className="text-center">
                    <Sparkles className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-[var(--gradient-subtle)] flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <Link to="/" className="inline-flex items-center space-x-2 mb-8">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                                <Sparkles className="h-6 w-6 text-primary-foreground" />
                            </div>
                            <span className="text-2xl font-bold text-gradient">AI Hiring</span>
                        </Link>
                    </div>

                    <Card className="p-8 space-y-6">
                        <div className="space-y-2 text-center">
                            <h1 className="text-2xl font-bold">Welcome back</h1>
                            <p className="text-muted-foreground">
                                Sign in to your account
                            </p>
                        </div>

                        <form className="space-y-4" onSubmit={handleLogin}>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="john@company.com"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password *</Label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForgotPassword(true);
                                            setResetEmail(formData.email);
                                        }}
                                        className="text-sm text-primary hover:underline"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                disabled={loading || !formData.email || !formData.password}
                            >
                                {loading ? "Signing in..." : "Sign In"}
                            </Button>
                        </form>

                        <div className="text-center text-sm">
                            Don't have an account?{" "}
                            <Link to="/signup" className="text-primary hover:underline font-medium">
                                Sign Up
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Forgot Password Dialog */}
            <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Enter your email address and we'll send you a link to reset your password.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {resetSent ? (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center justify-center">
                                <div className="rounded-full bg-green-100 p-3">
                                    <Sparkles className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="font-semibold text-green-900">Email Sent!</h3>
                                <p className="text-sm text-green-700">
                                    Check your inbox for the password reset link.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Don't see it? Check your spam folder.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="reset-email">Email Address</Label>
                                <Input
                                    id="reset-email"
                                    type="email"
                                    placeholder="john@company.com"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                                />
                            </div>
                            
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setShowForgotPassword(false);
                                        setResetEmail("");
                                        setResetSent(false);
                                    }}
                                    disabled={sendingReset}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    className="flex-1"
                                    onClick={handleForgotPassword}
                                    disabled={sendingReset || !resetEmail}
                                >
                                    {sendingReset ? "Sending..." : "Send Reset Link"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default Login;