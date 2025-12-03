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
 * 
 * NOTE: If you encounter 400 errors, check:
 * 1. The VAPI_PUBLIC_KEY is valid and active in your Vapi dashboard
 * 2. Your Vapi account has proper API credits/balance
 * 3. Provider credentials (Deepgram, OpenAI, PlayHT) are configured in Vapi dashboard
 * 4. Consider using an assistantId instead of inline configuration:
 *    - Create an assistant in Vapi dashboard
 *    - Use: await vapi.start({ assistantId: "your-assistant-id" })
 */
export const createVapiClient = () => {
  if (!VAPI_PUBLIC_KEY) {
    throw new Error("VAPI_PUBLIC_KEY is not configured. Please set it in src/lib/vapiClient.ts");
  }
  return new Vapi(VAPI_PUBLIC_KEY);
};

export interface VapiSessionContext {
  candidate_name: string;
  candidate_email: string;
  client_questions: string;
  ai_generated_questions: string;
}

