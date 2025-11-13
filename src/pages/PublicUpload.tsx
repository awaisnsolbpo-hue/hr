import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PublicUpload = () => {
  const { linkCode } = useParams();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [linkValid, setLinkValid] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Check if link is valid and active when component mounts
  useEffect(() => {
    const checkLinkValidity = async () => {
      if (!linkCode) {
        setLinkValid(false);
        return;
      }

      try {
        // Query all relevant columns from upload_links table
        const { data: linkData, error } = await supabase
          .from('upload_links')
          .select('is_active, is_expired, max_uploads, current_uploads, upload_count, expires_at')
          .eq('link_code', linkCode)
          .single();

        if (error || !linkData) {
          console.error("Link lookup error:", error);
          setLinkValid(false);
          toast({
            title: "Invalid Link",
            description: "This upload link does not exist",
            variant: "destructive",
          });
          return;
        }

        console.log("Link data:", linkData); // Debug log

        // Check if link is expired by date
        if (linkData.expires_at) {
          const expiryDate = new Date(linkData.expires_at);
          const now = new Date();
          if (now > expiryDate) {
            setLinkValid(false);
            toast({
              title: "Link Expired",
              description: "This upload link has expired",
              variant: "destructive",
            });
            return;
          }
        }

        // Check if link is marked as expired
        if (linkData.is_expired === true) {
          setLinkValid(false);
          toast({
            title: "Link Expired",
            description: "This upload link has expired",
            variant: "destructive",
          });
          return;
        }

        // Check if link is inactive
        if (linkData.is_active === false) {
          setLinkValid(false);
          toast({
            title: "Link Inactive",
            description: "This upload link is no longer active",
            variant: "destructive",
          });
          return;
        }

        // Check max uploads - use whichever column exists
        const currentCount = linkData.current_uploads ?? linkData.upload_count ?? 0;
        if (linkData.max_uploads && currentCount >= linkData.max_uploads) {
          setLinkValid(false);
          toast({
            title: "Upload Limit Reached",
            description: "This upload link has reached its maximum number of uploads",
            variant: "destructive",
          });
          return;
        }

        setLinkValid(true);
      } catch (error) {
        console.error("Error checking link validity:", error);
        setLinkValid(false);
      }
    };

    checkLinkValidity();
  }, [linkCode, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().match(/\.(pdf|docx)$/)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or DOCX file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File must be smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Double-check link is still active before submitting
    const { data: linkCheck } = await supabase
      .from('upload_links')
      .select('is_active, is_expired, max_uploads, current_uploads, upload_count')
      .eq('link_code', linkCode)
      .single();

    if (!linkCheck) {
      toast({
        title: "Link Not Found",
        description: "This upload link could not be found",
        variant: "destructive",
      });
      setLinkValid(false);
      return;
    }

    if (linkCheck.is_active === false || linkCheck.is_expired === true) {
      toast({
        title: "Link No Longer Active",
        description: "This upload link has been deactivated or expired",
        variant: "destructive",
      });
      setLinkValid(false);
      return;
    }

    const currentCount = linkCheck.current_uploads ?? linkCheck.upload_count ?? 0;
    if (linkCheck.max_uploads && currentCount >= linkCheck.max_uploads) {
      toast({
        title: "Upload Limit Reached",
        description: "This upload link has reached its maximum number of uploads",
        variant: "destructive",
      });
      setLinkValid(false);
      return;
    }

    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a CV file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name || !formData.email) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload file to storage
      const fileName = `public/${linkCode}/${Date.now()}_${selectedFile.name}`;
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 100);

      const { error: uploadError } = await supabase.storage
        .from('candidate-cvs')
        .upload(fileName, selectedFile);

      clearInterval(progressInterval);
      setUploadProgress(95);
      
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('candidate-cvs')
        .getPublicUrl(fileName);

      // Get the upload link details
      const { data: linkData, error: linkError } = await supabase
        .from('upload_links')
        .select('job_id, user_id, current_uploads, upload_count')
        .eq('link_code', linkCode)
        .single();

      if (linkError) {
        console.warn("Could not fetch link details:", linkError);
      }

      // Save candidate data
      const candidateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        cv_file_url: urlData.publicUrl,
        interview_status: 'Pending',
      };

      if (linkData?.job_id) {
        candidateData.job_id = linkData.job_id;
      }
      if (linkData?.user_id) {
        candidateData.user_id = linkData.user_id;
      }

      const { error: dbError } = await supabase
        .from('Client')
        .insert(candidateData);

      if (dbError) {
        console.error("Database save error:", dbError);
        console.error("Candidate data:", candidateData);
        throw new Error(`Failed to save candidate: ${dbError.message}`);
      }

      // Update upload count - handle both column names
      if (linkCode && linkData) {
        const updateData: any = {};
        
        // Check which column exists and update accordingly
        if ('current_uploads' in linkData && linkData.current_uploads !== null) {
          updateData.current_uploads = (linkData.current_uploads || 0) + 1;
        }
        
        if ('upload_count' in linkData && linkData.upload_count !== null) {
          updateData.upload_count = (linkData.upload_count || 0) + 1;
        }
        
        // If neither column has a value, update both
        if (Object.keys(updateData).length === 0) {
          updateData.current_uploads = 1;
          updateData.upload_count = 1;
        }

        console.log("Updating upload count:", updateData); // Debug log

        const { error: updateError } = await supabase
          .from('upload_links')
          .update(updateData)
          .eq('link_code', linkCode);

        if (updateError) {
          console.error("Error updating upload count:", updateError);
        }
      }

      setUploadProgress(100);
      setUploadSuccess(true);
      toast({
        title: "Success!",
        description: "Your CV has been uploaded successfully",
      });

      // Reset form
      setTimeout(() => {
        setFormData({ name: "", email: "", phone: "" });
        setSelectedFile(null);
        setUploadSuccess(false);
        setUploadProgress(0);
      }, 3000);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your CV",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Show loading state while checking link validity
  if (linkValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-elegant">
          <CardContent className="py-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Verifying upload link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if link is invalid or inactive
  if (linkValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-elegant">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 rounded-xl bg-destructive/10">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-3xl">Invalid Link</CardTitle>
            <CardDescription className="text-base">
              This upload link is either invalid or no longer active. Please contact the organization for a new link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-elegant animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl">Upload Your CV</CardTitle>
          <CardDescription className="text-base">
            Submit your application by uploading your CV and filling in your details
          </CardDescription>
        </CardHeader>

        <CardContent>
          {uploadSuccess ? (
            <div className="text-center py-12 space-y-4 animate-scale-in">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-2xl font-semibold">Successfully Submitted!</h3>
              <p className="text-muted-foreground">
                Thank you for your application. We'll be in touch soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cv-file">CV File (PDF or DOCX) *</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <input
                    id="cv-file"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                    required
                  />
                  <label htmlFor="cv-file">
                    <Button type="button" variant="outline" asChild>
                      <span>
                        {selectedFile ? selectedFile.name : "Choose File"}
                      </span>
                    </Button>
                  </label>
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-center text-muted-foreground">
                    Uploading... {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Submit Application"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicUpload;