import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { createVapiClient, type VapiSessionContext } from "@/lib/vapiClient";
import { type CandidateRecord } from "@/lib/interviewTypes";
import { useToast } from "@/hooks/use-toast";
import InterviewBadge from "@/components/InterviewBadge";
import { Video, Mic, VideoOff, MicOff, User, Sparkles, Volume2 } from "lucide-react";

const InterviewRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const email = searchParams.get("email");

  // Get Supabase credentials for sync updates on page close
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const [candidate, setCandidate] = useState<CandidateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [interviewActive, setInterviewActive] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [vapiClient, setVapiClient] = useState<any>(null);
  const [vapiInitialized, setVapiInitialized] = useState(false);
  const [vapiReady, setVapiReady] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ text: string; timestamp: string; speaker: 'AI' | 'HUMAN' }>>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState<{ text: string; speaker: 'AI' | 'HUMAN'; startTime: string } | null>(null);
  const [transcriptTimeout, setTranscriptTimeout] = useState<NodeJS.Timeout | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingChunks, setRecordingChunks] = useState<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [wakeLock, setWakeLock] = useState<any>(null);

  // Ref for transcript container to enable auto-scroll
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const isEndingInterview = useRef(false);
  const audioMonitorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll transcript to bottom when new entries are added
  useEffect(() => {
    if (transcriptEndRef.current && transcriptContainerRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [transcript]);

  // Handle page refresh/close - mark interview as completed if started
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (interviewStarted && candidate && !isEndingInterview.current) {
        // Show confirmation dialog
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your interview will be marked as completed.';

        // Use synchronous XHR request for guaranteed delivery on page unload
        if (!supabaseUrl || !supabaseKey) {
          console.error('Supabase credentials not available');
          return;
        }

        const xhr = new XMLHttpRequest();
        xhr.open('PATCH', `${supabaseUrl}/rest/v1/Qualified_For_Final_Interview?id=eq.${candidate.id}`, false); // false = synchronous
        xhr.setRequestHeader('apikey', supabaseKey);
        xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Prefer', 'return=minimal');

        try {
          xhr.send(JSON.stringify({ interview_status: 'Completed' }));
          console.log('Interview marked as completed (beforeunload)');
        } catch (error) {
          console.error('Failed to update interview status on beforeunload:', error);
        }
      }
    };

    const handleUnload = () => {
      if (interviewStarted && candidate && !isEndingInterview.current) {
        // Use sendBeacon as last resort (non-blocking, guaranteed to send)
        if (!supabaseUrl || !supabaseKey) {
          console.error('Supabase credentials not available');
          return;
        }

        const url = `${supabaseUrl}/rest/v1/Qualified_For_Final_Interview?id=eq.${candidate.id}`;

        // Create proper request for sendBeacon with headers
        // Note: sendBeacon doesn't support custom headers, so we use FormData approach
        const formData = new FormData();
        formData.append('interview_status', 'Completed');

        try {
          // Fallback to fetch with keepalive
          fetch(url, {
            method: 'PATCH',
            keepalive: true, // Important: ensures request completes even after page closes
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ interview_status: 'Completed' })
          }).catch(err => console.error('Unload update failed:', err));

          console.log('Interview marked as completed (unload - keepalive)');
        } catch (error) {
          console.error('Failed to update interview status on unload:', error);
        }
      }
    };

    // Handle page visibility changes to maintain audio connection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("Page hidden - maintaining audio connection");
        // Keep audio tracks alive by checking their state
        if (mediaStream && interviewActive) {
          const audioTrack = mediaStream.getAudioTracks()[0];
          if (audioTrack && audioTrack.readyState === 'live') {
            // Force track to stay active
            audioTrack.enabled = true;
          }
        }
      } else {
        console.log("Page visible - verifying audio connection");
        // When page becomes visible, verify audio is still working
        if (mediaStream && interviewActive) {
          const audioTrack = mediaStream.getAudioTracks()[0];
          if (audioTrack && audioTrack.readyState !== 'live') {
            console.error("Audio track not live after visibility change");
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [interviewStarted, candidate, interviewActive, mediaStream]);

  // Helper function to mark interview as completed
  const markInterviewAsCompleted = async (candidateId: string, isRefresh: boolean = false) => {
    try {
      const { error } = await supabase
        .from('Qualified_For_Final_Interview' as any)
        .update({ interview_status: 'Completed' })
        .eq('id', candidateId);

      if (error) {
        console.error("Error marking interview as completed:", error);
      } else {
        console.log("Interview marked as completed", isRefresh ? "(due to refresh/close)" : "");
      }
    } catch (error) {
      console.error("Error in markInterviewAsCompleted:", error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear audio monitor interval
      if (audioMonitorIntervalRef.current) {
        clearInterval(audioMonitorIntervalRef.current);
      }

      // Cleanup all media streams when component unmounts
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      if (vapiClient) {
        try {
          vapiClient.stop();
        } catch (error) {
          console.error("Error stopping Vapi client:", error);
        }
        setVapiClient(null);
      }
      if (transcriptTimeout) {
        clearTimeout(transcriptTimeout);
      }
      setVapiInitialized(false);
      setVapiReady(false);
    };
  }, []);

  useEffect(() => {
    if (!email) {
      navigate("/interview-landing");
      return;
    }

    const fetchCandidate = async () => {
      try {
        // Fetch ALL rows with matching email, ordered by creation/insertion order
        const { data, error } = await supabase
          .from("Qualified_For_Final_Interview" as any)
          .select('id, name, email, "Question Ask by Client", "AI Generated Question", interview_status, created_at')
          .eq("email", email)
          .order('created_at', { ascending: true }); // Order by creation time to get sequence

        if (error) {
          console.error("Error fetching candidate:", error);
          toast({
            title: "Error",
            description: "Failed to load interview details.",
            variant: "destructive",
          });
          navigate("/interview-landing");
          return;
        }

        if (!data || data.length === 0) {
          toast({
            title: "Not Found",
            description: "No interview scheduled for this email.",
            variant: "destructive",
          });
          navigate("/interview-landing");
          return;
        }

        // Log all matching records for debugging
        console.log(`Found ${data.length} interview record(s) for email: ${email}`);
        data.forEach((record: any, index: number) => {
          console.log(`Record ${index + 1}:`, {
            id: record.id,
            status: record.interview_status,
            created_at: record.created_at
          });
        });

        // Find the first interview that is "Scheduled" (not completed)
        let candidateData = data.find((record: any) => record.interview_status === "Scheduled");

        // If no scheduled interview found, check if all are completed
        if (!candidateData) {
          const allCompleted = data.every((record: any) => record.interview_status === "Completed");

          if (allCompleted) {
            toast({
              title: "All Interviews Completed",
              description: "All interviews for this email have been completed.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Interview Not Available",
              description: "No scheduled interview found for this email.",
              variant: "destructive",
            });
          }
          navigate("/interview-landing");
          return;
        }

        // Log the selected interview
        console.log("Selected Interview Record:", {
          id: candidateData.id,
          status: candidateData.interview_status,
          name: candidateData.name
        });

        // Log extracted questions for debugging
        console.log("Extracted Questions from Database:");
        console.log("Client Questions:", candidateData["Question Ask by Client"]);
        console.log("AI Generated Questions:", candidateData["AI Generated Question"]);

        setCandidate(candidateData);
      } catch (err) {
        console.error("Unexpected error:", err);
        navigate("/interview-landing");
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [email, navigate, toast]);

  // Recording duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const requestMediaAccess = async (isRetry: boolean = false): Promise<MediaStream | null> => {
    try {
      // Stop any existing streams first
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }

      setMediaError(null);

      // Request video only first
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // Then request audio with more persistent settings
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1 // Mono is more stable
        }
      });

      // Combine both streams
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);

      // Monitor audio track and attempt automatic recovery
      const audioTrack = combinedStream.getAudioTracks()[0];
      if (audioTrack) {
        // Keep track settings to prevent unwanted stops
        audioTrack.enabled = true;

        audioTrack.onended = async () => {
          console.warn("Audio track ended unexpectedly - attempting recovery");

          if (interviewActive && !isEndingInterview.current) {
            // Don't show error immediately, try to recover first
            try {
              // Try to get new audio track
              const newAudioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                  sampleRate: 48000,
                  channelCount: 1
                }
              });

              const newAudioTrack = newAudioStream.getAudioTracks()[0];

              if (newAudioTrack && mediaStream) {
                // Remove old audio track
                const oldAudioTrack = mediaStream.getAudioTracks()[0];
                if (oldAudioTrack) {
                  mediaStream.removeTrack(oldAudioTrack);
                  oldAudioTrack.stop();
                }

                // Add new audio track
                mediaStream.addTrack(newAudioTrack);
                console.log("Audio track recovered successfully");

                toast({
                  title: "Audio Reconnected",
                  description: "Microphone connection restored.",
                });
              }
            } catch (error) {
              console.error("Failed to recover audio track:", error);
              toast({
                title: "Audio Lost",
                description: "Microphone disconnected. Please check your audio device.",
                variant: "destructive",
              });
            }
          }
        };

        // Prevent audio track from being muted by browser
        Object.defineProperty(audioTrack, 'enabled', {
          get: function () { return this._enabled !== false; },
          set: function (value) { this._enabled = value; }
        });
      }

      // Monitor video track for unexpected ending
      const videoTrack = combinedStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          console.warn("Video track ended unexpectedly");
          if (interviewActive && !isEndingInterview.current) {
            toast({
              title: "Camera Lost",
              description: "Camera disconnected. Please check your camera device.",
              variant: "destructive",
            });
          }
        };
      }

      setCameraOn(true);
      setMicOn(true);
      setMediaStream(combinedStream);
      setRetryAttempts(0);

      // Display video in preview
      const videoElement = document.getElementById("candidate-video") as HTMLVideoElement;
      if (videoElement) {
        videoElement.srcObject = combinedStream;
        videoElement.play().catch(err => {
          console.error("Video play error:", err);
        });
      }

      return combinedStream;

    } catch (error: any) {
      console.error('Media access error:', error);

      let errorMessage = '';

      // Handle specific errors
      if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application. Please close other apps and try again.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Camera access timed out. Please try again.';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Please allow camera and microphone access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found. Please connect a device.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera settings not supported. Please try a different camera.';
      } else {
        errorMessage = `Failed to access camera/microphone: ${error.message}`;
      }

      setMediaError(errorMessage);

      // Auto-retry once after 2 seconds (only if not already a retry)
      if (!isRetry && retryAttempts === 0) {
        setRetryAttempts(1);
        toast({
          title: "Retrying...",
          description: "Attempting to access camera and microphone again in 2 seconds.",
        });

        await new Promise(resolve => setTimeout(resolve, 2000));
        return await requestMediaAccess(true);
      }

      // Show error toast
      toast({
        title: "Media Access Error",
        description: errorMessage,
        variant: "destructive",
      });

      return null;
    }
  };

  const retryMediaAccess = async () => {
    setRetryAttempts(0);
    await requestMediaAccess(false);
  };

  const toggleCamera = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  };

  const startScreenRecording = async () => {
    try {
      // Request screen recording permission
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      } as DisplayMediaStreamOptions);

      setScreenStream(screenStream);

      // Check if screen stream has audio tracks
      const hasScreenAudio = screenStream.getAudioTracks().length > 0;
      const hasMicAudio = mediaStream && mediaStream.getAudioTracks().length > 0;

      let combinedStream: MediaStream;

      // Only use AudioContext if we have audio tracks to process
      if (hasScreenAudio || hasMicAudio) {
        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();

        // Connect screen audio if available
        if (hasScreenAudio) {
          const screenAudioSource = audioContext.createMediaStreamSource(screenStream);
          screenAudioSource.connect(destination);
        }

        // Connect microphone audio if available
        if (hasMicAudio) {
          const micAudioSource = audioContext.createMediaStreamSource(mediaStream!);
          micAudioSource.connect(destination);
        }

        // Create combined stream with screen video and mixed audio
        combinedStream = new MediaStream([
          ...screenStream.getVideoTracks(),
          ...destination.stream.getAudioTracks(),
        ]);
      } else {
        // No audio available, use screen video only
        combinedStream = new MediaStream([
          ...screenStream.getVideoTracks(),
        ]);

        toast({
          title: "No Audio Detected",
          description: "Recording will proceed with video only. Make sure your microphone is working.",
          variant: "default",
        });
      }

      // Setup MediaRecorder
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          setRecordingChunks(prev => [...prev, event.data]);
        }
      };

      recorder.start(1000); // Collect data every second
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);

      // Handle if user stops sharing screen manually
      screenStream.getVideoTracks()[0].onended = () => {
        toast({
          title: "Screen Sharing Stopped",
          description: "Please keep screen sharing active during the interview.",
          variant: "destructive",
        });
      };

      return true;
    } catch (err: any) {
      console.error("Screen recording error:", err);

      // Only show error if user actually denied/cancelled the screen share
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast({
          title: "Screen Recording Required",
          description: "You must share your screen to start the interview.",
          variant: "destructive",
        });
      } else if (err.name === 'NotFoundError') {
        toast({
          title: "Screen Share Error",
          description: "No screen source available for sharing.",
          variant: "destructive",
        });
      } else if (err.name === 'AbortError') {
        // User closed the dialog without selecting - treat as denial
        toast({
          title: "Screen Recording Required",
          description: "You must share your screen to start the interview.",
          variant: "destructive",
        });
      } else {
        // Other errors
        toast({
          title: "Screen Share Error",
          description: `Failed to start screen recording: ${err.message}`,
          variant: "destructive",
        });
      }

      return false;
    }
  };

  const startInterview = async () => {
    if (!candidate) return;

    // Prevent double initialization
    if (vapiInitialized || interviewActive || connecting) {
      console.warn("Interview already started or Vapi already initialized");
      return;
    }

    // Set connecting state
    setConnecting(true);

    // Mark that interview has been started (for refresh detection)
    setInterviewStarted(true);

    // Request wake lock to prevent system sleep/suspension during interview
    try {
      if ('wakeLock' in navigator) {
        const lock = await (navigator as any).wakeLock.request('screen');
        setWakeLock(lock);
        console.log("Wake lock acquired - system won't suspend during interview");

        lock.addEventListener('release', () => {
          console.log("Wake lock released");
        });
      }
    } catch (err) {
      console.warn("Wake lock not supported or failed:", err);
    }

    // Request media access first (camera + mic)
    const stream = await requestMediaAccess();
    if (!stream) {
      setConnecting(false);
      setInterviewStarted(false);
      return;
    }

    // Request screen recording permission (MANDATORY)
    const screenRecordingStarted = await startScreenRecording();
    if (!screenRecordingStarted) {
      // Stop media stream if screen recording failed
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
        setCameraOn(false);
        setMicOn(false);
      }
      setConnecting(false);
      setInterviewStarted(false);
      return;
    }

    // Extract questions from the database columns
    const clientQuestions = candidate["Question Ask by Client"]?.trim() || "";
    const aiGeneratedQuestions = candidate["AI Generated Question"]?.trim() || "";

    // Validate that at least one set of questions exists
    if (!clientQuestions && !aiGeneratedQuestions) {
      toast({
        title: "No Questions Available",
        description: "No interview questions found. Please contact support.",
        variant: "destructive",
      });
      setConnecting(false);
      setInterviewStarted(false);
      return;
    }

    try {
      let vapi = vapiClient;

      // Initialize Vapi client only once
      if (!vapi) {
        vapi = createVapiClient();
        setVapiClient(vapi);
        setVapiInitialized(true);

        // Handle Vapi errors
        vapi.on("error", (error: any) => {
          console.error("Vapi error:", error);

          // Ignore "Meeting has ended" error as it's expected when ending interview
          if (error?.error?.message === 'Meeting has ended' ||
            error?.message === 'Meeting has ended' ||
            error?.errorMsg === 'Meeting has ended') {
            console.log("Interview ended normally");
            return; // Don't show error toast
          }

          // Handle audio track ending
          if (error?.errorMsg?.includes('Local audio track ended') ||
            error?.message?.includes('Local audio track ended')) {
            console.log("Audio track ended - Vapi will retry automatically");
            return; // Don't show error toast - Vapi handles reconnection
          }

          setConnecting(false);
          toast({
            title: "Interview Error",
            description: error.message || error.errorMsg || "An error occurred during the interview. Please try again.",
            variant: "destructive",
          });
        });

        // Handle Vapi call end
        vapi.on("call-end", () => {
          console.log("Vapi call ended");
          setInterviewActive(false);
          setConnecting(false);
        });

        // Handle call start
        vapi.on("call-start", () => {
          console.log("Vapi call started");
          setConnecting(false);
          setInterviewActive(true);
        });

        // Listen to Vapi events
        vapi.on("speech-start", () => {
          setIsSpeaking(true);
          // Finalize any pending human transcript when AI starts speaking
          if (partialTranscript && partialTranscript.speaker === 'HUMAN') {
            setTranscript(prev => [...prev, {
              text: partialTranscript.text.trim(),
              timestamp: partialTranscript.startTime,
              speaker: 'HUMAN'
            }]);
            setPartialTranscript(null);
          }
        });

        vapi.on("speech-end", () => {
          setIsSpeaking(false);
          // Finalize AI transcript after speech ends
          if (partialTranscript && partialTranscript.speaker === 'AI') {
            setTranscript(prev => [...prev, {
              text: partialTranscript.text.trim(),
              timestamp: partialTranscript.startTime,
              speaker: 'AI'
            }]);
            setPartialTranscript(null);
          }
        });

        vapi.on("message", (message: any) => {
          if (message.type === "transcript" && message.transcript) {
            const currentTime = new Date().toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });

            // Determine speaker from message role: "assistant" = AI, "user" = HUMAN
            const speaker: 'AI' | 'HUMAN' = message.role === "assistant" ? 'AI' : 'HUMAN';

            // Clear any existing timeout
            if (transcriptTimeout) {
              clearTimeout(transcriptTimeout);
            }

            // Update or create partial transcript
            setPartialTranscript(prev => {
              // If speaker changed, finalize previous and start new
              if (prev && prev.speaker !== speaker) {
                setTranscript(t => [...t, {
                  text: prev.text.trim(),
                  timestamp: prev.startTime,
                  speaker: prev.speaker
                }]);
                return { text: message.transcript, speaker, startTime: currentTime };
              }

              // Same speaker - accumulate text
              if (prev) {
                return { ...prev, text: message.transcript };
              }

              // New transcript
              return { text: message.transcript, speaker, startTime: currentTime };
            });

            // Set timeout to finalize after 1 second of silence
            const timeout = setTimeout(() => {
              setPartialTranscript(prev => {
                if (prev) {
                  setTranscript(t => [...t, {
                    text: prev.text.trim(),
                    timestamp: prev.startTime,
                    speaker: prev.speaker
                  }]);
                  return null;
                }
                return null;
              });
            }, 1000); // 1 second silence threshold

            setTranscriptTimeout(timeout);
          }
        });
      }

      // Prepare session context with extracted questions
      const sessionContext: VapiSessionContext = {
        candidate_name: candidate.name,
        candidate_email: candidate.email,
        client_questions: clientQuestions,
        ai_generated_questions: aiGeneratedQuestions,
      };

      console.log("Starting Vapi with extracted questions:", sessionContext);

      // Start Vapi call - Vapi will manage its own audio context
      // Don't create a separate audio context as it conflicts with Vapi's audio management
      await vapi.start({
        name: "AI Interview Assistant",
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "en-US",
        },
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an AI Interview Assistant conducting a professional voice-based interview.

IMPORTANT: You MUST use ONLY the questions provided below from the database. Do not generate any new questions.

=== EXTRACTED INTERVIEW DATA ===

Candidate Information:
- Name: ${sessionContext.candidate_name}
- Email: ${sessionContext.candidate_email}

Questions from Client (Question_Ask_by_Client column):
${clientQuestions || "No client questions provided."}

AI Generated Questions (AI_Generated_Question column):
${aiGeneratedQuestions || "No AI-generated questions provided."}

=== INTERVIEW PROTOCOL ===

1. GREETING:
   - Start by greeting: "Hello ${sessionContext.candidate_name}, welcome to your interview. I will be asking you a series of questions today."

2. QUESTION SEQUENCE:
   ${clientQuestions ? `- First, ask ALL questions from "Questions from Client" one by one in order.` : ""}
   ${aiGeneratedQuestions ? `- Then, ask ALL questions from "AI Generated Questions" one by one in order.` : ""}
   - Ask ONE question at a time and wait for the candidate's complete answer.
   - After each answer, acknowledge briefly with: "Thank you" or "I understand" or "Noted."
   - Then proceed to the next question.

3. STRICT RULES:
   - DO NOT create, add, or improvise any questions beyond what is provided above.
   - DO NOT provide feedback, evaluation, or opinions on answers.
   - DO NOT engage in casual conversation beyond the interview structure.
   - If the candidate asks unrelated questions, politely redirect: "Let's focus on the interview questions."

4. CLOSING:
   - After all questions are complete, conclude with: "Thank you. This concludes your interview. Have a good day."`
            }
          ]
        },
        voice: {
          provider: "playht",
          voiceId: "jennifer"
        }
      });

      // The interview will be set to active when call-start event fires
      // If it doesn't fire within 3 seconds, set it manually
      setTimeout(() => {
        if (!interviewActive && connecting) {
          setInterviewActive(true);
          setConnecting(false);
        }
      }, 0);

    } catch (error: any) {
      console.error("Failed to start interview:", error);
      setConnecting(false);
      setVapiInitialized(false);
      setVapiReady(false);
      setInterviewStarted(false);
      toast({
        title: "Error",
        description: error.message || "Failed to start the interview. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const endInterview = async () => {
    isEndingInterview.current = true;
  
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
        console.log("Wake lock released");
      } catch (error) {
        console.error("Error releasing wake lock:", error);
      }
    }
  
    if (audioMonitorIntervalRef.current) {
      clearInterval(audioMonitorIntervalRef.current);
      audioMonitorIntervalRef.current = null;
    }
  
    if (vapiClient) {
      try {
        vapiClient.stop();
      } catch (error) {
        console.error("Error stopping Vapi:", error);
      }
      setVapiClient(null);
      setVapiInitialized(false);
      setVapiReady(false);
    }
  
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
  
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
  
    setInterviewActive(false);
    setCameraOn(false);
    setMicOn(false);
    setIsSpeaking(false);
  
    if (candidate) {
      setIsUploading(true);
  
      try {
        let recordingUrl = null;
  
        // -------------------------------------------------------------------
        // FETCH EXISTING ROW TO PRESERVE REQUIRED NOT NULL COLUMNS
        // -------------------------------------------------------------------
        const { data: existingRow, error: fetchError } = await supabase
          .from("Qualified_For_Final_Interview")
          .select("*")
          .eq("id", candidate.id)
          .single();
  
        if (fetchError) {
          console.error("Error fetching existing row:", fetchError);
        }
  
        // Upload Screen Recording
        if (recordingChunks.length > 0) {
          const recordingBlob = new Blob(recordingChunks, { type: "video/webm" });
          const fileName = `${candidate.email}_${Date.now()}.webm`;
  
          const { data, error: uploadError } = await supabase.storage
            .from("interview-recordings")
            .upload(fileName, recordingBlob, {
              contentType: "video/webm",
              upsert: false,
            });
  
          const { data: publicUrlData } = supabase.storage
            .from("interview-recordings")
            .getPublicUrl(fileName);
  
          recordingUrl = publicUrlData.publicUrl;
  
          // -------------------------------------------------------------------
          // UPDATE SCREEN RECORDING — PRESERVE ALL NOT NULL COLUMNS
          // -------------------------------------------------------------------
          await supabase
            .from("Qualified_For_Final_Interview")
            .update({
              Screen_recording: recordingUrl,
  
              // REQUIRED NOT-NULL COLUMNS
              name: existingRow.name,
              email: existingRow.email,
              user_id: existingRow.user_id,
              job_id: existingRow.job_id,
              phone: existingRow.phone,
              cv_file_url: existingRow.cv_file_url,
              ai_score: existingRow.ai_score,
            })
            .eq("id", candidate.id);
  
          if (!uploadError) {
            setUploadProgress(100);
          }
        }
  
        // Save pending partial transcript
        if (partialTranscript) {
          setTranscript(prev => [
            ...prev,
            {
              text: partialTranscript.text.trim(),
              timestamp: partialTranscript.startTime,
              speaker: partialTranscript.speaker,
            },
          ]);
        }
  
        // Build Final Transcript
        const fullTranscript =
          transcript.length > 0
            ? transcript
                .map(t => `[${t.timestamp}] [${t.speaker}]: ${t.text}`)
                .join("\n")
            : "";
  
        // -------------------------------------------------------------------
        // FINAL UPDATE: interview_status + Transcript — PRESERVE NOT NULLS
        // -------------------------------------------------------------------
        const updateData = {
          interview_status: "Completed",
          Transcript: fullTranscript,
  
          // REQUIRED NOT-NULL FIELDS
          name: existingRow.name,
          email: existingRow.email,
          user_id: existingRow.user_id,
          job_id: existingRow.job_id,
          phone: existingRow.phone,
          cv_file_url: existingRow.cv_file_url,
          ai_score: existingRow.ai_score,
        };
  
        const { data: updateResult, error: updateError } = await supabase
          .from("Qualified_For_Final_Interview")
          .update(updateData)
          .eq("id", candidate.id)
          .select();
  
        if (updateError) {
          console.error("Error updating interview status:", updateError);
          toast({
            title: "Warning",
            description: "Interview ended but status could not be updated.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Interview Completed",
            description: recordingUrl
              ? "Recording and transcript saved successfully."
              : "Interview completed. Recording missing.",
          });
        }
      } catch (error) {
        console.error("Error saving interview data:", error);
        toast({
          title: "Warning",
          description: "Interview ended but data could not be saved.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        setRecordingChunks([]);
        setShowThankYou(true);
  
        setTimeout(() => {
          navigate("/interview-landing");
        }, 5000);
      }
    }
  };
  
  

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">Loading interview details...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!candidate) {
    return null;
  }

  // Thank You Screen
  if (showThankYou) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="rounded-full bg-primary/10 p-6">
                <Sparkles className="h-16 w-16 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">Thank You!</h1>
                <p className="text-xl text-muted-foreground">
                  Your interview has been completed successfully.
                </p>
              </div>
              <div className="space-y-2 text-center max-w-md">
                <p className="text-muted-foreground">
                  Thank you for taking the time to participate in this interview, {candidate.name}.
                </p>
                <p className="text-muted-foreground">
                  Your responses have been recorded and will be reviewed by our team.
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Redirecting you back to the landing page in a few seconds...
                </p>
              </div>
              <Button
                onClick={() => navigate("/interview-landing")}
                size="lg"
                className="mt-4"
              >
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">AI Interview Room</CardTitle>
                <CardDescription className="mt-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{candidate.name} ({candidate.email})</span>
                  </div>
                </CardDescription>
              </div>
              <InterviewBadge status={interviewActive ? "active" : "scheduled"} />
            </div>
          </CardHeader>
        </Card>

        {/* Video Interface - Side by Side */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Candidate Video */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Camera</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <video
                  id="candidate-video"
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!cameraOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <VideoOff className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Avatar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Interviewer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg overflow-hidden flex items-center justify-center">
                {isSpeaking ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/30 rounded-full animate-pulse" />
                      <Volume2 className="h-16 w-16 text-primary relative z-10 animate-pulse" />
                    </div>
                    <div className="text-sm text-muted-foreground">AI is speaking...</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <Sparkles className="h-16 w-16 text-primary" />
                    <div className="text-sm text-muted-foreground">AI is listening...</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              {/* Media Error Display */}
              {mediaError && !interviewActive && (
                <div className="w-full max-w-2xl">
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="text-sm font-medium text-destructive mb-3">{mediaError}</div>
                    <div className="flex gap-2">
                      <Button
                        onClick={retryMediaAccess}
                        size="sm"
                        variant="outline"
                      >
                        Retry
                      </Button>
                      <Button
                        onClick={() => setMediaError(null)}
                        size="sm"
                        variant="ghost"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Recording Indicator */}
              {isRecording && (
                <div className="flex items-center gap-3 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-destructive rounded-full animate-pulse" />
                    <span className="text-sm font-medium">Recording</span>
                  </div>
                  <span className="text-sm font-mono">{formatDuration(recordingDuration)}</span>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="w-full max-w-md">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">Uploading recording...</span>
                    <span className="text-sm font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                {!interviewActive ? (
                  <Button
                    onClick={startInterview}
                    size="lg"
                    className="min-w-48"
                    disabled={isUploading || vapiInitialized}
                  >
                    Start Interview
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={toggleCamera}
                      size="lg"
                      variant="outline"
                      className="gap-2"
                      disabled={isUploading}
                    >
                      {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                      {cameraOn ? "Camera On" : "Camera Off"}
                    </Button>
                    <Button
                      onClick={toggleMic}
                      size="lg"
                      variant="outline"
                      className="gap-2"
                      disabled={isUploading}
                    >
                      {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                      {micOn ? "Mic On" : "Mic Off"}
                    </Button>
                    <Button
                      onClick={endInterview}
                      size="lg"
                      variant="destructive"
                      className="min-w-48"
                      disabled={isUploading}
                    >
                      {isUploading ? "Saving..." : "End Interview"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card>
          <CardHeader>
            <CardTitle>Interview Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={transcriptContainerRef}
              className="space-y-3 max-h-80 overflow-y-auto p-4 bg-muted/30 rounded-lg border"
              style={{ scrollBehavior: 'smooth' }}
            >
              {transcript.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Transcript will appear here during the interview...
                </div>
              ) : (
                <>
                  {transcript.map((entry, idx) => (
                    <div key={idx} className="text-sm flex gap-2">
                      <span className="text-xs text-muted-foreground font-mono shrink-0">[{entry.timestamp}]</span>
                      <span className={`text-xs font-semibold shrink-0 ${entry.speaker === 'AI' ? 'text-primary' : 'text-accent'}`}>
                        [{entry.speaker}]:
                      </span>
                      <span className="flex-1">{entry.text}</span>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InterviewRoom;