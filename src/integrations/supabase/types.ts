export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_routing_log: {
        Row: {
          confidence_score: number | null
          created_at: string
          final_tenant_id: string | null
          id: string
          overridden_by: string | null
          reasoning: string | null
          submission_id: string
          suggested_tenant_id: string | null
          was_overridden: boolean
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          final_tenant_id?: string | null
          id?: string
          overridden_by?: string | null
          reasoning?: string | null
          submission_id: string
          suggested_tenant_id?: string | null
          was_overridden?: boolean
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          final_tenant_id?: string | null
          id?: string
          overridden_by?: string | null
          reasoning?: string | null
          submission_id?: string
          suggested_tenant_id?: string | null
          was_overridden?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_routing_log_final_tenant_id_fkey"
            columns: ["final_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_routing_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "citizen_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_routing_log_suggested_tenant_id_fkey"
            columns: ["suggested_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      citizen_submissions: {
        Row: {
          ai_category: string | null
          ai_confidence_score: number | null
          ai_processed_at: string | null
          ai_tags: string[] | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_tenant_id: string | null
          created_at: string
          description: string
          detailed_description: string | null
          document_urls: string[] | null
          domain: string
          duplicate_of_id: string | null
          duplicate_similarity_score: number | null
          id: string
          location_block: string | null
          location_district: string
          location_gps: unknown
          location_pincode: string | null
          location_state: string
          location_village: string | null
          photo_urls: string[] | null
          priority: string
          rejection_reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          sub_domain: string | null
          submitter_email: string | null
          submitter_name: string
          submitter_org_name: string | null
          submitter_phone: string | null
          submitter_type: string
          tags: string[] | null
          title: string
          updated_at: string
          upvote_count: number
          user_id: string | null
          video_urls: string[] | null
        }
        Insert: {
          ai_category?: string | null
          ai_confidence_score?: number | null
          ai_processed_at?: string | null
          ai_tags?: string[] | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_tenant_id?: string | null
          created_at?: string
          description: string
          detailed_description?: string | null
          document_urls?: string[] | null
          domain: string
          duplicate_of_id?: string | null
          duplicate_similarity_score?: number | null
          id?: string
          location_block?: string | null
          location_district: string
          location_gps?: unknown
          location_pincode?: string | null
          location_state?: string
          location_village?: string | null
          photo_urls?: string[] | null
          priority?: string
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          sub_domain?: string | null
          submitter_email?: string | null
          submitter_name: string
          submitter_org_name?: string | null
          submitter_phone?: string | null
          submitter_type?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          upvote_count?: number
          user_id?: string | null
          video_urls?: string[] | null
        }
        Update: {
          ai_category?: string | null
          ai_confidence_score?: number | null
          ai_processed_at?: string | null
          ai_tags?: string[] | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_tenant_id?: string | null
          created_at?: string
          description?: string
          detailed_description?: string | null
          document_urls?: string[] | null
          domain?: string
          duplicate_of_id?: string | null
          duplicate_similarity_score?: number | null
          id?: string
          location_block?: string | null
          location_district?: string
          location_gps?: unknown
          location_pincode?: string | null
          location_state?: string
          location_village?: string | null
          photo_urls?: string[] | null
          priority?: string
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          sub_domain?: string | null
          submitter_email?: string | null
          submitter_name?: string
          submitter_org_name?: string | null
          submitter_phone?: string | null
          submitter_type?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          upvote_count?: number
          user_id?: string | null
          video_urls?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "citizen_submissions_assigned_tenant_id_fkey"
            columns: ["assigned_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citizen_submissions_duplicate_of_id_fkey"
            columns: ["duplicate_of_id"]
            isOneToOne: false
            referencedRelation: "citizen_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_settings: {
        Row: {
          id: string
          problems_unlock_at: string | null
          registration_open: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          problems_unlock_at?: string | null
          registration_open?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          problems_unlock_at?: string | null
          registration_open?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string
          event_date: string
          id: string
          location: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          event_date: string
          id?: string
          location: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          event_date?: string
          id?: string
          location?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_metrics: {
        Row: {
          districts_covered: number | null
          funding_raised: number | null
          govt_adopted: boolean
          households_impacted: number | null
          id: string
          ip_filed: number | null
          jobs_created: number | null
          media_coverage_count: number | null
          notes: string | null
          patents_granted: number | null
          people_benefited: number | null
          project_id: string
          startups_created: number | null
          updated_at: string
          villages_covered: number | null
        }
        Insert: {
          districts_covered?: number | null
          funding_raised?: number | null
          govt_adopted?: boolean
          households_impacted?: number | null
          id?: string
          ip_filed?: number | null
          jobs_created?: number | null
          media_coverage_count?: number | null
          notes?: string | null
          patents_granted?: number | null
          people_benefited?: number | null
          project_id: string
          startups_created?: number | null
          updated_at?: string
          villages_covered?: number | null
        }
        Update: {
          districts_covered?: number | null
          funding_raised?: number | null
          govt_adopted?: boolean
          households_impacted?: number | null
          id?: string
          ip_filed?: number | null
          jobs_created?: number | null
          media_coverage_count?: number | null
          notes?: string | null
          patents_granted?: number | null
          people_benefited?: number | null
          project_id?: string
          startups_created?: number | null
          updated_at?: string
          villages_covered?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "impact_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "university_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_partners: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          district: string | null
          domains_of_interest: string[] | null
          id: string
          industry_sector: string | null
          is_verified: boolean
          logo_url: string | null
          name: string
          type: string
          user_id: string | null
          verified_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          domains_of_interest?: string[] | null
          id?: string
          industry_sector?: string | null
          is_verified?: boolean
          logo_url?: string | null
          name: string
          type?: string
          user_id?: string | null
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          domains_of_interest?: string[] | null
          id?: string
          industry_sector?: string | null
          is_verified?: boolean
          logo_url?: string | null
          name?: string
          type?: string
          user_id?: string | null
          verified_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      industry_project_links: {
        Row: {
          agreed_at: string | null
          contribution_details: string | null
          created_at: string
          funding_amount: number | null
          id: string
          industry_id: string
          project_id: string
          status: string
          type: string
        }
        Insert: {
          agreed_at?: string | null
          contribution_details?: string | null
          created_at?: string
          funding_amount?: number | null
          id?: string
          industry_id: string
          project_id: string
          status?: string
          type?: string
        }
        Update: {
          agreed_at?: string | null
          contribution_details?: string | null
          created_at?: string
          funding_amount?: number | null
          id?: string
          industry_id?: string
          project_id?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_project_links_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industry_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "industry_project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "university_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_content: {
        Row: {
          content: Json
          id: string
          page_name: string
          section_key: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          content?: Json
          id?: string
          page_name: string
          section_key: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: string
          page_name?: string
          section_key?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_content_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_statement_remarks: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          problem_statement_id: string
          remark: string
          tenant_id: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          problem_statement_id: string
          remark: string
          tenant_id?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          problem_statement_id?: string
          remark?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "problem_statement_remarks_problem_statement_id_fkey"
            columns: ["problem_statement_id"]
            isOneToOne: true
            referencedRelation: "problem_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_statement_remarks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_statements: {
        Row: {
          approved_at: string | null
          category: string
          created_at: string
          created_by: string | null
          curr_registrations: number
          department: string | null
          department_id: string | null
          description: string
          detailed_description: string | null
          id: string
          max_registrations: number | null
          problem_statement_id: string
          status: string
          submitted_at: string | null
          tenant_id: string | null
          theme: string
          title: string
        }
        Insert: {
          approved_at?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          curr_registrations?: number
          department?: string | null
          department_id?: string | null
          description: string
          detailed_description?: string | null
          id?: string
          max_registrations?: number | null
          problem_statement_id: string
          status?: string
          submitted_at?: string | null
          tenant_id?: string | null
          theme: string
          title: string
        }
        Update: {
          approved_at?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          curr_registrations?: number
          department?: string | null
          department_id?: string | null
          description?: string
          detailed_description?: string | null
          id?: string
          max_registrations?: number | null
          problem_statement_id?: string
          status?: string
          submitted_at?: string | null
          tenant_id?: string | null
          theme?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_problem_dept"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_statements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          message: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "university_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          evidence_url: string | null
          id: string
          project_id: string
          status: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          project_id: string
          status?: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          project_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "university_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_members: {
        Row: {
          id: string
          joined_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "university_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          description: string | null
          file_type: string | null
          file_url: string | null
          id: string
          section_key: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          section_key: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          section_key?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_comments: {
        Row: {
          author_name: string | null
          created_at: string
          id: string
          is_internal: boolean
          message: string
          submission_id: string
          user_id: string | null
        }
        Insert: {
          author_name?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          submission_id: string
          user_id?: string | null
        }
        Update: {
          author_name?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          submission_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_comments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "citizen_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_upvotes: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          submission_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          submission_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          submission_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_upvotes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "citizen_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      team_registrations: {
        Row: {
          created_at: string
          department: string | null
          document_filename: string | null
          document_url: string | null
          email: string | null
          id: string
          member1_department: string | null
          member1_email: string | null
          member1_name: string
          member1_phone: string | null
          member1_roll: string
          member1_year: string | null
          member2_department: string | null
          member2_email: string | null
          member2_name: string | null
          member2_phone: string | null
          member2_roll: string | null
          member2_year: string | null
          member3_department: string | null
          member3_email: string | null
          member3_name: string | null
          member3_phone: string | null
          member3_roll: string | null
          member3_year: string | null
          member4_department: string | null
          member4_email: string | null
          member4_name: string | null
          member4_phone: string | null
          member4_roll: string | null
          member4_year: string | null
          phone: string | null
          problem_id: string
          team_name: string
          tenant_id: string | null
          updated_at: string
          user_id: string
          year: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          document_filename?: string | null
          document_url?: string | null
          email?: string | null
          id?: string
          member1_department?: string | null
          member1_email?: string | null
          member1_name: string
          member1_phone?: string | null
          member1_roll: string
          member1_year?: string | null
          member2_department?: string | null
          member2_email?: string | null
          member2_name?: string | null
          member2_phone?: string | null
          member2_roll?: string | null
          member2_year?: string | null
          member3_department?: string | null
          member3_email?: string | null
          member3_name?: string | null
          member3_phone?: string | null
          member3_roll?: string | null
          member3_year?: string | null
          member4_department?: string | null
          member4_email?: string | null
          member4_name?: string | null
          member4_phone?: string | null
          member4_roll?: string | null
          member4_year?: string | null
          phone?: string | null
          problem_id: string
          team_name: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
          year?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          document_filename?: string | null
          document_url?: string | null
          email?: string | null
          id?: string
          member1_department?: string | null
          member1_email?: string | null
          member1_name?: string
          member1_phone?: string | null
          member1_roll?: string
          member1_year?: string | null
          member2_department?: string | null
          member2_email?: string | null
          member2_name?: string | null
          member2_phone?: string | null
          member2_roll?: string | null
          member2_year?: string | null
          member3_department?: string | null
          member3_email?: string | null
          member3_name?: string | null
          member3_phone?: string | null
          member3_roll?: string | null
          member3_year?: string | null
          member4_department?: string | null
          member4_email?: string | null
          member4_name?: string | null
          member4_phone?: string | null
          member4_roll?: string | null
          member4_year?: string | null
          phone?: string | null
          problem_id?: string
          team_name?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          district: string | null
          expertise_domains: string[] | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          state: string
          type: string
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          district?: string | null
          expertise_domains?: string[] | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          state?: string
          type?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          district?: string | null
          expertise_domains?: string[] | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          state?: string
          type?: string
          website?: string | null
        }
        Relationships: []
      }
      themes: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "themes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      university_projects: {
        Row: {
          actual_end_date: string | null
          created_at: string
          demo_video_url: string | null
          expected_end_date: string | null
          expected_outcomes: string | null
          faculty_mentor_id: string | null
          github_url: string | null
          id: string
          ip_details: string | null
          ip_filed: boolean
          methodology: string | null
          objective: string | null
          proposal_submitted_at: string | null
          proposal_url: string | null
          solution_document_url: string | null
          solution_summary: string | null
          start_date: string | null
          startup_created: boolean
          status: string
          submission_id: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          created_at?: string
          demo_video_url?: string | null
          expected_end_date?: string | null
          expected_outcomes?: string | null
          faculty_mentor_id?: string | null
          github_url?: string | null
          id?: string
          ip_details?: string | null
          ip_filed?: boolean
          methodology?: string | null
          objective?: string | null
          proposal_submitted_at?: string | null
          proposal_url?: string | null
          solution_document_url?: string | null
          solution_summary?: string | null
          start_date?: string | null
          startup_created?: boolean
          status?: string
          submission_id: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          created_at?: string
          demo_video_url?: string | null
          expected_end_date?: string | null
          expected_outcomes?: string | null
          faculty_mentor_id?: string | null
          github_url?: string | null
          id?: string
          ip_details?: string | null
          ip_filed?: boolean
          methodology?: string | null
          objective?: string | null
          proposal_submitted_at?: string | null
          proposal_url?: string | null
          solution_document_url?: string | null
          solution_summary?: string | null
          start_date?: string | null
          startup_created?: boolean
          status?: string
          submission_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "university_projects_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "citizen_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_queries: {
        Row: {
          created_at: string
          id: string
          query_text: string
          resolved_at: string | null
          status: string
          tenant_id: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query_text: string
          resolved_at?: string | null
          status?: string
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query_text?: string
          resolved_at?: string | null
          status?: string
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_queries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "student"
        | "deptadmin"
        | "institution_admin"
        | "department_admin"
        | "citizen"
        | "university_admin"
        | "faculty_mentor"
        | "industry_partner"
        | "govt_officer"
        | "platform_admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "student",
        "deptadmin",
        "institution_admin",
        "department_admin",
        "citizen",
        "university_admin",
        "faculty_mentor",
        "industry_partner",
        "govt_officer",
        "platform_admin",
      ],
    },
  },
} as const
