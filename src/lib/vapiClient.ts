import Vapi from "@vapi-ai/web";

const VAPI_PUBLIC_KEY = "b20ebfed-ff48-43f9-a287-84b64f553d41";

export const createVapiClient = () => {
  return new Vapi(VAPI_PUBLIC_KEY);
};

export interface VapiSessionContext {
  candidate_name: string;
  candidate_email: string;
  client_questions: string;
  ai_generated_questions: string;
}

