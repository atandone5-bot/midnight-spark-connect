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
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          reactions: Json
          read_at: string | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          reactions?: Json
          read_at?: string | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          reactions?: Json
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_moderation_log: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reviewer: string
          status: Database["public"]["Enums"]["photo_moderation_status"]
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reviewer?: string
          status: Database["public"]["Enums"]["photo_moderation_status"]
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reviewer?: string
          status?: Database["public"]["Enums"]["photo_moderation_status"]
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number
          bio: string | null
          city: string | null
          created_at: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          intent: Database["public"]["Enums"]["intent_type"] | null
          last_seen: string
          latitude: number | null
          longitude: number | null
          nickname: string
          online_status: boolean
          photo_pending_path: string | null
          photo_rejection_reason: string | null
          photo_reviewed_at: string | null
          photo_status:
            | Database["public"]["Enums"]["photo_moderation_status"]
            | null
          photo_url: string | null
          preference: Database["public"]["Enums"]["preference_type"] | null
          premium_ends_at: string | null
          status: Database["public"]["Enums"]["account_status"]
          trial_ends_at: string
          updated_at: string
          verification_status: boolean
        }
        Insert: {
          age: number
          bio?: string | null
          city?: string | null
          created_at?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id: string
          intent?: Database["public"]["Enums"]["intent_type"] | null
          last_seen?: string
          latitude?: number | null
          longitude?: number | null
          nickname: string
          online_status?: boolean
          photo_pending_path?: string | null
          photo_rejection_reason?: string | null
          photo_reviewed_at?: string | null
          photo_status?:
            | Database["public"]["Enums"]["photo_moderation_status"]
            | null
          photo_url?: string | null
          preference?: Database["public"]["Enums"]["preference_type"] | null
          premium_ends_at?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          trial_ends_at?: string
          updated_at?: string
          verification_status?: boolean
        }
        Update: {
          age?: number
          bio?: string | null
          city?: string | null
          created_at?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          intent?: Database["public"]["Enums"]["intent_type"] | null
          last_seen?: string
          latitude?: number | null
          longitude?: number | null
          nickname?: string
          online_status?: boolean
          photo_pending_path?: string | null
          photo_rejection_reason?: string | null
          photo_reviewed_at?: string | null
          photo_status?:
            | Database["public"]["Enums"]["photo_moderation_status"]
            | null
          photo_url?: string | null
          preference?: Database["public"]["Enums"]["preference_type"] | null
          premium_ends_at?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          trial_ends_at?: string
          updated_at?: string
          verification_status?: boolean
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_kes: number
          chats_delta: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["tx_kind"]
          meta: Json | null
          reference: string | null
          status: Database["public"]["Enums"]["tx_status"]
          user_id: string
        }
        Insert: {
          amount_kes?: number
          chats_delta?: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["tx_kind"]
          meta?: Json | null
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          user_id: string
        }
        Update: {
          amount_kes?: number
          chats_delta?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["tx_kind"]
          meta?: Json | null
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          chats_balance: number
          created_at: string
          is_premium: boolean
          premium_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chats_balance?: number
          created_at?: string
          is_premium?: boolean
          premium_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chats_balance?: number
          created_at?: string
          is_premium?: boolean
          premium_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_premium: {
        Args: { _amount: number; _ref: string; _user: string }
        Returns: undefined
      }
      admin_dashboard_stats: { Args: never; Returns: Json }
      admin_grant_chats: {
        Args: { _chats: number; _note?: string; _target: string }
        Returns: number
      }
      admin_recent_users: {
        Args: { _limit?: number }
        Returns: {
          age: number
          chats_balance: number
          created_at: string
          id: string
          is_premium: boolean
          last_seen: string
          nickname: string
          online_status: boolean
          photo_status: Database["public"]["Enums"]["photo_moderation_status"]
          status: Database["public"]["Enums"]["account_status"]
        }[]
      }
      admin_set_status: {
        Args: {
          _status: Database["public"]["Enums"]["account_status"]
          _target: string
        }
        Returns: undefined
      }
      credit_wallet: {
        Args: { _amount: number; _chats: number; _ref: string; _user: string }
        Returns: undefined
      }
      debit_chat: { Args: { _user: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      nearby_profiles: {
        Args: {
          _lat: number
          _limit?: number
          _lng: number
          _radius_km?: number
        }
        Returns: {
          age: number
          bio: string
          city: string
          distance_km: number
          gender: Database["public"]["Enums"]["gender_type"]
          id: string
          intent: Database["public"]["Enums"]["intent_type"]
          last_seen: string
          nickname: string
          online_status: boolean
          photo_url: string
        }[]
      }
    }
    Enums: {
      account_status:
        | "trial_active"
        | "premium_active"
        | "free"
        | "suspended"
        | "banned"
      app_role: "admin" | "moderator" | "user"
      gender_type: "male" | "female" | "other"
      intent_type: "hosting" | "traveling" | "need_room" | "chill"
      photo_moderation_status: "pending" | "approved" | "rejected"
      preference_type: "male" | "female" | "both"
      tx_kind: "topup" | "debit" | "premium" | "bonus"
      tx_status: "pending" | "success" | "failed"
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
      account_status: [
        "trial_active",
        "premium_active",
        "free",
        "suspended",
        "banned",
      ],
      app_role: ["admin", "moderator", "user"],
      gender_type: ["male", "female", "other"],
      intent_type: ["hosting", "traveling", "need_room", "chill"],
      photo_moderation_status: ["pending", "approved", "rejected"],
      preference_type: ["male", "female", "both"],
      tx_kind: ["topup", "debit", "premium", "bonus"],
      tx_status: ["pending", "success", "failed"],
    },
  },
} as const
