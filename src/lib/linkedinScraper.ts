// LinkedIn Job Scraper Library
// This scrapes publicly available job data from LinkedIn job postings

interface LinkedInJobData {
  title: string;
  company: string;
  location: string;
  city: string;
  country: string;
  description: string;
  jobLevel: string;
  locationType: string;
  salaryMin?: string;
  salaryMax?: string;
}

/**
 * Scrapes LinkedIn job details from a job posting URL
 * Uses a proxy service to bypass CORS restrictions
 */
export const scrapeLinkedInJob = async (linkedinUrl: string): Promise<LinkedInJobData> => {
  try {
    // Validate LinkedIn URL
    if (!linkedinUrl.includes('linkedin.com/jobs/view/')) {
      throw new Error('Invalid LinkedIn job URL. Please provide a valid job posting URL.');
    }

    // Extract job ID from URL
    const jobIdMatch = linkedinUrl.match(/jobs\/view\/(\d+)/);
    if (!jobIdMatch) {
      throw new Error('Could not extract job ID from URL');
    }

    const jobId = jobIdMatch[1];

    // Use AllOrigins proxy to bypass CORS
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(linkedinUrl)}`;

    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch job details from LinkedIn');
    }

    const data = await response.json();
    const html = data.contents;

    // Create a temporary DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract job details from the HTML
    // LinkedIn uses specific classes and data attributes for job details

    // Job Title
    const titleElement = doc.querySelector('h1.top-card-layout__title, h2.topcard__title');
    const title = titleElement?.textContent?.trim() || 'Untitled Position';

    // Company Name
    const companyElement = doc.querySelector('a.topcard__org-name-link, span.topcard__flavor--black-link');
    const company = companyElement?.textContent?.trim() || 'Company';

    // Location
    const locationElement = doc.querySelector('span.topcard__flavor--bullet, span.job-view-layout__location');
    const locationText = locationElement?.textContent?.trim() || '';
    
    // Parse location into city and country
    const locationParts = locationText.split(',').map(part => part.trim());
    const city = locationParts[0] || '';
    const country = locationParts[locationParts.length - 1] || '';

    // Job Description
    const descriptionElement = doc.querySelector('div.show-more-less-html__markup, div.description__text');
    let description = descriptionElement?.textContent?.trim() || '';
    
    // Clean up description
    description = description
      .replace(/\s+/g, ' ')
      .replace(/Show more|Show less/gi, '')
      .trim();

    // Job Level (try to extract from description or title)
    let jobLevel = 'mid'; // default
    const levelKeywords = {
      entry: ['entry', 'junior', 'associate', 'graduate'],
      mid: ['mid', 'intermediate', 'experienced'],
      senior: ['senior', 'lead', 'principal', 'staff'],
      exec: ['executive', 'director', 'vp', 'chief', 'head of', 'c-level']
    };

    const combinedText = (title + ' ' + description).toLowerCase();
    for (const [level, keywords] of Object.entries(levelKeywords)) {
      if (keywords.some(keyword => combinedText.includes(keyword))) {
        jobLevel = level;
        break;
      }
    }

    // Location Type (try to extract from description)
    let locationType = 'onsite'; // default
    const typeKeywords = {
      remote: ['remote', 'work from home', 'wfh', 'fully remote'],
      hybrid: ['hybrid', 'flexible', 'partly remote'],
      onsite: ['on-site', 'onsite', 'office', 'in-office']
    };

    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(keyword => combinedText.includes(keyword))) {
        locationType = type;
        break;
      }
    }

    // Try to extract salary (if mentioned in description)
    const salaryMatch = description.match(/\$?([\d,]+)k?\s*-\s*\$?([\d,]+)k?/i);
    let salaryMin: string | undefined;
    let salaryMax: string | undefined;

    if (salaryMatch) {
      salaryMin = salaryMatch[1].replace(/,/g, '');
      salaryMax = salaryMatch[2].replace(/,/g, '');
      
      // If values are in thousands (e.g., "80k"), multiply by 1000
      if (description.toLowerCase().includes('k')) {
        salaryMin = (parseInt(salaryMin) * 1000).toString();
        salaryMax = (parseInt(salaryMax) * 1000).toString();
      }
    }

    return {
      title,
      company,
      location: locationText,
      city,
      country,
      description,
      jobLevel,
      locationType,
      salaryMin,
      salaryMax,
    };

  } catch (error) {
    console.error('LinkedIn scraping error:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to scrape LinkedIn job. Please try again or add details manually.'
    );
  }
};

/**
 * Alternative scraper using a different method
 * Falls back to this if the main scraper fails
 */
export const scrapeLinkedInJobAlternative = async (linkedinUrl: string): Promise<LinkedInJobData> => {
  try {
    // Use a different CORS proxy
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(linkedinUrl)}`;

    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch job details');
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Try to extract from meta tags (more reliable)
    const getMetaContent = (property: string) => {
      const meta = doc.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
      return meta?.getAttribute('content') || '';
    };

    const title = getMetaContent('og:title') || 'Untitled Position';
    const description = getMetaContent('og:description') || '';
    const location = getMetaContent('og:locale') || '';

    return {
      title,
      company: 'Company',
      location,
      city: '',
      country: '',
      description,
      jobLevel: 'mid',
      locationType: 'hybrid',
    };

  } catch (error) {
    throw new Error('Alternative scraping method also failed');
  }
};

/**
 * Main function to scrape LinkedIn job with fallback
 */
export const getLinkedInJobDetails = async (linkedinUrl: string): Promise<LinkedInJobData> => {
  try {
    // Try main scraper first
    return await scrapeLinkedInJob(linkedinUrl);
  } catch (error) {
    console.warn('Main scraper failed, trying alternative...', error);
    
    try {
      // Try alternative scraper
      return await scrapeLinkedInJobAlternative(linkedinUrl);
    } catch (altError) {
      console.error('Both scrapers failed');
      
      // Return mock data as last resort (so user can edit)
      throw new Error(
        'Unable to automatically scrape job details. Please add details manually or try a different URL.'
      );
    }
  }
};