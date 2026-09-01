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
    PostgrestVersion: '14.5'
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_post_events: {
        Row: {
          actor_id: string | null
          event_type: string
          group_id: string
          id: number
          occurred_at: string
          points: number | null
          post_id: string
        }
        Insert: {
          actor_id?: string | null
          event_type: string
          group_id: string
          id?: never
          occurred_at?: string
          points?: number | null
          post_id: string
        }
        Update: {
          actor_id?: string | null
          event_type?: string
          group_id?: string
          id?: never
          occurred_at?: string
          points?: number | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_post_events_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_post_events_post_id_group_id_fkey'
            columns: ['post_id', 'group_id']
            isOneToOne: false
            referencedRelation: 'activity_post_groups'
            referencedColumns: ['post_id', 'group_id']
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          details: Json
          entity_id: string | null
          entity_type: string
          group_id: string | null
          id: number
          occurred_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          details?: Json
          entity_id?: string | null
          entity_type: string
          group_id?: string | null
          id?: never
          occurred_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          details?: Json
          entity_id?: string | null
          entity_type?: string
          group_id?: string | null
          id?: never
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_events_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_events_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
        ]
      }
      challenge_habits: {
        Row: {
          challenge_id: string
          created_at: string
          habit_id: string
          id: string
          max_submissions_per_day: number
          points: number
        }
        Insert: {
          challenge_id: string
          created_at?: string
          habit_id: string
          id?: string
          max_submissions_per_day?: number
          points: number
        }
        Update: {
          challenge_id?: string
          created_at?: string
          habit_id?: string
          id?: string
          max_submissions_per_day?: number
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: 'challenge_habits_challenge_id_fkey'
            columns: ['challenge_id']
            isOneToOne: false
            referencedRelation: 'challenges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'challenge_habits_habit_id_fkey'
            columns: ['habit_id']
            isOneToOne: false
            referencedRelation: 'habits'
            referencedColumns: ['id']
          },
        ]
      }
      challenge_members: {
        Row: {
          challenge_id: string
          joined_at: string
          status: Database['public']['Enums']['challenge_member_status']
          user_id: string
        }
        Insert: {
          challenge_id: string
          joined_at?: string
          status?: Database['public']['Enums']['challenge_member_status']
          user_id: string
        }
        Update: {
          challenge_id?: string
          joined_at?: string
          status?: Database['public']['Enums']['challenge_member_status']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'challenge_members_challenge_id_fkey'
            columns: ['challenge_id']
            isOneToOne: false
            referencedRelation: 'challenges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'challenge_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      challenge_reviewers: {
        Row: {
          assigned_by: string
          challenge_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          challenge_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          challenge_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'challenge_reviewers_assigned_by_fkey'
            columns: ['assigned_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'challenge_reviewers_challenge_id_fkey'
            columns: ['challenge_id']
            isOneToOne: false
            referencedRelation: 'challenges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'challenge_reviewers_challenge_id_user_id_fkey'
            columns: ['challenge_id', 'user_id']
            isOneToOne: true
            referencedRelation: 'challenge_members'
            referencedColumns: ['challenge_id', 'user_id']
          },
          {
            foreignKeyName: 'challenge_reviewers_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          ends_at: string
          group_id: string
          id: string
          name: string
          participation_mode: string
          review_policy: Database['public']['Enums']['review_policy']
          series_id: string | null
          starts_at: string
          status: Database['public']['Enums']['challenge_status']
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          ends_at: string
          group_id: string
          id?: string
          name: string
          participation_mode?: string
          review_policy?: Database['public']['Enums']['review_policy']
          series_id?: string | null
          starts_at: string
          status?: Database['public']['Enums']['challenge_status']
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string
          group_id?: string
          id?: string
          name?: string
          participation_mode?: string
          review_policy?: Database['public']['Enums']['review_policy']
          series_id?: string | null
          starts_at?: string
          status?: Database['public']['Enums']['challenge_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'challenges_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'challenges_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
        ]
      }
      evidence: {
        Row: {
          created_at: string
          id: string
          media_type: string | null
          sha256: string | null
          size_bytes: number | null
          storage_bucket: string
          storage_path: string
          submission_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type?: string | null
          sha256?: string | null
          size_bytes?: number | null
          storage_bucket?: string
          storage_path: string
          submission_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string | null
          sha256?: string | null
          size_bytes?: number | null
          storage_bucket?: string
          storage_path?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'evidence_submission_id_fkey'
            columns: ['submission_id']
            isOneToOne: false
            referencedRelation: 'submissions'
            referencedColumns: ['id']
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          left_at: string | null
          role: Database['public']['Enums']['group_role']
          status: Database['public']['Enums']['membership_status']
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          left_at?: string | null
          role?: Database['public']['Enums']['group_role']
          status?: Database['public']['Enums']['membership_status']
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          left_at?: string | null
          role?: Database['public']['Enums']['group_role']
          status?: Database['public']['Enums']['membership_status']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'group_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'groups_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      habits: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'habits_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string | null
          expires_at: string
          group_id: string
          id: string
          invited_by: string
          invitee_id: string | null
          role: Database['public']['Enums']['group_role']
          status: Database['public']['Enums']['invite_status']
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          expires_at: string
          group_id: string
          id?: string
          invited_by: string
          invitee_id?: string | null
          role?: Database['public']['Enums']['group_role']
          status?: Database['public']['Enums']['invite_status']
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          group_id?: string
          id?: string
          invited_by?: string
          invitee_id?: string | null
          role?: Database['public']['Enums']['group_role']
          status?: Database['public']['Enums']['invite_status']
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invites_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invites_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invites_invitee_id_fkey'
            columns: ['invitee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: Database['public']['Enums']['notification_type']
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type: Database['public']['Enums']['notification_type']
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: Database['public']['Enums']['notification_type']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      point_transactions: {
        Row: {
          challenge_id: string
          created_at: string
          created_by: string | null
          id: string
          kind: Database['public']['Enums']['point_transaction_kind']
          points: number
          reason: string | null
          reverses_transaction_id: string | null
          submission_id: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database['public']['Enums']['point_transaction_kind']
          points: number
          reason?: string | null
          reverses_transaction_id?: string | null
          submission_id?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database['public']['Enums']['point_transaction_kind']
          points?: number
          reason?: string | null
          reverses_transaction_id?: string | null
          submission_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'point_transactions_challenge_id_fkey'
            columns: ['challenge_id']
            isOneToOne: false
            referencedRelation: 'challenges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'point_transactions_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'point_transactions_reverses_transaction_id_fkey'
            columns: ['reverses_transaction_id']
            isOneToOne: true
            referencedRelation: 'point_transactions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'point_transactions_submission_id_fkey'
            columns: ['submission_id']
            isOneToOne: false
            referencedRelation: 'submissions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'point_transactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          notifications_enabled: boolean
          theme_preference: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          notifications_enabled?: boolean
          theme_preference?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          notifications_enabled?: boolean
          theme_preference?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          decision: Database['public']['Enums']['review_decision']
          id: string
          points: number | null
          reason: string
          reviewer_id: string
          submission_id: string
        }
        Insert: {
          created_at?: string
          decision: Database['public']['Enums']['review_decision']
          id?: string
          points?: number | null
          reason: string
          reviewer_id: string
          submission_id: string
        }
        Update: {
          created_at?: string
          decision?: Database['public']['Enums']['review_decision']
          id?: string
          points?: number | null
          reason?: string
          reviewer_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reviews_reviewer_id_fkey'
            columns: ['reviewer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_submission_id_fkey'
            columns: ['submission_id']
            isOneToOne: false
            referencedRelation: 'submissions'
            referencedColumns: ['id']
          },
        ]
      }
      submission_votes: {
        Row: {
          created_at: string
          decision: Database['public']['Enums']['review_decision']
          reason: string
          submission_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          decision: Database['public']['Enums']['review_decision']
          reason: string
          submission_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          decision?: Database['public']['Enums']['review_decision']
          reason?: string
          submission_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'submission_votes_submission_id_fkey'
            columns: ['submission_id']
            isOneToOne: false
            referencedRelation: 'submissions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'submission_votes_voter_id_fkey'
            columns: ['voter_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      submission_status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database['public']['Enums']['submission_status'] | null
          id: number
          reason: string | null
          submission_id: string
          to_status: Database['public']['Enums']['submission_status']
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database['public']['Enums']['submission_status'] | null
          id?: never
          reason?: string | null
          submission_id: string
          to_status: Database['public']['Enums']['submission_status']
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database['public']['Enums']['submission_status'] | null
          id?: never
          reason?: string | null
          submission_id?: string
          to_status?: Database['public']['Enums']['submission_status']
        }
        Relationships: [
          {
            foreignKeyName: 'submission_status_history_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'submission_status_history_submission_id_fkey'
            columns: ['submission_id']
            isOneToOne: false
            referencedRelation: 'submissions'
            referencedColumns: ['id']
          },
        ]
      }
      submissions: {
        Row: {
          cancelled_at: string | null
          challenge_habit_id: string
          challenge_id: string
          id: string
          note: string | null
          occurred_on: string
          resolved_at: string | null
          status: Database['public']['Enums']['submission_status']
          submitted_at: string
          submitter_id: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          challenge_habit_id: string
          challenge_id: string
          id?: string
          note?: string | null
          occurred_on?: string
          resolved_at?: string | null
          status?: Database['public']['Enums']['submission_status']
          submitted_at?: string
          submitter_id: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          challenge_habit_id?: string
          challenge_id?: string
          id?: string
          note?: string | null
          occurred_on?: string
          resolved_at?: string | null
          status?: Database['public']['Enums']['submission_status']
          submitted_at?: string
          submitter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'submissions_challenge_habit_id_challenge_id_fkey'
            columns: ['challenge_habit_id', 'challenge_id']
            isOneToOne: false
            referencedRelation: 'challenge_habits'
            referencedColumns: ['id', 'challenge_id']
          },
          {
            foreignKeyName: 'submissions_challenge_id_submitter_id_fkey'
            columns: ['challenge_id', 'submitter_id']
            isOneToOne: false
            referencedRelation: 'challenge_members'
            referencedColumns: ['challenge_id', 'user_id']
          },
          {
            foreignKeyName: 'submissions_submitter_id_fkey'
            columns: ['submitter_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_challenge_activity_post: {
        Args: {
          p_challenge_id: string
          p_name: string
          p_photo_path: string
          p_suggested_points: number
        }
        Returns: string
      }
      create_group_challenge_invites: {
        Args: {
          p_description: string
          p_ends_at: string
          p_group_ids: string[]
          p_name: string
          p_review_policy?: Database['public']['Enums']['review_policy']
          p_starts_at: string
        }
        Returns: string[]
      }
      create_activity_post: {
        Args: {
          p_name: string
          p_photo_path: string
          p_suggested_points: number
        }
        Returns: string
      }
      create_activity_post_for_groups: {
        Args: {
          p_group_ids: string[]
          p_name: string
          p_photo_path: string
          p_suggested_points: number
        }
        Returns: string
      }
      accept_group_invite: { Args: { p_token: string }; Returns: string }
      cancel_submission: {
        Args: { p_reason?: string; p_submission_id: string }
        Returns: {
          cancelled_at: string | null
          challenge_habit_id: string
          challenge_id: string
          id: string
          note: string | null
          occurred_on: string
          resolved_at: string | null
          status: Database['public']['Enums']['submission_status']
          submitted_at: string
          submitter_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'submissions'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_group_invite: {
        Args: {
          p_email?: string
          p_expires_in?: string
          p_group_id: string
          p_role?: Database['public']['Enums']['group_role']
        }
        Returns: string
      }
      create_global_habit: {
        Args: {
          p_description: string
          p_max_submissions_per_day: number
          p_name: string
          p_points: number
        }
        Returns: Json
      }
      create_group: {
        Args: {
          p_description: string
          p_name: string
          p_timezone: string
        }
        Returns: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'groups'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      correct_point_transaction: {
        Args: {
          p_corrected_points: number
          p_reason: string
          p_transaction_id: string
        }
        Returns: Json
      }
      dispute_submission: {
        Args: { p_reason: string; p_submission_id: string }
        Returns: {
          cancelled_at: string | null
          challenge_habit_id: string
          challenge_id: string
          id: string
          note: string | null
          occurred_on: string
          resolved_at: string | null
          status: Database['public']['Enums']['submission_status']
          submitted_at: string
          submitter_id: string
          updated_at: string
        }
      }
      get_challenge_ranking: {
        Args: { p_challenge_id: string; p_period?: string }
        Returns: {
          avatar_url: string
          display_name: string
          points: number
          rank: number
          user_id: string
        }[]
      }
      get_my_groups: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          timezone: string
          updated_at: string
        }[]
      }
      get_my_challenge_hub: {
        Args: Record<PropertyKey, never>
        Returns: {
          challenge_id: string
          description: string | null
          ends_at: string
          group_id: string
          group_name: string
          is_creator: boolean
          is_participant: boolean
          name: string
          participant_count: number
          participation_mode: string
          series_id: string | null
          starts_at: string
          status: Database['public']['Enums']['challenge_status']
        }[]
      }
      get_my_weekly_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_days: number
          approved_activities: number
          current_streak: number
          group_id: string
          group_name: string
          net_points: number
          timezone: string
          week_end: string
          week_start: string
        }[]
      }
      get_group_feed: {
        Args: { p_group_id: string }
        Returns: {
          activity_name: string
          approvals: number
          author_avatar_url: string | null
          author_id: string
          author_name: string
          created_at: string
          current_points: number
          has_voted: boolean
          matching_proposals: number
          photo_path: string
          post_id: string
          proposals: Json
          rejections: number
          required_votes: number
          status: string
          suggested_points: number
        }[]
      }
      get_group_activity_history: {
        Args: { p_group_id: string }
        Returns: {
          actor_id: string | null
          actor_name: string
          event_id: number
          event_type: string
          occurred_at: string
          points: number | null
          post_id: string
        }[]
      }
      get_challenge_activity_feed: {
        Args: { p_challenge_id: string }
        Returns: {
          activity_name: string
          approvals: number
          author_avatar_url: string | null
          author_id: string
          author_name: string
          created_at: string
          has_voted: boolean
          photo_path: string
          post_id: string
          rejections: number
          required_votes: number
          status: string
          suggested_points: number
        }[]
      }
      get_group_leaderboard: {
        Args: { p_group_id: string }
        Returns: {
          user_id: string
          display_name: string
          avatar_url: string | null
          points: number
          rank: number
        }[]
      }
      get_my_activity_calendar: {
        Args: { p_from: string; p_to: string }
        Returns: {
          post_id: string
          group_id: string
          activity_name: string
          group_name: string
          timezone: string
          occurred_on: string
          submitted_at: string
          resolved_at: string | null
          status: 'pending' | 'approved' | 'rejected'
        }[]
      }
      get_review_queue: {
        Args: { p_challenge_id: string }
        Returns: {
          cancelled_at: string | null
          challenge_habit_id: string
          challenge_id: string
          id: string
          note: string | null
          occurred_on: string
          resolved_at: string | null
          status: Database['public']['Enums']['submission_status']
          submitted_at: string
          submitter_id: string
          updated_at: string
        }[]
      }
      join_group_challenge: {
        Args: { p_challenge_id: string }
        Returns: Database['public']['Tables']['challenge_members']['Row']
      }
      is_active_group_member: { Args: { p_group_id: string }; Returns: boolean }
      is_challenge_member: {
        Args: { p_challenge_id: string }
        Returns: boolean
      }
      is_group_admin: { Args: { p_group_id: string }; Returns: boolean }
      manage_group_member: {
        Args: {
          p_action: string
          p_group_id: string
          p_role?: Database['public']['Enums']['group_role'] | null
          p_user_id: string
        }
        Returns: {
          group_id: string
          joined_at: string
          left_at: string | null
          role: Database['public']['Enums']['group_role']
          status: Database['public']['Enums']['membership_status']
          user_id: string
        }
      }
      leave_group: {
        Args: { p_group_id: string; p_successor_id?: string | null }
        Returns: Database['public']['Tables']['group_members']['Row']
      }
      update_group_settings: {
        Args: {
          p_description: string
          p_group_id: string
          p_name: string
          p_timezone: string
        }
        Returns: Database['public']['Tables']['groups']['Row']
      }
      reverse_point_transaction: {
        Args: { p_reason: string; p_transaction_id: string }
        Returns: {
          challenge_id: string
          created_at: string
          created_by: string | null
          id: string
          kind: Database['public']['Enums']['point_transaction_kind']
          points: number
          reason: string | null
          reverses_transaction_id: string | null
          submission_id: string | null
          user_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'point_transactions'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_profile: {
        Args: {
          p_avatar_url: string
          p_display_name: string
          p_notifications_enabled: boolean
          p_theme_preference: string
        }
        Returns: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          notifications_enabled: boolean
          theme_preference: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'profiles'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_submission: {
        Args: {
          p_decision: Database['public']['Enums']['review_decision']
          p_points: number | null
          p_reason: string
          p_submission_id: string
        }
        Returns: {
          cancelled_at: string | null
          challenge_habit_id: string
          challenge_id: string
          id: string
          note: string | null
          occurred_on: string
          resolved_at: string | null
          status: Database['public']['Enums']['submission_status']
          submitted_at: string
          submitter_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'submissions'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      vote_submission: {
        Args: {
          p_decision: Database['public']['Enums']['review_decision']
          p_reason: string
          p_submission_id: string
        }
        Returns: {
          cancelled_at: string | null
          challenge_habit_id: string
          challenge_id: string
          id: string
          note: string | null
          occurred_on: string
          resolved_at: string | null
          status: Database['public']['Enums']['submission_status']
          submitted_at: string
          submitter_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'submissions'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      vote_activity_post: {
        Args: { p_decision: string; p_group_id: string; p_post_id: string }
        Returns: string
      }
      delete_activity_post: {
        Args: { p_post_id: string }
        Returns: string
      }
      propose_activity_points: {
        Args: { p_group_id: string; p_points: number; p_post_id: string }
        Returns: string
      }
    }
    Enums: {
      challenge_member_status: 'active' | 'left' | 'removed'
      challenge_status: 'draft' | 'active' | 'completed' | 'cancelled'
      group_role: 'member' | 'admin' | 'owner'
      invite_status: 'pending' | 'accepted' | 'revoked' | 'expired'
      membership_status: 'pending' | 'active' | 'left' | 'removed'
      notification_type:
        'invite' | 'submission' | 'review' | 'challenge' | 'points' | 'system'
      point_transaction_kind: 'award' | 'reversal' | 'adjustment'
      review_decision: 'approved' | 'rejected' | 'cancelled' | 'disputed'
      review_policy: 'any_other_member' | 'admins_only' | 'selected_reviewers'
      submission_status:
        'pending' | 'approved' | 'rejected' | 'cancelled' | 'disputed'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      challenge_member_status: ['active', 'left', 'removed'],
      challenge_status: ['draft', 'active', 'completed', 'cancelled'],
      group_role: ['member', 'admin', 'owner'],
      invite_status: ['pending', 'accepted', 'revoked', 'expired'],
      membership_status: ['pending', 'active', 'left', 'removed'],
      notification_type: [
        'invite',
        'submission',
        'review',
        'challenge',
        'points',
        'system',
      ],
      point_transaction_kind: ['award', 'reversal', 'adjustment'],
      review_decision: ['approved', 'rejected', 'cancelled', 'disputed'],
      review_policy: ['any_other_member', 'admins_only', 'selected_reviewers'],
      submission_status: [
        'pending',
        'approved',
        'rejected',
        'cancelled',
        'disputed',
      ],
    },
  },
} as const
