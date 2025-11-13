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
import { Calendar, Clock, Video } from "lucide-react";

interface Candidate {
    id: string;
    name: string;
    email: string;
    phone?: string;
    cv_file_url?: string;
    ai_score?: number;
    job_id?: string;
    source: string;
}

interface ScheduleMeetingDialogProps {
    candidate: Candidate;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const ScheduleMeetingDialog = ({
    candidate,
    open,
    onOpenChange,
    onSuccess
}: ScheduleMeetingDialogProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        meeting_date: "",
        meeting_time: "",
        meeting_duration: 30,
        meeting_id: "", // Changed from zoom_link to meeting_id
        meeting_instructions: "Camera & Mic must be enabled",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("User not authenticated");
            }

            // Validate date and time
            if (!formData.meeting_date || !formData.meeting_time) {
                throw new Error("Please select both date and time");
            }

            // Combine date and time into a single timestamp
            const meetingDateTime = new Date(`${formData.meeting_date}T${formData.meeting_time}`);

            // Check if date is in the future
            if (meetingDateTime <= new Date()) {
                throw new Error("Meeting date must be in the future");
            }

            // Prepare meeting data
            const meetingData = {
                user_id: user.id,
                candidate_id: candidate.id,
                candidate_name: candidate.name,
                candidate_email: candidate.email,
                candidate_phone: candidate.phone || null,
                meeting_date: meetingDateTime.toISOString(),
                meeting_duration: formData.meeting_duration,
                meeting_status: "scheduled",
                zoom_link: formData.meeting_id || null, // Store meeting_id in zoom_link field
                meeting_password: null, // Always null - password field removed
                meeting_instructions: formData.meeting_instructions || null,
                job_id: candidate.job_id || null,
                ai_score: candidate.ai_score || null,
                cv_file_url: candidate.cv_file_url || null,
            };

            // Insert into database
            const { data, error } = await supabase
                .from("scheduled_meetings")
                .insert(meetingData)
                .select()
                .single();

            if (error) throw error;

            toast({
                title: "Meeting Scheduled! 🎉",
                description: `Meeting with ${candidate.name} has been scheduled for ${meetingDateTime.toLocaleDateString()} at ${formData.meeting_time}`,
            });

            // Reset form
            setFormData({
                meeting_date: "",
                meeting_time: "",
                meeting_duration: 30,
                meeting_id: "",
                meeting_instructions: "Camera & Mic must be enabled",
            });

            // Close dialog
            onOpenChange(false);

            // Call success callback
            if (onSuccess) {
                onSuccess();
            }

        } catch (error: any) {
            console.error("Error scheduling meeting:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to schedule meeting",
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

    // Get minimum date (tomorrow)
    const getMinDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Schedule Interview Meeting
                    </DialogTitle>
                    <DialogDescription>
                        Schedule an interview meeting with {candidate.name}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Candidate Info */}
                    <div className="p-3 bg-muted rounded-lg space-y-1">
                        <p className="font-medium">{candidate.name}</p>
                        <p className="text-sm text-muted-foreground">{candidate.email}</p>
                        {candidate.phone && (
                            <p className="text-sm text-muted-foreground">{candidate.phone}</p>
                        )}
                        {candidate.ai_score && (
                            <p className="text-sm font-medium text-primary">
                                AI Score: {candidate.ai_score}%
                            </p>
                        )}
                    </div>

                    {/* Meeting Date */}
                    <div className="space-y-2">
                        <Label htmlFor="meeting_date" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Meeting Date *
                        </Label>
                        <Input
                            id="meeting_date"
                            type="date"
                            required
                            min={getMinDate()}
                            value={formData.meeting_date}
                            onChange={(e) => handleChange("meeting_date", e.target.value)}
                        />
                    </div>

                    {/* Meeting Time */}
                    <div className="space-y-2">
                        <Label htmlFor="meeting_time" className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Meeting Time *
                        </Label>
                        <Input
                            id="meeting_time"
                            type="time"
                            required
                            value={formData.meeting_time}
                            onChange={(e) => handleChange("meeting_time", e.target.value)}
                        />
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                        <Label htmlFor="meeting_duration">
                            Duration (minutes)
                        </Label>
                        <select
                            id="meeting_duration"
                            value={formData.meeting_duration}
                            onChange={(e) => handleChange("meeting_duration", parseInt(e.target.value))}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                        >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>60 minutes</option>
                            <option value={90}>90 minutes</option>
                        </select>
                    </div>

                    {/* Meeting ID - CHANGED FROM ZOOM LINK */}
                    <div className="space-y-2">
                        <Label htmlFor="meeting_id" className="flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            Meeting ID *
                        </Label>
                        <Input
                            id="meeting_id"
                            type="text"
                            placeholder="e.g., nsolbpo.usa"
                            value={formData.meeting_id}
                            onChange={(e) => handleChange("meeting_id", e.target.value)}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Enter your company meeting ID (e.g., nsolbpo.usa, team.meeting, etc.)
                        </p>
                    </div>

                    {/* MEETING PASSWORD FIELD REMOVED */}

                    {/* Instructions */}
                    <div className="space-y-2">
                        <Label htmlFor="meeting_instructions">
                            Instructions for Candidate
                        </Label>
                        <Textarea
                            id="meeting_instructions"
                            placeholder="Any special instructions..."
                            value={formData.meeting_instructions}
                            onChange={(e) => handleChange("meeting_instructions", e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
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
                            className="flex-1"
                            disabled={loading}
                        >
                            {loading ? "Scheduling..." : "Schedule Meeting"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ScheduleMeetingDialog;