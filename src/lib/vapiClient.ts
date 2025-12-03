import Vapi from "@vapi-ai/web";

const VAPI_PUBLIC_KEY = "b20ebfed-ff48-43f9-a287-84b64f553d41";

/**
 * Creates and returns a new Vapi client instance
 * 
 * Vapi is configured in InterviewRoom.tsx with enhanced settings:
 * - Deepgram transcriber with nova-2 model for better speech recognition
 * - Smart formatting enabled for punctuation and capitalization
 * - Optimized endpointing (500ms) for natural speech pauses
 * - PlayHT voice with enhanced clarity settings
 */
export const createVapiClient = () => {
  return new Vapi(VAPI_PUBLIC_KEY);
};

export interface VapiSessionContext {
  candidate_name: string;
  candidate_email: string;
  client_questions: string;
  ai_generated_questions: string;
}

