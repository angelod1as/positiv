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
          application_date: string
          cancellation_date: string | null
          created_at: string
          event_id: string
          id: string
          payment: number | null
          process_status: string
          profile_id: string | null
          user_applied_status: boolean
        }
        Insert: {
          application_date?: string
          cancellation_date?: string | null
          created_at?: string
          event_id: string
          id?: string
          payment?: number | null
          process_status?: string
          profile_id?: string | null
          user_applied_status?: boolean
        }
        Update: {
          application_date?: string
          cancellation_date?: string | null
          created_at?: string
          event_id?: string
          id?: string
          payment?: number | null
          process_status?: string
          profile_id?: string | null
          user_applied_status?: boolean
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
          application_close_time: string | null
          application_open_time: string | null
          created_at: string
          description: string | null
          emoji: string | null
          ending_time: string | null
          event_status: string
          group_close_date: string | null
          group_open_date: string | null
          id: string
          interview_process_end: string | null
          interview_process_start: string | null
          location: string | null
          payment_end_date: string | null
          payment_start_date: string | null
          starting_time: string | null
          ticket_price: number | null
          title: string | null
          total_spots: number | null
        }
        Insert: {
          application_close_time?: string | null
          application_open_time?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          ending_time?: string | null
          event_status?: string
          group_close_date?: string | null
          group_open_date?: string | null
          id?: string
          interview_process_end?: string | null
          interview_process_start?: string | null
          location?: string | null
          payment_end_date?: string | null
          payment_start_date?: string | null
          starting_time?: string | null
          ticket_price?: number | null
          title?: string | null
          total_spots?: number | null
        }
        Update: {
          application_close_time?: string | null
          application_open_time?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          ending_time?: string | null
          event_status?: string
          group_close_date?: string | null
          group_open_date?: string | null
          id?: string
          interview_process_end?: string | null
          interview_process_start?: string | null
          location?: string | null
          payment_end_date?: string | null
          payment_start_date?: string | null
          starting_time?: string | null
          ticket_price?: number | null
          title?: string | null
          total_spots?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allow_marketing_email: boolean | null
          basic_data_filled: boolean
          cpf: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string | null
          gender: string[] | null
          how_came_to_us: string | null
          id: string
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
          basic_data_filled?: boolean
          cpf?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name?: string | null
          gender?: string[] | null
          how_came_to_us?: string | null
          id?: string
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
          basic_data_filled?: boolean
          cpf?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string | null
          gender?: string[] | null
          how_came_to_us?: string | null
          id?: string
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
        Args: { user_id: string; role_name: string }
        Returns: undefined
      }
      get_admin_user_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_applied_participants_count: {
        Args: { event_id_input: string }
        Returns: number
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

