export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      event_demographics_history: {
        Row: {
          age_average: number | null
          age_max: number | null
          age_min: number | null
          calculated_at: string
          created_at: string
          event_id: string
          gender_agender: number
          gender_cis: number
          gender_other_percentage: number
          gender_other_values: string[] | null
          gender_trans: number
          id: string
          orientation_ace_demi: number
          orientation_bi_pan: number
          orientation_homo: number
          orientation_other_percentage: number
          orientation_other_values: string[] | null
          orientation_straight: number
          race_color_black: number
          race_color_brown: number
          race_color_indigenous: number
          race_color_other_percentage: number
          race_color_other_values: string[] | null
          race_color_white: number
          race_color_yellow: number
          total: number
          veteran_no: number
          veteran_yes: number
        }
        Insert: {
          age_average?: number | null
          age_max?: number | null
          age_min?: number | null
          calculated_at?: string
          created_at?: string
          event_id: string
          gender_agender?: number
          gender_cis?: number
          gender_other_percentage?: number
          gender_other_values?: string[] | null
          gender_trans?: number
          id?: string
          orientation_ace_demi?: number
          orientation_bi_pan?: number
          orientation_homo?: number
          orientation_other_percentage?: number
          orientation_other_values?: string[] | null
          orientation_straight?: number
          race_color_black?: number
          race_color_brown?: number
          race_color_indigenous?: number
          race_color_other_percentage?: number
          race_color_other_values?: string[] | null
          race_color_white?: number
          race_color_yellow?: number
          total?: number
          veteran_no?: number
          veteran_yes?: number
        }
        Update: {
          age_average?: number | null
          age_max?: number | null
          age_min?: number | null
          calculated_at?: string
          created_at?: string
          event_id?: string
          gender_agender?: number
          gender_cis?: number
          gender_other_percentage?: number
          gender_other_values?: string[] | null
          gender_trans?: number
          id?: string
          orientation_ace_demi?: number
          orientation_bi_pan?: number
          orientation_homo?: number
          orientation_other_percentage?: number
          orientation_other_values?: string[] | null
          orientation_straight?: number
          race_color_black?: number
          race_color_brown?: number
          race_color_indigenous?: number
          race_color_other_percentage?: number
          race_color_other_values?: string[] | null
          race_color_white?: number
          race_color_yellow?: number
          total?: number
          veteran_no?: number
          veteran_yes?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_demographics_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          admin_general_notes: string | null
          application_date: string
          application_status: Database["public"]["Enums"]["application_status_enum"]
          attendance_status: Database["public"]["Enums"]["attendance_status_enum"]
          bond: string | null
          cancellation_date: string | null
          companions: string | null
          created_at: string
          event_id: string
          has_paid: boolean
          id: string
          is_user_applied: boolean
          notes: string | null
          payment: number
          profile_id: string | null
          referrals: string | null
          referred: string
          spot_type: Database["public"]["Enums"]["spot_type"]
        }
        Insert: {
          admin_general_notes?: string | null
          application_date?: string
          application_status?: Database["public"]["Enums"]["application_status_enum"]
          attendance_status?: Database["public"]["Enums"]["attendance_status_enum"]
          bond?: string | null
          cancellation_date?: string | null
          companions?: string | null
          created_at?: string
          event_id: string
          has_paid?: boolean
          id?: string
          is_user_applied?: boolean
          notes?: string | null
          payment?: number
          profile_id?: string | null
          referrals?: string | null
          referred?: string
          spot_type?: Database["public"]["Enums"]["spot_type"]
        }
        Update: {
          admin_general_notes?: string | null
          application_date?: string
          application_status?: Database["public"]["Enums"]["application_status_enum"]
          attendance_status?: Database["public"]["Enums"]["attendance_status_enum"]
          bond?: string | null
          cancellation_date?: string | null
          companions?: string | null
          created_at?: string
          event_id?: string
          has_paid?: boolean
          id?: string
          is_user_applied?: boolean
          notes?: string | null
          payment?: number
          profile_id?: string | null
          referrals?: string | null
          referred?: string
          spot_type?: Database["public"]["Enums"]["spot_type"]
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminders: {
        Row: {
          created_at: string
          email_sent: boolean
          email_sent_date: string | null
          event_id: string
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          email_sent?: boolean
          email_sent_date?: string | null
          event_id: string
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          email_sent?: boolean
          email_sent_date?: string | null
          event_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reminders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          auto_publish: boolean
          created_at: string
          description: string | null
          emoji: string | null
          event_status: Database["public"]["Enums"]["event_status"]
          event_type: Database["public"]["Enums"]["event_type_enum"]
          id: string
          location: string | null
          ticket_price: number | null
          time_application_end: string | null
          time_application_start: string | null
          time_event_end: string | null
          time_event_start: string | null
          time_group_end: string | null
          time_group_start: string | null
          time_interviews_end: string | null
          time_interviews_start: string | null
          time_payment_end: string | null
          time_payment_start: string | null
          title: string | null
          total_spots: number | null
        }
        Insert: {
          auto_publish?: boolean
          created_at?: string
          description?: string | null
          emoji?: string | null
          event_status?: Database["public"]["Enums"]["event_status"]
          event_type?: Database["public"]["Enums"]["event_type_enum"]
          id?: string
          location?: string | null
          ticket_price?: number | null
          time_application_end?: string | null
          time_application_start?: string | null
          time_event_end?: string | null
          time_event_start?: string | null
          time_group_end?: string | null
          time_group_start?: string | null
          time_interviews_end?: string | null
          time_interviews_start?: string | null
          time_payment_end?: string | null
          time_payment_start?: string | null
          title?: string | null
          total_spots?: number | null
        }
        Update: {
          auto_publish?: boolean
          created_at?: string
          description?: string | null
          emoji?: string | null
          event_status?: Database["public"]["Enums"]["event_status"]
          event_type?: Database["public"]["Enums"]["event_type_enum"]
          id?: string
          location?: string | null
          ticket_price?: number | null
          time_application_end?: string | null
          time_application_start?: string | null
          time_event_end?: string | null
          time_event_start?: string | null
          time_group_end?: string | null
          time_group_start?: string | null
          time_interviews_end?: string | null
          time_interviews_start?: string | null
          time_payment_end?: string | null
          time_payment_start?: string | null
          title?: string | null
          total_spots?: number | null
        }
        Relationships: []
      }
      newsletter_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          newsletter_id: string
          processed_at: string | null
          profile_id: string
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          newsletter_id: string
          processed_at?: string | null
          profile_id: string
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          newsletter_id?: string
          processed_at?: string | null
          profile_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_queue_newsletter_id_fkey"
            columns: ["newsletter_id"]
            isOneToOne: false
            referencedRelation: "newsletters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_queue_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_segment_counts: {
        Row: {
          count: number
          description: string
          segment_key: string
          segment_name: string
          updated_at: string | null
        }
        Insert: {
          count?: number
          description: string
          segment_key: string
          segment_name: string
          updated_at?: string | null
        }
        Update: {
          count?: number
          description?: string
          segment_key?: string
          segment_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      newsletter_sends: {
        Row: {
          error_message: string | null
          id: string
          newsletter_id: string
          profile_id: string
          sent_at: string
          status: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          newsletter_id: string
          profile_id: string
          sent_at?: string
          status: string
        }
        Update: {
          error_message?: string | null
          id?: string
          newsletter_id?: string
          profile_id?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_sends_newsletter_id_fkey"
            columns: ["newsletter_id"]
            isOneToOne: false
            referencedRelation: "newsletters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_sends_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletters: {
        Row: {
          content_mdx: string
          created_at: string
          created_by: string | null
          exclude_rejected: boolean
          expected_recipient_count: number | null
          failed_sends: number | null
          id: string
          scheduled_at: string | null
          segment_filter: Json | null
          send_completed_at: string | null
          send_started_at: string | null
          sent_at: string | null
          status: string
          subject: string
          successful_sends: number | null
          template_name: string
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          content_mdx: string
          created_at?: string
          created_by?: string | null
          exclude_rejected?: boolean
          expected_recipient_count?: number | null
          failed_sends?: number | null
          id?: string
          scheduled_at?: string | null
          segment_filter?: Json | null
          send_completed_at?: string | null
          send_started_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          successful_sends?: number | null
          template_name: string
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          content_mdx?: string
          created_at?: string
          created_by?: string | null
          exclude_rejected?: boolean
          expected_recipient_count?: number | null
          failed_sends?: number | null
          id?: string
          scheduled_at?: string | null
          segment_filter?: Json | null
          send_completed_at?: string | null
          send_started_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          successful_sends?: number | null
          template_name?: string
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allow_marketing_email: boolean | null
          approved_to_attend: Database["public"]["Enums"]["approved_to_attend_enum"]
          basic_data_filled: boolean
          became_veteran_date: string | null
          cpf: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          flag: Database["public"]["Enums"]["profile_flag_enum"]
          flag_notes: string | null
          full_name: string | null
          gender: string[] | null
          general_notes: string | null
          how_came_to_us: string | null
          id: string
          is_veteran: boolean | null
          orientation: string[] | null
          phone: number | null
          pronouns: string[] | null
          race_color: string[] | null
          rg: string | null
          rg_issuer: string | null
          social_name: string | null
          user_id: string | null
          where_lives: string | null
        }
        Insert: {
          allow_marketing_email?: boolean | null
          approved_to_attend?: Database["public"]["Enums"]["approved_to_attend_enum"]
          basic_data_filled?: boolean
          became_veteran_date?: string | null
          cpf?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          flag?: Database["public"]["Enums"]["profile_flag_enum"]
          flag_notes?: string | null
          full_name?: string | null
          gender?: string[] | null
          general_notes?: string | null
          how_came_to_us?: string | null
          id?: string
          is_veteran?: boolean | null
          orientation?: string[] | null
          phone?: number | null
          pronouns?: string[] | null
          race_color?: string[] | null
          rg?: string | null
          rg_issuer?: string | null
          social_name?: string | null
          user_id?: string | null
          where_lives?: string | null
        }
        Update: {
          allow_marketing_email?: boolean | null
          approved_to_attend?: Database["public"]["Enums"]["approved_to_attend_enum"]
          basic_data_filled?: boolean
          became_veteran_date?: string | null
          cpf?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          flag?: Database["public"]["Enums"]["profile_flag_enum"]
          flag_notes?: string | null
          full_name?: string | null
          gender?: string[] | null
          general_notes?: string | null
          how_came_to_us?: string | null
          id?: string
          is_veteran?: boolean | null
          orientation?: string[] | null
          phone?: number | null
          pronouns?: string[] | null
          race_color?: string[] | null
          rg?: string | null
          rg_issuer?: string | null
          social_name?: string | null
          user_id?: string | null
          where_lives?: string | null
        }
        Relationships: []
      }
      unsubscribe_logs: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown
          profile_id: string
          source: string
          unsubscribed_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: unknown
          profile_id: string
          source?: string
          unsubscribed_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown
          profile_id?: string
          source?: string
          unsubscribed_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unsubscribe_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          role_name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user_role: {
        Args: { p_role_name: string; p_user_id: string }
        Returns: undefined
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      get_admin_user_ids: { Args: never; Returns: string[] }
      get_profile_with_roles: {
        Args: { user_id_input: string }
        Returns: {
          allow_marketing_email: boolean
          basic_data_filled: boolean
          cpf: string
          created_at: string
          date_of_birth: string
          email: string
          full_name: string
          gender: string[]
          how_came_to_us: string
          id: string
          is_admin: boolean
          orientation: string[]
          phone: number
          pronouns: string[]
          race_color: string[]
          rg: string
          rg_issuer: string
          roles: string[]
          social_name: string
          where_lives: string
        }[]
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      trigger_newsletter_processing: { Args: never; Returns: Json }
      update_event_statuses_automatically: { Args: never; Returns: Json }
      update_newsletter_segment_counts: { Args: never; Returns: undefined }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      application_status_enum:
        | "pending"
        | "talking"
        | "sent_payment_data"
        | "sent_rules"
        | "think_better"
        | "finalised"
      approved_to_attend_enum:
        | "pending"
        | "approved"
        | "approved_with_reservations"
        | "rejected"
      attendance_status_enum:
        | "pending"
        | "attended"
        | "not-attended"
        | "skipped"
        | "will-not-go"
      event_status:
        | "Draft"
        | "Completed"
        | "Cancelled"
        | "Scheduled"
        | "Registration Closed"
        | "Registration Open"
      event_type_enum: "regular" | "bdsm"
      profile_flag_enum: "none" | "yellow" | "red"
      spot_type: "regular" | "social" | "staff"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
    Enums: {
      application_status_enum: [
        "pending",
        "talking",
        "sent_payment_data",
        "sent_rules",
        "think_better",
        "finalised",
      ],
      approved_to_attend_enum: [
        "pending",
        "approved",
        "approved_with_reservations",
        "rejected",
      ],
      attendance_status_enum: [
        "pending",
        "attended",
        "not-attended",
        "skipped",
        "will-not-go",
      ],
      event_status: [
        "Draft",
        "Completed",
        "Cancelled",
        "Scheduled",
        "Registration Closed",
        "Registration Open",
      ],
      event_type_enum: ["regular", "bdsm"],
      profile_flag_enum: ["none", "yellow", "red"],
      spot_type: ["regular", "social", "staff"],
    },
  },
} as const
