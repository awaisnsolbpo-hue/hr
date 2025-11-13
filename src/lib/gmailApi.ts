// Gmail API Helper Functions
import { getGmailAccessToken } from "./gmailAuth";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

export interface GmailMessage {
    id: string;
    threadId: string;
    snippet: string;
    payload: {
        headers: Array<{ name: string; value: string }>;
        parts?: Array<{
            mimeType: string;
            filename: string;
            body: {
                attachmentId?: string;
                size: number;
            };
        }>;
    };
    internalDate: string;
}

export interface EmailData {
    id: string;
    from: string;
    fromEmail: string;
    subject: string;
    date: string;
    snippet: string;
    attachments: Array<{
        filename: string;
        mimeType: string;
        attachmentId: string;
        size: number;
    }>;
    hasResume: boolean;
}

/**
 * Search Gmail messages
 */
export const searchGmailMessages = async (
    query: string,
    maxResults: number = 20
): Promise<EmailData[]> => {
    const accessToken = await getGmailAccessToken();

    const response = await fetch(
        `${GMAIL_API_BASE}/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Gmail API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.messages || data.messages.length === 0) {
        return [];
    }

    // Fetch full message details for each message
    const messages = await Promise.all(
        data.messages.map((msg: { id: string }) => getGmailMessage(msg.id, accessToken))
    );

    return messages.map(parseEmailData).filter((email): email is EmailData => email !== null);
};

/**
 * Get full Gmail message details
 */
const getGmailMessage = async (messageId: string, accessToken: string): Promise<GmailMessage> => {
    const response = await fetch(
        `${GMAIL_API_BASE}/users/me/messages/${messageId}?format=full`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch message: ${response.statusText}`);
    }

    return response.json();
};

/**
 * Parse Gmail message into EmailData
 */
const parseEmailData = (message: GmailMessage): EmailData | null => {
    const headers = message.payload.headers;

    const from = headers.find((h) => h.name.toLowerCase() === "from")?.value || "";
    const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value || "";
    const date = headers.find((h) => h.name.toLowerCase() === "date")?.value || "";

    // Extract email from "Name <email@domain.com>" format
    const emailMatch = from.match(/<([^>]+)>/);
    const fromEmail = emailMatch ? emailMatch[1] : from;
    const fromName = from.replace(/<[^>]+>/, "").trim();

    // Find attachments
    const attachments: EmailData["attachments"] = [];

    const findAttachments = (parts: any[] | undefined) => {
        if (!parts) return;

        for (const part of parts) {
            if (part.filename && part.body?.attachmentId) {
                attachments.push({
                    filename: part.filename,
                    mimeType: part.mimeType,
                    attachmentId: part.body.attachmentId,
                    size: part.body.size,
                });
            }

            if (part.parts) {
                findAttachments(part.parts);
            }
        }
    };

    findAttachments(message.payload.parts);

    // Check if it has resume/CV attachment
    const hasResume = attachments.some((att) => {
        const filename = att.filename.toLowerCase();
        const isDocument = att.mimeType.includes("pdf") ||
            att.mimeType.includes("document") ||
            att.mimeType.includes("msword");
        const hasResumeKeyword = filename.includes("resume") ||
            filename.includes("cv") ||
            filename.includes("curriculum");
        return isDocument && (hasResumeKeyword || attachments.length === 1);
    });

    return {
        id: message.id,
        from: fromName || fromEmail,
        fromEmail,
        subject,
        date: new Date(parseInt(message.internalDate)).toLocaleDateString(),
        snippet: message.snippet,
        attachments,
        hasResume,
    };
};

/**
 * Download attachment from Gmail
 */
export const downloadGmailAttachment = async (
    messageId: string,
    attachmentId: string
): Promise<Blob> => {
    const accessToken = await getGmailAccessToken();

    const response = await fetch(
        `${GMAIL_API_BASE}/users/me/messages/${messageId}/attachments/${attachmentId}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to download attachment: ${response.statusText}`);
    }

    const data = await response.json();

    // Gmail returns base64url encoded data
    const base64Data = data.data.replace(/-/g, "+").replace(/_/g, "/");
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return new Blob([bytes]);
};

/**
 * Get the most likely CV/Resume attachment from an email
 */
export const getResumeAttachment = (email: EmailData) => {
    if (email.attachments.length === 0) return null;

    // Priority 1: Files with "resume" or "cv" in name
    const resumeFile = email.attachments.find((att) => {
        const filename = att.filename.toLowerCase();
        return (filename.includes("resume") || filename.includes("cv") || filename.includes("curriculum"));
    });

    if (resumeFile) return resumeFile;

    // Priority 2: First PDF or Word document
    const docFile = email.attachments.find((att) =>
        att.mimeType.includes("pdf") ||
        att.mimeType.includes("document") ||
        att.mimeType.includes("msword")
    );

    return docFile || email.attachments[0];
};