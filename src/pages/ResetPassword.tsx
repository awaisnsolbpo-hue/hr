import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sparkles, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [errors, setErrors] = useState<{
        password?: string;
        confirmPassword?: string;
    }>({});
    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
    });

    useEffect(() => {
        // Check if we have a valid session or if we're processing a reset token
        const checkSession = async () => {
            // First, check if there's a hash in the URL (reset token)
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const type = hashParams.get('type');

            // If there's a recovery token in the URL, Supabase will handle it automatically
            if (accessToken && type === 'recovery') {
                console.log('Processing password reset token...');
                // Wait longer for Supabase to establish the session
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                // Give Supabase a moment to process the token exchange
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                toast({
                    title: "Invalid Reset Link",
                    description: "This password reset link is invalid or has expired. Please request a new one.",
                    variant: "destructive",
                });
                setTimeout(() => {
                    navigate("/login");
                }, 3000);
            }
        };
        checkSession();
    }, [navigate, toast]);

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
        
        const error = validatePassword(value);
        setErrors({ ...errors, password: error || undefined });
        
        if (formData.confirmPassword && value !== formData.confirmPassword) {
            setErrors(prev => ({ ...prev, password: error || undefined, confirmPassword: "Passwords do not match" }));
        } else if (formData.confirmPassword) {
            setErrors(prev => ({ ...prev, password: error || undefined, confirmPassword: undefined }));
        }
    };

    const handleConfirmPasswordChange = (value: string) => {
        setFormData({ ...formData, confirmPassword: value });
        
        if (value !== formData.password) {
            setErrors({ ...errors, confirmPassword: "Passwords do not match" });
        } else {
            setErrors({ ...errors, confirmPassword: undefined });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate before submitting
        const passwordError = validatePassword(formData.password);
        if (passwordError) {
            setErrors({ ...errors, password: passwordError });
            return;
        }
        
        if (formData.password !== formData.confirmPassword) {
            setErrors({ ...errors, confirmPassword: "Passwords do not match" });
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: formData.password
            });

            if (error) throw error;

            setResetSuccess(true);
            
            toast({
                title: "Password Reset Successful",
                description: "Your password has been updated successfully.",
            });

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate("/login");
            }, 3000);

        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to reset password. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (resetSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
                <Card className="w-full max-w-md p-8 text-center space-y-6">
                    <div className="flex justify-center">
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Password Reset Successful!
                        </h2>
                        <p className="text-gray-600">
                            Your password has been updated successfully. You'll be redirected to the login page shortly.
                        </p>
                    </div>
                    <Button 
                        onClick={() => navigate("/login")} 
                        className="w-full"
                    >
                        Go to Login
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
            <Card className="w-full max-w-md p-8 space-y-6">
                <div className="space-y-2 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-3 rounded-full">
                            <Sparkles className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Reset Password
                    </h1>
                    <p className="text-gray-600">
                        Enter your new password below
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={(e) => handlePasswordChange(e.target.value)}
                                placeholder="Enter new password"
                                className={errors.password ? "border-red-500" : ""}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-sm text-red-500">{errors.password}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                value={formData.confirmPassword}
                                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                                placeholder="Confirm new password"
                                className={errors.confirmPassword ? "border-red-500" : ""}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                        )}
                    </div>

                    <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-600 font-medium mb-2">Password must contain:</p>
                        <ul className="text-xs text-gray-500 space-y-1">
                            <li>• At least 8 characters</li>
                            <li>• One uppercase letter</li>
                            <li>• One lowercase letter</li>
                            <li>• One number</li>
                        </ul>
                    </div>

                    <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loading || !!errors.password || !!errors.confirmPassword}
                    >
                        {loading ? "Resetting..." : "Reset Password"}
                    </Button>

                    <div className="text-center text-sm">
                        <Link 
                            to="/login" 
                            className="text-purple-600 hover:text-purple-700 font-medium"
                        >
                            Back to Login
                        </Link>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default ResetPassword;