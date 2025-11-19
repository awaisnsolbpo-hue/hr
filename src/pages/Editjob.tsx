import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, ArrowLeft, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface JobFormData {
  title: string;
  description: string;
  city: string;
  country: string;
  salary_range: string;
  location_type: string;
  job_level: string;
  status: string;
  required_skills: string[];
  preferred_skills: string[];
}

const EditJob = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    description: "",
    city: "",
    country: "",
    salary_range: "",
    location_type: "",
    job_level: "",
    status: "draft",
    required_skills: [],
    preferred_skills: [],
  });
  const [requiredSkillsInput, setRequiredSkillsInput] = useState("");
  const [preferredSkillsInput, setPreferredSkillsInput] = useState("");

  useEffect(() => {
    if (jobId) {
      fetchJobData();
    }
  }, [jobId]);

  const fetchJobData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Error",
          description: "Job not found or you don't have permission to edit it.",
          variant: "destructive",
        });
        navigate("/jobs");
        return;
      }

      setFormData({
        title: data.title || "",
        description: data.description || "",
        city: data.city || "",
        country: data.country || "",
        salary_range: data.salary_range || "",
        location_type: data.location_type || "",
        job_level: data.job_level || "",
        status: data.status || "draft",
        required_skills: data.required_skills || [],
        preferred_skills: data.preferred_skills || [],
      });

      // Set skills input fields
      if (data.required_skills && data.required_skills.length > 0) {
        setRequiredSkillsInput(data.required_skills.join(", "));
      }
      if (data.preferred_skills && data.preferred_skills.length > 0) {
        setPreferredSkillsInput(data.preferred_skills.join(", "));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Job title is required.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Parse skills from comma-separated strings
      const requiredSkills = requiredSkillsInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const preferredSkills = preferredSkillsInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const { error } = await supabase
        .from("jobs")
        .update({
          title: formData.title.trim(),
          description: formData.description.trim(),
          city: formData.city.trim(),
          country: formData.country.trim(),
          salary_range: formData.salary_range.trim(),
          location_type: formData.location_type,
          job_level: formData.job_level,
          status: formData.status,
          required_skills: requiredSkills.length > 0 ? requiredSkills : null,
          preferred_skills: preferredSkills.length > 0 ? preferredSkills : null,
        })
        .eq("id", jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job updated successfully!",
      });

      navigate(`/jobs/${jobId}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update job.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gradient-subtle)] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-gradient">AI Hiring</span>
            </Link>

            <Button
              variant="ghost"
              size="default"
              onClick={() => navigate(`/jobs/${jobId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Job
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Edit Job</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Job Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Job Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g. Senior Software Engineer"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Job Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe the role, responsibilities, and requirements..."
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={6}
                  />
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="e.g. San Francisco"
                      value={formData.city}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      placeholder="e.g. United States"
                      value={formData.country}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Salary Range */}
                <div className="space-y-2">
                  <Label htmlFor="salary_range">Salary Range</Label>
                  <Input
                    id="salary_range"
                    name="salary_range"
                    placeholder="e.g. $80,000 - $120,000"
                    value={formData.salary_range}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Location Type & Job Level */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location_type">Location Type</Label>
                    <Select
                      value={formData.location_type}
                      onValueChange={(value) =>
                        handleSelectChange("location_type", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="on-site">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="job_level">Job Level</Label>
                    <Select
                      value={formData.job_level}
                      onValueChange={(value) =>
                        handleSelectChange("job_level", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select job level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Entry Level</SelectItem>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="mid">Mid Level</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="director">Director</SelectItem>
                        <SelectItem value="executive">Executive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="required_skills">
                      Required Skills (comma-separated)
                    </Label>
                    <Input
                      id="required_skills"
                      placeholder="e.g. JavaScript, React, Node.js"
                      value={requiredSkillsInput}
                      onChange={(e) => setRequiredSkillsInput(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate skills with commas
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferred_skills">
                      Preferred Skills (comma-separated)
                    </Label>
                    <Input
                      id="preferred_skills"
                      placeholder="e.g. TypeScript, GraphQL, Docker"
                      value={preferredSkillsInput}
                      onChange={(e) => setPreferredSkillsInput(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate skills with commas
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Job Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Job
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => navigate(`/jobs/${jobId}`)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default EditJob;