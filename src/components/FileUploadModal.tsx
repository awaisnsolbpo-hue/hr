import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FileUploadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jobId?: string;
}

interface UploadFile {
    file: File;
    progress: number;
    status: "pending" | "uploading" | "success" | "error";
    error?: string;
}

export const FileUploadModal = ({ open, onOpenChange, jobId }: FileUploadModalProps) => {
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const { toast } = useToast();

    const validateFiles = (fileList: FileList): File[] => {
        const validFiles: File[] = [];
        const errors: string[] = [];

        const fileArray = Array.from(fileList);
        const hasZip = fileArray.some(f => f.name.toLowerCase().endsWith('.zip'));

        if (hasZip && fileArray.length > 1) {
            errors.push("Only one ZIP file can be uploaded at a time");
            toast({ title: "Error", description: errors[0], variant: "destructive" });
            return [];
        }

        if (hasZip && fileArray[0].size > 10 * 1024 * 1024) {
            errors.push("ZIP file must be smaller than 10MB");
            toast({ title: "Error", description: errors[0], variant: "destructive" });
            return [];
        }

        if (!hasZip) {
            const pdfFiles = fileArray.filter(f =>
                f.name.toLowerCase().endsWith('.pdf')
            );

            const invalidFiles = fileArray.filter(f =>
                !f.name.toLowerCase().endsWith('.pdf')
            );

            if (invalidFiles.length > 0) {
                errors.push(`Only PDF files are allowed. Invalid: ${invalidFiles.map(f => f.name).join(', ')}`);
            }

            if (pdfFiles.length > 10) {
                errors.push("Maximum 10 PDF files allowed");
            }

            pdfFiles.forEach(file => {
                if (file.size > 10 * 1024 * 1024) {
                    errors.push(`${file.name} is larger than 10MB`);
                } else {
                    validFiles.push(file);
                }
            });
        } else {
            validFiles.push(fileArray[0]);
        }

        if (errors.length > 0) {
            toast({ title: "Validation Errors", description: errors.join(", "), variant: "destructive" });
        }

        return validFiles;
    };

    const handleFiles = (fileList: FileList) => {
        const validFiles = validateFiles(fileList);
        const uploadFiles: UploadFile[] = validFiles.map(file => ({
            file,
            progress: 0,
            status: "pending"
        }));
        setFiles(uploadFiles);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFiles(e.target.files);
        }
    };

    const uploadFile = async (uploadFile: UploadFile, index: number) => {
        const { file } = uploadFile;

        setFiles(prev => prev.map((f, i) =>
            i === index ? { ...f, status: "uploading" } : f
        ));

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.error("Session error:", sessionError);
                throw new Error("Authentication error. Please try logging out and back in.");
            }

            if (!session || !session.user) {
                console.error("No active session found");
                throw new Error("Please log in to upload files");
            }

            const user = session.user;

            // NEW STRUCTURE: user_id/manual-upload/filename
            // Sanitize filename to remove spaces and special characters
            const sanitizedFileName = file.name
                .replace(/\s+/g, '_')  // Replace spaces with underscores
                .replace(/[^a-zA-Z0-9._-]/g, ''); // Remove special characters except . _ -
            
            const fileName = `${user.id}/manual-upload/${Date.now()}_${sanitizedFileName}`;

            const progressInterval = setInterval(() => {
                setFiles(prev => prev.map((f, i) =>
                    i === index && f.progress < 90 ? { ...f, progress: f.progress + 10 } : f
                ));
            }, 100);

            const { error: uploadError } = await supabase.storage
                .from('candidate-cvs')
                .upload(fileName, file);

            clearInterval(progressInterval);

            if (uploadError) {
                console.error("Storage upload error:", uploadError);
                throw new Error(`Upload failed: ${uploadError.message}`);
            }

            const { data: urlData } = supabase.storage
                .from('candidate-cvs')
                .getPublicUrl(fileName);

            const candidateName = file.name
                .replace(/\.[^/.]+$/, '')
                .replace(/^\d+_/, '');

            // FIXED: Save to Client table with interview_status instead of status
            const clientData: any = {
                user_id: user.id,
                name: candidateName,
                email: '', // Will be updated later
                cv_file_url: urlData.publicUrl,
                interview_status: 'Pending', // Changed from status: 'pending'
            };

            if (jobId) {
                clientData.job_id = jobId;
            }

            const { error: dbError } = await supabase
                .from('Client')
                .insert(clientData);

            if (dbError) {
                console.error("Database save error:", dbError);
                throw new Error(`Failed to save candidate: ${dbError.message}`);
            }

            setFiles(prev => prev.map((f, i) =>
                i === index ? { ...f, status: "success", progress: 100 } : f
            ));

        } catch (error: any) {
            console.error("Upload error:", error);
            setFiles(prev => prev.map((f, i) =>
                i === index ? {
                    ...f,
                    status: "error",
                    error: error.message || "Upload failed",
                    progress: 0
                } : f
            ));
        }
    };

    const handleUpload = async () => {
        for (let i = 0; i < files.length; i++) {
            if (files[i].status === "pending") {
                await uploadFile(files[i], i);
            }
        }

        const successCount = files.filter(f => f.status === "success").length;
        const errorCount = files.filter(f => f.status === "error").length;

        if (successCount > 0) {
            toast({
                title: "Upload Complete!",
                description: `${successCount} file(s) uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
            });
        }

        if (errorCount === 0 && successCount > 0) {
            setTimeout(() => {
                onOpenChange(false);
                setFiles([]);
            }, 2000);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const retryFailed = () => {
        setFiles(prev => prev.map(f =>
            f.status === "error" ? { ...f, status: "pending", error: undefined, progress: 0 } : f
        ));
    };

    const hasErrors = files.some(f => f.status === "error");
    const isUploading = files.some(f => f.status === "uploading");
    const allSuccess = files.length > 0 && files.every(f => f.status === "success");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Upload Candidate CVs</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <div
                        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary"
                            }`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            <strong>ZIP or PDF only</strong> - Max 10 PDF files (10MB each) or 1 ZIP file (10MB)
                        </p>
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.zip"
                            onChange={handleFileInput}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload">
                            <Button variant="outline" asChild>
                                <span>Browse Files</span>
                            </Button>
                        </label>
                    </div>

                    {files.length > 0 && (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {files.map((uploadFile, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-4 border rounded-lg bg-card"
                                >
                                    <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{uploadFile.file.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                        {uploadFile.status === "uploading" && (
                                            <Progress value={uploadFile.progress} className="mt-2" />
                                        )}
                                        {uploadFile.status === "error" && (
                                            <p className="text-sm text-destructive mt-1">{uploadFile.error}</p>
                                        )}
                                    </div>
                                    {uploadFile.status === "success" && (
                                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                    )}
                                    {uploadFile.status === "error" && (
                                        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                                    )}
                                    {uploadFile.status === "pending" && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeFile(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {files.length > 0 && !allSuccess && (
                        <div className="flex gap-2">
                            {hasErrors && (
                                <Button
                                    onClick={retryFailed}
                                    variant="outline"
                                    disabled={isUploading}
                                    className="flex-1"
                                >
                                    Retry Failed
                                </Button>
                            )}
                            <Button
                                onClick={handleUpload}
                                className="flex-1"
                                size="lg"
                                disabled={isUploading}
                            >
                                {isUploading ? "Uploading..." : `Upload ${files.filter(f => f.status === "pending").length} File${files.filter(f => f.status === "pending").length !== 1 ? "s" : ""}`}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};