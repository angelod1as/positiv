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
      event_newsletter_campaigns: {
        Row: {
          campaign_creation_time: string | null
          campaign_id: string | null
          campaign_is_created: boolean
          campaign_is_sent: boolean
          campaign_sent_time: string | null
          created_at: string
          event_id: string
          id: string
          last_attempt: string | null
          last_error: Json | null
          times_attempted: number
          updated_at: string
        }
        Insert: {
          campaign_creation_time?: string | null
          campaign_id?: string | null
          campaign_is_created?: boolean
          campaign_is_sent?: boolean
          campaign_sent_time?: string | null
          created_at?: string
          event_id: string
          id?: string
          last_attempt?: string | null
          last_error?: Json | null
          times_attempted?: number
          updated_at?: string
        }
        Update: {
          campaign_creation_time?: string | null
          campaign_id?: string | null
          campaign_is_created?: boolean
          campaign_is_sent?: boolean
          campaign_sent_time?: string | null
          created_at?: string
          event_id?: string
          id?: string
          last_attempt?: string | null
          last_error?: Json | null
          times_attempted?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_newsletter_campaigns_event_id_fkey"
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
      events: {
        Row: {
          auto_publish: boolean
          created_at: string
          description: string | null
          emoji: string | null
          event_status: Database["public"]["Enums"]["event_status"]
          event_type: Database["public"]["Enums"]["event_type_enum"]
          id: string
          listmonk_list_id: number | null
          listmonk_list_synced_at: string | null
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
          listmonk_list_id?: number | null
          listmonk_list_synced_at?: string | null
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
          listmonk_list_id?: number | null
          listmonk_list_synced_at?: string | null
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
      newsletter_subscriptions: {
        Row: {
          consent_given: boolean
          created_at: string
          first_consent_given_at: string | null
          id: string
          last_consent_given_at: string | null
          last_sync_attempt_at: string | null
          listmonk_subscriber_id: number | null
          profile_id: string
          subscribed_at: string | null
          subscription_source: string | null
          sync_status: string | null
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          consent_given?: boolean
          created_at?: string
          first_consent_given_at?: string | null
          id?: string
          last_consent_given_at?: string | null
          last_sync_attempt_at?: string | null
          listmonk_subscriber_id?: number | null
          profile_id: string
          subscribed_at?: string | null
          subscription_source?: string | null
          sync_status?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          consent_given?: boolean
          created_at?: string
          first_consent_given_at?: string | null
          id?: string
          last_consent_given_at?: string | null
          last_sync_attempt_at?: string | null
          listmonk_subscriber_id?: number | null
          profile_id?: string
          subscribed_at?: string | null
          subscription_source?: string | null
          sync_status?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
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
      get_admin_user_ids: { Args: never; Returns: string[] }
      get_profile_with_roles: {
        Args: { user_id_input: string }
        Returns: {
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
      get_vault_secret: { Args: { secret_name: string }; Returns: string }
      update_event_statuses_automatically: { Args: never; Returns: Json }
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
      profile_flag_enum: "none" | "yellow" | "red" | "gray"
      spot_type: "regular" | "social" | "staff"
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
      profile_flag_enum: ["none", "yellow", "red", "gray"],
      spot_type: ["regular", "social", "staff"],
    },
  },
} as const

