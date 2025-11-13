export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    __InternalSupabase: {
        PostgrestVersion: "13.0.5"
    }
    public: {
        Tables: {
            Applicant: {
                Row: {
                    ai_score: number | null
                    created_at: string | null
                    cv_file_url: string | null
                    email: string
                    id: string
                    interview_date: string | null
                    interview_result: string | null
                    interview_status: string | null
                    job_id: string
                    name: string
                    notes: string | null
                    phone: string | null
                    status: string | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    ai_score?: number | null
                    created_at?: string | null
                    cv_file_url?: string | null
                    email: string
                    id?: string
                    interview_date?: string | null
                    interview_result?: string | null
                    interview_status?: string | null
                    job_id: string
                    name: string
                    notes?: string | null
                    phone?: string | null
                    status?: string | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    ai_score?: number | null
                    created_at?: string | null
                    cv_file_url?: string | null
                    email?: string
                    id?: string
                    interview_date?: string | null
                    interview_result?: string | null
                    interview_status?: string | null
                    job_id?: string
                    name?: string
                    notes?: string | null
                    phone?: string | null
                    status?: string | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "candidates_job_id_fkey"
                        columns: ["job_id"]
                        isOneToOne: false
                        referencedRelation: "jobs"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Client: {
                Row: {
                    ai_score: number | null
                    applied_via_linkedin: boolean | null
                    created_at: string | null
                    cv_file_url: string | null
                    email: string
                    id: string
                    interview_date: string | null
                    interview_result: string | null
                    interview_status: string | null
                    job_id: string
                    linkedin_application_id: string | null
                    linkedin_profile_url: string | null
                    name: string
                    notes: string | null
                    phone: string | null
                    source_linkedin: boolean | null
                    status: string | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    ai_score?: number | null
                    applied_via_linkedin?: boolean | null
                    created_at?: string | null
                    cv_file_url?: string | null
                    email: string
                    id?: string
                    interview_date?: string | null
                    interview_result?: string | null
                    interview_status?: string | null
                    job_id: string
                    linkedin_application_id?: string | null
                    linkedin_profile_url?: string | null
                    name: string
                    notes?: string | null
                    phone?: string | null
                    source_linkedin?: boolean | null
                    status?: string | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    ai_score?: number | null
                    applied_via_linkedin?: boolean | null
                    created_at?: string | null
                    cv_file_url?: string | null
                    email?: string
                    id?: string
                    interview_date?: string | null
                    interview_result?: string | null
                    interview_status?: string | null
                    job_id?: string
                    linkedin_application_id?: string | null
                    linkedin_profile_url?: string | null
                    name?: string
                    notes?: string | null
                    phone?: string | null
                    source_linkedin?: boolean | null
                    status?: string | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "client_job_id_fkey"
                        columns: ["job_id"]
                        isOneToOne: false
                        referencedRelation: "jobs"
                        referencedColumns: ["id"]
                    },
                ]
            }
            "Qualified For Final Interview": {
                Row: {
                    "AI Generated Question": string | null
                    ai_score: number | null
                    created_at: string | null
                    cv_file_url: string | null
                    email: string
                    id: string
                    interview_date: string | null
                    interview_result: string | null
                    interview_status: string | null
                    job_id: string
                    name: string
                    notes: string | null
                    phone: string | null
                    "Question Ask by Client": string | null
                    status: string | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    "AI Generated Question"?: string | null
                    ai_score?: number | null
                    created_at?: string | null
                    cv_file_url?: string | null
                    email: string
                    id?: string
                    interview_date?: string | null
                    interview_result?: string | null
                    interview_status?: string | null
                    job_id: string
                    name: string
                    notes?: string | null
                    phone?: string | null
                    "Question Ask by Client"?: string | null
                    status?: string | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    "AI Generated Question"?: string | null
                    ai_score?: number | null
                    created_at?: string | null
                    cv_file_url?: string | null
                    email?: string
                    id?: string
                    interview_date?: string | null
                    interview_result?: string | null
                    interview_status?: string | null
                    job_id?: string
                    name?: string
                    notes?: string | null
                    phone?: string | null
                    "Question Ask by Client"?: string | null
                    status?: string | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "qualified_final_interview_job_id_fkey"
                        columns: ["job_id"]
                        isOneToOne: false
                        referencedRelation: "jobs"
                        referencedColumns: ["id"]
                    },
                ]
            }
            "Shortlisted candidates": {
                Row: {
                    ai_score: number | null
                    created_at: string | null
                    cv_file_url: string | null
                    email: string
                    id: string
                    interview_date: string | null
                    interview_result: string | null
                    interview_status: string | null
                    job_id: string
                    name: string
                    notes: string | null
                    phone: string | null
                    status: string | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    ai_score?: number | null
                    created_at?: string | null
                    cv_file_url?: string | null
                    email: string
                    id?: string
                    interview_date?: string | null
                    interview_result?: string | null
                    interview_status?: string | null
                    job_id: string
                    name: string
                    notes?: string | null
                    phone?: string | null
                    status?: string | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    ai_score?: number | null
                    created_at?: string | null
                    cv_file_url?: string | null
                    email?: string
                    id?: string
                    interview_date?: string | null
                    interview_result?: string | null
                    interview_status?: string | null
                    job_id?: string
                    name?: string
                    notes?: string | null
                    phone?: string | null
                    status?: string | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "shortlisted_candidates_job_id_fkey"
                        columns: ["job_id"]
                        isOneToOne: false
                        referencedRelation: "jobs"
                        referencedColumns: ["id"]
                    },
                ]
            }
            gmail_connections: {
                Row: {
                    access_token: string | null
                    created_at: string | null
                    expires_at: string | null
                    id: string
                    is_active: boolean | null
                    refresh_token: string | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    access_token?: string | null
                    created_at?: string | null
                    expires_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    refresh_token?: string | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    access_token?: string | null
                    created_at?: string | null
                    expires_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    refresh_token?: string | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            jobs: {
                Row: {
                    application_deadline: string | null
                    city: string | null
                    close_date: string | null
                    closed_at: string | null
                    country: string | null
                    created_at: string | null
                    department: string | null
                    description: string | null
                    experience_required: string | null
                    id: string
                    job_level: string | null
                    job_type: string | null
                    linkedin_organization_id: string | null
                    linkedin_post_id: string | null
                    linkedin_post_url: string | null
                    linkedin_posted_at: string | null
                    linkedin_url: string | null
                    location: string | null
                    location_type: string | null
                    positions_available: number | null
                    posted_to_linkedin: boolean | null
                    preferred_skills: string[] | null
                    questions: string | null
                    required_skills: string[] | null
                    salary_currency: string | null
                    salary_max: number | null
                    salary_min: number | null
                    salary_range: string | null
                    status: string | null
                    title: string
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    application_deadline?: string | null
                    city?: string | null
                    close_date?: string | null
                    closed_at?: string | null
                    country?: string | null
                    created_at?: string | null
                    department?: string | null
                    description?: string | null
                    experience_required?: string | null
                    id?: string
                    job_level?: string | null
                    job_type?: string | null
                    linkedin_organization_id?: string | null
                    linkedin_post_id?: string | null
                    linkedin_post_url?: string | null
                    linkedin_posted_at?: string | null
                    linkedin_url?: string | null
                    location?: string | null
                    location_type?: string | null
                    positions_available?: number | null
                    posted_to_linkedin?: boolean | null
                    preferred_skills?: string[] | null
                    questions?: string | null
                    required_skills?: string[] | null
                    salary_currency?: string | null
                    salary_max?: number | null
                    salary_min?: number | null
                    salary_range?: string | null
                    status?: string | null
                    title: string
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    application_deadline?: string | null
                    city?: string | null
                    close_date?: string | null
                    closed_at?: string | null
                    country?: string | null
                    created_at?: string | null
                    department?: string | null
                    description?: string | null
                    experience_required?: string | null
                    id?: string
                    job_level?: string | null
                    job_type?: string | null
                    linkedin_organization_id?: string | null
                    linkedin_post_id?: string | null
                    linkedin_post_url?: string | null
                    linkedin_posted_at?: string | null
                    linkedin_url?: string | null
                    location?: string | null
                    location_type?: string | null
                    positions_available?: number | null
                    posted_to_linkedin?: boolean | null
                    preferred_skills?: string[] | null
                    questions?: string | null
                    required_skills?: string[] | null
                    salary_currency?: string | null
                    salary_max?: number | null
                    salary_min?: number | null
                    salary_range?: string | null
                    status?: string | null
                    title?: string
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            linkedin_connections: {
                Row: {
                    access_token: string | null
                    connected_at: string | null
                    expires_at: string | null
                    id: string
                    refresh_token: string | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    access_token?: string | null
                    connected_at?: string | null
                    expires_at?: string | null
                    id?: string
                    refresh_token?: string | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    access_token?: string | null
                    connected_at?: string | null
                    expires_at?: string | null
                    id?: string
                    refresh_token?: string | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    company_name: string | null
                    created_at: string | null
                    email: string
                    full_name: string
                    gmail_access_token: string | null
                    gmail_connected_at: string | null
                    gmail_refresh_token: string | null
                    gmail_token_expires_at: string | null
                    id: string
                    linkedin_access_token: string | null
                    linkedin_company_id: string | null
                    linkedin_connected: boolean | null
                    linkedin_connected_at: string | null
                    linkedin_organization_id: string | null
                    linkedin_refresh_token: string | null
                    linkedin_token_expires_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    company_name?: string | null
                    created_at?: string | null
                    email: string
                    full_name: string
                    gmail_access_token?: string | null
                    gmail_connected_at?: string | null
                    gmail_refresh_token?: string | null
                    gmail_token_expires_at?: string | null
                    id: string
                    linkedin_access_token?: string | null
                    linkedin_company_id?: string | null
                    linkedin_connected?: boolean | null
                    linkedin_connected_at?: string | null
                    linkedin_organization_id?: string | null
                    linkedin_refresh_token?: string | null
                    linkedin_token_expires_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    company_name?: string | null
                    created_at?: string | null
                    email?: string
                    full_name?: string
                    gmail_access_token?: string | null
                    gmail_connected_at?: string | null
                    gmail_refresh_token?: string | null
                    gmail_token_expires_at?: string | null
                    id?: string
                    linkedin_access_token?: string | null
                    linkedin_company_id?: string | null
                    linkedin_connected?: boolean | null
                    linkedin_connected_at?: string | null
                    linkedin_organization_id?: string | null
                    linkedin_refresh_token?: string | null
                    linkedin_token_expires_at?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            upload_links: {
                Row: {
                    created_at: string
                    expires_at: string | null
                    id: string
                    is_active: boolean
                    job_id: string | null
                    link_code: string
                    upload_count: number
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    expires_at?: string | null
                    id?: string
                    is_active?: boolean
                    job_id?: string | null
                    link_code: string
                    upload_count?: number
                    user_id: string
                }
                Update: {
                    created_at?: string
                    expires_at?: string | null
                    id?: string
                    is_active?: boolean
                    job_id?: string | null
                    link_code?: string
                    upload_count?: number
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "upload_links_job_id_fkey"
                        columns: ["job_id"]
                        isOneToOne: false
                        referencedRelation: "jobs"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
    DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
    public: {
        Enums: {},
    },
} as const