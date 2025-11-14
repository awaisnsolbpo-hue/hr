// =====================================================
// SKILL MAPPING DICTIONARY
// Maps job roles to related skills for intelligent matching
// =====================================================

export const skillMapping: Record<string, string[]> = {
  // AI & Machine Learning
  "AI": ["machine learning", "deep learning", "neural networks", "python", "tensorflow", "pytorch", "nlp", "computer vision", "AI", "artificial intelligence"],
  "Machine Learning": ["python", "scikit-learn", "tensorflow", "pytorch", "statistics", "data science", "ml", "machine learning", "algorithms"],
  "Data Scientist": ["python", "r", "sql", "machine learning", "statistics", "data analysis", "tableau", "power bi", "data science"],
  "ML Engineer": ["python", "tensorflow", "pytorch", "kubernetes", "docker", "mlops", "machine learning", "deep learning"],
  
  // Software Development
  "Software Engineer": ["programming", "algorithms", "data structures", "git", "agile", "software development", "coding"],
  "Frontend Developer": ["react", "javascript", "typescript", "html", "css", "vue", "angular", "frontend", "ui development", "web development"],
  "Backend Developer": ["node.js", "python", "java", "sql", "api", "backend", "server", "database", "microservices"],
  "Full Stack": ["react", "node.js", "javascript", "typescript", "mongodb", "sql", "full stack", "frontend", "backend"],
  "DevOps": ["kubernetes", "docker", "ci/cd", "aws", "azure", "terraform", "jenkins", "devops", "cloud"],
  
  // Design
  "UI/UX Designer": ["figma", "sketch", "adobe xd", "user research", "wireframing", "prototyping", "ui", "ux", "design"],
  "Product Designer": ["figma", "user research", "prototyping", "design thinking", "product design", "ux", "ui"],
  "Graphic Designer": ["photoshop", "illustrator", "indesign", "graphic design", "branding", "typography"],
  
  // Product & Management
  "Product Manager": ["product management", "agile", "scrum", "roadmap", "stakeholder management", "analytics"],
  "Project Manager": ["project management", "agile", "scrum", "pmp", "jira", "risk management"],
  "Scrum Master": ["scrum", "agile", "facilitation", "jira", "kanban", "agile coaching"],
  
  // Data & Analytics
  "Data Analyst": ["sql", "excel", "tableau", "power bi", "python", "data analysis", "statistics"],
  "Business Analyst": ["sql", "requirements gathering", "business analysis", "process modeling", "stakeholder management"],
  "Data Engineer": ["python", "sql", "spark", "hadoop", "etl", "data pipelines", "airflow", "data engineering"],
  
  // Sales & Marketing
  "Sales": ["salesforce", "crm", "negotiation", "lead generation", "sales strategy", "b2b sales"],
  "Marketing": ["seo", "sem", "social media", "content marketing", "google analytics", "marketing automation"],
  "Digital Marketing": ["seo", "sem", "google ads", "facebook ads", "analytics", "content marketing"],
  
  // Other
  "QA": ["testing", "automation", "selenium", "jira", "qa", "quality assurance", "test cases"],
  "Security": ["cybersecurity", "penetration testing", "security", "compliance", "risk assessment"],
  "Cloud": ["aws", "azure", "gcp", "cloud computing", "serverless", "cloud architecture"]
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get all related skills for a search term
 */
export const getRelatedSkills = (searchTerm: string): string[] => {
  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  // Direct match
  if (skillMapping[normalizedSearch]) {
    return skillMapping[normalizedSearch];
  }
  
  // Partial match in keys
  const matchingKeys = Object.keys(skillMapping).filter(key => 
    key.toLowerCase().includes(normalizedSearch) || 
    normalizedSearch.includes(key.toLowerCase())
  );
  
  if (matchingKeys.length > 0) {
    return [...new Set(matchingKeys.flatMap(key => skillMapping[key]))];
  }
  
  // Check if search term is in any skill list
  const relatedRoles = Object.entries(skillMapping).filter(([_, skills]) =>
    skills.some(skill => 
      skill.toLowerCase().includes(normalizedSearch) ||
      normalizedSearch.includes(skill.toLowerCase())
    )
  );
  
  if (relatedRoles.length > 0) {
    return [...new Set(relatedRoles.flatMap(([_, skills]) => skills))];
  }
  
  // Return original term if no match
  return [normalizedSearch];
};

/**
 * Calculate skill match score between candidate skills and job requirements
 */
export const calculateSkillMatch = (
  candidateSkills: string[],
  jobRequiredSkills: string[],
  jobPreferredSkills: string[] = []
): number => {
  if (!candidateSkills || candidateSkills.length === 0) return 50;
  if (!jobRequiredSkills || jobRequiredSkills.length === 0) return 60;
  
  const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase());
  const normalizedRequired = jobRequiredSkills.map(s => s.toLowerCase());
  const normalizedPreferred = jobPreferredSkills.map(s => s.toLowerCase());
  
  // Count required skill matches
  const requiredMatches = normalizedRequired.filter(skill =>
    normalizedCandidateSkills.some(cs => 
      cs.includes(skill) || skill.includes(cs)
    )
  ).length;
  
  // Count preferred skill matches
  const preferredMatches = normalizedPreferred.filter(skill =>
    normalizedCandidateSkills.some(cs =>
      cs.includes(skill) || skill.includes(cs)
    )
  ).length;
  
  // Calculate score: 70% weight on required, 30% on preferred
  const requiredScore = normalizedRequired.length > 0
    ? (requiredMatches / normalizedRequired.length) * 70
    : 50;
    
  const preferredScore = normalizedPreferred.length > 0
    ? (preferredMatches / normalizedPreferred.length) * 30
    : 20;
  
  return Math.round(requiredScore + preferredScore);
};

/**
 * Fuzzy string matching for job titles
 */
export const fuzzyMatch = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 80;
  
  // Calculate Levenshtein distance
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  
  return Math.round(similarity);
};

/**
 * Expand search query to include related terms
 */
export const expandSearchQuery = (query: string): string[] => {
  const relatedSkills = getRelatedSkills(query);
  return [query, ...relatedSkills].slice(0, 10); // Limit to top 10 related terms
};