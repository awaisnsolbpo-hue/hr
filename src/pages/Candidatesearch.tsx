import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ArrowLeft,
  Search as SearchIcon,
  Loader2,
  Download,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { searchCandidatesByRole, SearchResult } from "@/lib/Searchapi";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CandidateSearch = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!searchQuery.trim()) {
      toast({
        title: "Enter Search Term",
        description: "Please enter a role or keyword to search",
        variant: "destructive",
      });
      return;
    }

    setSearching(true);
    setSearched(true);

    try {
      const searchResults = await searchCandidatesByRole(searchQuery);
      setResults(searchResults);

      if (searchResults.length === 0) {
        toast({
          title: "No Results",
          description: `No candidates found for "${searchQuery}". Try different keywords.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search candidates",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      Applicant: "bg-blue-100 text-blue-800",
      Shortlisted: "bg-purple-100 text-purple-800",
      "Final Interview": "bg-green-100 text-green-800",
      Client: "bg-gray-100 text-gray-800",
    };
    return colors[source] || colors.Client;
  };

  // Sample search suggestions
  const searchSuggestions = [
    "AI Specialist",
    "Frontend Developer",
    "Data Scientist",
    "Product Manager",
    "UI/UX Designer",
    "DevOps Engineer",
  ];

  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-gradient">AI Hiring</span>
            </Link>

            <Button
              variant="ghost"
              size="default"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="text-center space-y-4 animate-fade-in">
            <h1 className="text-4xl font-bold">
              <SearchIcon className="inline h-10 w-10 mr-3 text-primary" />
              Candidate Search
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find candidates by role, skills, or keywords. Search across all job
              applications, including archived positions.
            </p>
          </div>

          {/* Search Box */}
          <Card className="hover-glow">
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder='Try "AI Specialist", "Frontend Developer", or any skill...'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-11 h-12 text-lg"
                      disabled={searching}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    variant="hero"
                    disabled={searching || !searchQuery.trim()}
                    className="px-8"
                  >
                    {searching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <SearchIcon className="mr-2 h-4 w-4" />
                        Search
                      </>
                    )}
                  </Button>
                </div>

                {/* Search Suggestions */}
                {!searched && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-sm text-muted-foreground">Try:</span>
                    {searchSuggestions.map((suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => {
                          setSearchQuery(suggestion);
                          handleSearch();
                        }}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          {searched && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Search Results
                    {results.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {results.length} {results.length === 1 ? "match" : "matches"}
                      </Badge>
                    )}
                  </CardTitle>
                  {results.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearched(false);
                        setResults([]);
                        setSearchQuery("");
                      }}
                    >
                      Clear Results
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {results.length === 0 ? (
                  <Alert>
                    <SearchIcon className="h-4 w-4" />
                    <AlertDescription>
                      No candidates found for "{searchQuery}". Try different keywords or
                      check if candidates have applied to related job positions.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Skills</TableHead>
                          <TableHead>Applied For</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead>Match Score</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((result, index) => (
                          <TableRow key={`${result.candidate.id}-${index}`}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{result.candidate.name}</span>
                                {result.candidate.experience_years && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    {result.candidate.experience_years} years exp
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1 text-sm">
                                <a
                                  href={`mailto:${result.candidate.email}`}
                                  className="flex items-center gap-1 hover:text-primary"
                                >
                                  <Mail className="h-3 w-3" />
                                  {result.candidate.email}
                                </a>
                                {result.candidate.phone && (
                                  <a
                                    href={`tel:${result.candidate.phone}`}
                                    className="flex items-center gap-1 hover:text-primary"
                                  >
                                    <Phone className="h-3 w-3" />
                                    {result.candidate.phone}
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {result.candidate.skills.slice(0, 3).map((skill, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {result.candidate.skills.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{result.candidate.skills.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  {result.job.title}
                                </span>
                                <Badge
                                  variant={
                                    result.job.status === "active"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-xs w-fit mt-1"
                                >
                                  {result.job.status}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={getSourceBadge(result.candidate.source)}
                              >
                                {result.candidate.source}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={getScoreBadgeColor(result.matchScore)}
                              >
                                {result.matchScore}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(result.candidate.created_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {result.candidate.cv_file_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      window.open(result.candidate.cv_file_url, "_blank")
                                    }
                                    title="Download CV"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                                {result.candidate.linkedin_profile_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      window.open(
                                        result.candidate.linkedin_profile_url,
                                        "_blank"
                                      )
                                    }
                                    title="View LinkedIn"
                                  >
                                    <svg
                                      className="h-4 w-4"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                    </svg>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          {!searched && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-blue-900">
                    How LinkedIn-Style Search Works:
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-blue-800">
                    <li>
                      Search by job role (e.g., "AI Specialist", "Frontend Developer")
                    </li>
                    <li>
                      System matches keywords to job titles and required skills
                    </li>
                    <li>Returns ALL candidates who applied to matching jobs</li>
                    <li>
                      Includes candidates from all stages (Applicant, Shortlisted, Final
                      Interview)
                    </li>
                    <li>Shows match score based on skill overlap</li>
                    <li>Searches ALL jobs (active, closed, archived) - nothing deleted!</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default CandidateSearch;