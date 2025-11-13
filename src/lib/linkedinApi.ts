// src/lib/linkedinApi.ts
// LinkedIn API Helper Functions with Enhanced Logging

import { getLinkedInAccessToken } from "./linkedinAuth";

const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";

export interface LinkedInOrganization {
  id: string;
  name: string;
  vanityName: string;
}

/**
 * Get LinkedIn organizations (company pages) that the user can post to
 */
export const getLinkedInOrganizations = async (): Promise<LinkedInOrganization[]> => {
  try {
    console.log("=== FETCHING LINKEDIN ORGANIZATIONS ===");
    
    const token = await getLinkedInAccessToken();
    if (!token) {
      throw new Error("LinkedIn access token not found");
    }

    console.log("Token exists:", !!token);

    // Get user profile first to get their ID
    const profileResponse = await fetch(`${LINKEDIN_API_BASE}/userinfo`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!profileResponse.ok) {
      const error = await profileResponse.text();
      console.error("Profile fetch error:", error);
      throw new Error(`Failed to fetch profile: ${profileResponse.status}`);
    }

    const profile = await profileResponse.json();
    console.log("User profile:", profile);

    // Get organizations the user administers
    const orgsResponse = await fetch(
      `${LINKEDIN_API_BASE}/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget~(localizedName,vanityName)))`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    if (!orgsResponse.ok) {
      const error = await orgsResponse.text();
      console.error("Organizations fetch error:", error);
      throw new Error(`Failed to fetch organizations: ${orgsResponse.status}`);
    }

    const orgsData = await orgsResponse.json();
    console.log("Organizations data:", orgsData);

    const organizations: LinkedInOrganization[] = [];

    if (orgsData.elements && Array.isArray(orgsData.elements)) {
      for (const element of orgsData.elements) {
        if (element["organizationalTarget~"]) {
          const org = element["organizationalTarget~"];
          organizations.push({
            id: element.organizationalTarget,
            name: org.localizedName || "Unknown Organization",
            vanityName: org.vanityName || "",
          });
        }
      }
    }

    console.log("Parsed organizations:", organizations);
    return organizations;
  } catch (error: any) {
    console.error("Error fetching LinkedIn organizations:", error);
    throw error;
  }
};

/**
 * Share a job post on LinkedIn company page
 */
export const shareJobPost = async (
  organizationId: string,
  title: string,
  description: string,
  applyUrl: string
): Promise<string> => {
  try {
    console.log("=== SHARING JOB POST TO LINKEDIN ===");
    console.log("Organization ID:", organizationId);
    console.log("Title:", title);
    console.log("Apply URL:", applyUrl);

    const token = await getLinkedInAccessToken();
    if (!token) {
      throw new Error("LinkedIn access token not found. Please reconnect LinkedIn.");
    }

    console.log("Access token exists:", !!token);

    // Format the post content
    const postText = `🎯 We're Hiring: ${title}\n\n${description.substring(0, 500)}${
      description.length > 500 ? "..." : ""
    }\n\n📋 Apply now: ${applyUrl}`;

    console.log("Post text length:", postText.length);

    // Create the share payload
    const sharePayload = {
      author: organizationId,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: postText,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    console.log("Share payload:", JSON.stringify(sharePayload, null, 2));

    // Post to LinkedIn UGC API
    const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(sharePayload),
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LinkedIn API error response:", errorText);
      
      let errorMessage = `Failed to post to LinkedIn (${response.status})`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage += `: ${errorJson.message}`;
        }
        console.error("Parsed error:", errorJson);
      } catch (e) {
        console.error("Raw error text:", errorText);
      }
      
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log("LinkedIn API response:", responseData);

    // Extract post ID from response
    const postId = responseData.id;
    
    if (!postId) {
      console.warn("No post ID in response");
      throw new Error("LinkedIn did not return a post ID");
    }

    console.log("Post ID:", postId);
    console.log("=== JOB POST SHARED SUCCESSFULLY ===");

    return postId;
  } catch (error: any) {
    console.error("=== ERROR SHARING JOB POST ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
};

/**
 * Get job applicants from LinkedIn (requires special API access)
 * Note: This requires LinkedIn Talent Solutions API which is enterprise-only
 */
export const getLinkedInJobApplicants = async (
  jobPostingId: string
): Promise<any[]> => {
  try {
    const token = await getLinkedInAccessToken();
    if (!token) {
      throw new Error("LinkedIn access token not found");
    }

    // Note: This endpoint requires special LinkedIn Talent Solutions access
    const response = await fetch(
      `${LINKEDIN_API_BASE}/jobs/${jobPostingId}/applicants`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch applicants: ${response.status}`);
    }

    const data = await response.json();
    return data.elements || [];
  } catch (error: any) {
    console.error("Error fetching LinkedIn applicants:", error);
    throw error;
  }
};