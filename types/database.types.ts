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
          created_at: string
          description: string | null
          emoji: string | null
          event_status: Database["public"]["Enums"]["event_status"]
          event_type: Database["public"]["Enums"]["event_type"]
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
          created_at?: string
          description?: string | null
          emoji?: string | null
          event_status?: Database["public"]["Enums"]["event_status"]
          event_type?: Database["public"]["Enums"]["event_type"]
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
          created_at?: string
          description?: string | null
          emoji?: string | null
          event_status?: Database["public"]["Enums"]["event_status"]
          event_type?: Database["public"]["Enums"]["event_type"]
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
      profiles: {
        Row: {
          allow_marketing_email: boolean | null
          approved_to_attend: Database["public"]["Enums"]["approved_to_attend_enum"]
          basic_data_filled: boolean
          cpf: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string | null
          gender: string[] | null
          how_came_to_us: string | null
          id: string
          is_veteran: boolean | null
          orientation: string[] | null
          phone: number | null
          pronouns: string[] | null
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
          cpf?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name?: string | null
          gender?: string[] | null
          how_came_to_us?: string | null
          id?: string
          is_veteran?: boolean | null
          orientation?: string[] | null
          phone?: number | null
          pronouns?: string[] | null
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
          cpf?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string | null
          gender?: string[] | null
          how_came_to_us?: string | null
          id?: string
          is_veteran?: boolean | null
          orientation?: string[] | null
          phone?: number | null
          pronouns?: string[] | null
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
        Args: { p_user_id: string; p_role_name: string }
        Returns: undefined
      }
      get_admin_user_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_profile_with_roles: {
        Args: { user_id_input: string }
        Returns: {
          id: string
          email: string
          full_name: string
          basic_data_filled: boolean
          social_name: string
          pronouns: string[]
          rg: string
          cpf: string
          phone: number
          date_of_birth: string
          gender: string[]
          orientation: string[]
          where_lives: string
          how_came_to_us: string
          rg_issuer: string
          allow_marketing_email: boolean
          created_at: string
          is_admin: boolean
          roles: string[]
        }[]
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
      event_type: "regular" | "bdsm"
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
      event_type: ["regular", "bdsm"],
      spot_type: ["regular", "social", "staff"],
    },
  },
} as const

