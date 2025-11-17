// Types for interview functionality
export interface CandidateRecord {
  name: string;
  email: string;
  "Question Ask by Client": string | null;
  "AI Generated Question": string | null;
  interview_status: string | null;
  Transcript?: string | null;
  "Recording URL"?: string | null;
  "Screen recording"?: string | null;
}

