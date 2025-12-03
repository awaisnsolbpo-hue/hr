import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, User, Building2, Briefcase, MessageSquare } from "lucide-react";

interface BookDemoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const BookDemoDialog = ({
    open,
    onOpenChange,
    onSuccess
}: BookDemoDialogProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        company: "",
        role: "",
        about_me: "", // User tells about themselves instead of requirements
        meeting_date: "",
        meeting_time: "",
        meeting_duration: 30,
        additional_notes: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate required fields
            if (!formData.name || !formData.email || !formData.company || !formData.role) {
                throw new Error("Please fill in all required fields");
            }

            // Validate date and time if provided
            if (formData.meeting_date && formData.meeting_time) {
                const meetingDateTime = new Date(`${formData.meeting_date}T${formData.meeting_time}`);
                
                // Check if date is in the future
                if (meetingDateTime <= new Date()) {
                    throw new Error("Meeting date must be in the future");
                }
            }

            // Prepare demo booking data for demo_bookings table
            const meetingDateTime = formData.meeting_date && formData.meeting_time 
                ? new Date(`${formData.meeting_date}T${formData.meeting_time}`).toISOString()
                : null;

            const demoBookingData: any = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone || null,
                company: formData.company,
                role: formData.role,
                about_me: formData.about_me,
                additional_notes: formData.additional_notes || null,
                meeting_date: meetingDateTime,
                meeting_duration: formData.meeting_duration,
                status: "pending",
            };

            // Check if user is logged in (optional - can link to account later)
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                demoBookingData.user_id = user.id;
            }

            // Insert into demo_bookings table
            const { data, error } = await supabase
                .from("demo_bookings" as any)
                .insert(demoBookingData)
                .select()
                .single();

            if (error) {
                console.error("Error inserting demo booking:", error);
                throw new Error("Failed to submit demo request. Please try again.");
            }

            toast({
                title: "Demo Request Submitted! 🎉",
                description: formData.meeting_date && formData.meeting_time
                    ? `Your demo request has been submitted. We'll confirm the meeting for ${new Date(`${formData.meeting_date}T${formData.meeting_time}`).toLocaleDateString()} at ${formData.meeting_time}`
                    : "Your demo request has been submitted. Our team will contact you soon to schedule a convenient time.",
            });

            // Reset form
            setFormData({
                name: "",
                email: "",
                phone: "",
                company: "",
                role: "",
                about_me: "",
                meeting_date: "",
                meeting_time: "",
                meeting_duration: 30,
                additional_notes: "",
            });

            // Close dialog
            onOpenChange(false);

            // Call success callback
            if (onSuccess) {
                onSuccess();
            }

        } catch (error: any) {
            console.error("Error submitting demo request:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to submit demo request. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Get minimum date (today)
    const getMinDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto p-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-b px-6 pt-6 pb-4">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/20">
                                <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            Book a Demo
                        </DialogTitle>
                        <DialogDescription className="text-sm mt-2">
                            Schedule a personalized demo tailored to your needs
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                    {/* Personal Information Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-2 border-b">
                            <User className="h-4 w-4 text-primary" />
                            Personal Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-medium">
                                    Full Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">
                                    Email Address <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    placeholder="john@company.com"
                                    value={formData.email}
                                    onChange={(e) => handleChange("email", e.target.value)}
                                    className="h-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-sm font-medium">
                                Phone Number <span className="text-xs text-muted-foreground">(Optional)</span>
                            </Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+1 (555) 123-4567"
                                value={formData.phone}
                                onChange={(e) => handleChange("phone", e.target.value)}
                                className="h-10"
                            />
                        </div>
                    </div>

                    {/* Company Information Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-2 border-b">
                            <Building2 className="h-4 w-4 text-primary" />
                            Company Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="company" className="text-sm font-medium">
                                    Company <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="company"
                                    type="text"
                                    required
                                    placeholder="Acme Corporation"
                                    value={formData.company}
                                    onChange={(e) => handleChange("company", e.target.value)}
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role" className="text-sm font-medium">
                                    Your Role <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="role"
                                    type="text"
                                    required
                                    placeholder="HR Manager"
                                    value={formData.role}
                                    onChange={(e) => handleChange("role", e.target.value)}
                                    className="h-10"
                                />
                            </div>
                        </div>
                    </div>

                    {/* About You Section */}
                    <div className="space-y-2">
                        <Label htmlFor="about_me" className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            Tell Us About Yourself <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="about_me"
                            placeholder="Share your hiring challenges, team size, and what you're looking for in a solution..."
                            value={formData.about_me}
                            onChange={(e) => handleChange("about_me", e.target.value)}
                            rows={4}
                            required
                            className="resize-none text-sm"
                        />
                    </div>

                    {/* Meeting Preferences Section */}
                    <div className="space-y-4 pt-2">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-2 border-b">
                            <Clock className="h-4 w-4 text-primary" />
                            Meeting Preferences <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="meeting_date" className="text-sm font-medium">
                                    Preferred Date
                                </Label>
                                <Input
                                    id="meeting_date"
                                    type="date"
                                    min={getMinDate()}
                                    value={formData.meeting_date}
                                    onChange={(e) => handleChange("meeting_date", e.target.value)}
                                    className="h-10"
                                />
                            </div>
                            {formData.meeting_date && (
                                <div className="space-y-2">
                                    <Label htmlFor="meeting_time" className="text-sm font-medium">
                                        Preferred Time
                                    </Label>
                                    <Input
                                        id="meeting_time"
                                        type="time"
                                        value={formData.meeting_time}
                                        onChange={(e) => handleChange("meeting_time", e.target.value)}
                                        className="h-10"
                                    />
                                </div>
                            )}
                        </div>
                        {formData.meeting_date && (
                            <div className="space-y-2">
                                <Label htmlFor="meeting_duration" className="text-sm font-medium">
                                    Duration
                                </Label>
                                <select
                                    id="meeting_duration"
                                    value={formData.meeting_duration}
                                    onChange={(e) => handleChange("meeting_duration", parseInt(e.target.value))}
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                >
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>60 minutes</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Additional Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="additional_notes" className="text-sm font-medium">
                            Additional Notes <span className="text-xs text-muted-foreground">(Optional)</span>
                        </Label>
                        <Textarea
                            id="additional_notes"
                            placeholder="Anything else you'd like us to know..."
                            value={formData.additional_notes}
                            onChange={(e) => handleChange("additional_notes", e.target.value)}
                            rows={2}
                            className="resize-none text-sm"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                            disabled={loading}
                        >
                            {loading ? "Submitting..." : "Request Demo"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default BookDemoDialog;

