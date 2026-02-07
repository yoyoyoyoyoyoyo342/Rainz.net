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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          points: number
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          points?: number
          requirement_type: string
          requirement_value: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          points?: number
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      active_powerups: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          powerup_type: string
          user_id: string
          uses_remaining: number | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          powerup_type: string
          user_id: string
          uses_remaining?: number | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          powerup_type?: string
          user_id?: string
          uses_remaining?: number | null
        }
        Relationships: []
      }
      affiliate_applications: {
        Row: {
          business_name: string
          contact_email: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          status: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
          weather_condition: string
          website_url: string
        }
        Insert: {
          business_name: string
          contact_email: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
          weather_condition: string
          website_url: string
        }
        Update: {
          business_name?: string
          contact_email?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
          weather_condition?: string
          website_url?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          page_path: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          page_path: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          page_path?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          api_key: string
          created_at: string
          endpoint: string
          id: string
          response_status: number | null
          timestamp: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          endpoint: string
          id?: string
          response_status?: number | null
          timestamp?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          response_status?: number | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          scheduled_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          scheduled_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          scheduled_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      broadcast_messages: {
        Row: {
          audience: string
          audience_filter: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          message: string
        }
        Insert: {
          audience?: string
          audience_filter?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          message: string
        }
        Update: {
          audience?: string
          audience_filter?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      christmas_calendar: {
        Row: {
          created_at: string
          day_number: number
          id: string
          reward_amount: number
          reward_type: string
          unlock_date: string
          year: number
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          reward_amount?: number
          reward_type: string
          unlock_date: string
          year: number
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          reward_amount?: number
          reward_type?: string
          unlock_date?: string
          year?: number
        }
        Relationships: []
      }
      christmas_claims: {
        Row: {
          calendar_id: string
          claimed_at: string
          id: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          claimed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          claimed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "christmas_claims_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "christmas_calendar"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_spins: {
        Row: {
          created_at: string
          id: string
          reward_amount: number | null
          reward_type: string
          spin_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reward_amount?: number | null
          reward_type: string
          spin_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reward_amount?: number | null
          reward_type?: string
          spin_date?: string
          user_id?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          play_count: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          play_count?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          play_count?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      league_invites: {
        Row: {
          created_at: string
          id: string
          league_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_invites_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "prediction_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_members: {
        Row: {
          id: string
          joined_at: string
          league_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          league_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          league_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "prediction_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      prediction_battles: {
        Row: {
          battle_date: string
          bonus_points: number | null
          challenger_id: string
          challenger_prediction_id: string | null
          challenger_score: number | null
          created_at: string | null
          id: string
          latitude: number
          league_id: string | null
          location_name: string
          longitude: number
          opponent_id: string | null
          opponent_prediction_id: string | null
          opponent_score: number | null
          status: string
          updated_at: string | null
          winner_id: string | null
        }
        Insert: {
          battle_date: string
          bonus_points?: number | null
          challenger_id: string
          challenger_prediction_id?: string | null
          challenger_score?: number | null
          created_at?: string | null
          id?: string
          latitude: number
          league_id?: string | null
          location_name: string
          longitude: number
          opponent_id?: string | null
          opponent_prediction_id?: string | null
          opponent_score?: number | null
          status?: string
          updated_at?: string | null
          winner_id?: string | null
        }
        Update: {
          battle_date?: string
          bonus_points?: number | null
          challenger_id?: string
          challenger_prediction_id?: string | null
          challenger_score?: number | null
          created_at?: string | null
          id?: string
          latitude?: number
          league_id?: string | null
          location_name?: string
          longitude?: number
          opponent_id?: string | null
          opponent_prediction_id?: string | null
          opponent_score?: number | null
          status?: string
          updated_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prediction_battles_challenger_prediction_id_fkey"
            columns: ["challenger_prediction_id"]
            isOneToOne: false
            referencedRelation: "weather_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_battles_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "prediction_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_battles_opponent_prediction_id_fkey"
            columns: ["opponent_prediction_id"]
            isOneToOne: false
            referencedRelation: "weather_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_leagues: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          invite_code: string | null
          is_public: boolean | null
          max_members: number | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          invite_code?: string | null
          is_public?: boolean | null
          max_members?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          invite_code?: string | null
          is_public?: boolean | null
          max_members?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      premium_grants: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by: string
          id: string
          is_active: boolean
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by: string
          id?: string
          is_active?: boolean
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      premium_trials: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          source: string
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          source?: string
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          source?: string
          starts_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          notification_enabled: boolean | null
          notification_time: string | null
          notify_ai_preview: boolean | null
          notify_daily_summary: boolean | null
          notify_pollen: boolean | null
          notify_severe_weather: boolean | null
          shop_points: number
          total_points: number | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          notification_enabled?: boolean | null
          notification_time?: string | null
          notify_ai_preview?: boolean | null
          notify_daily_summary?: boolean | null
          notify_pollen?: boolean | null
          notify_severe_weather?: boolean | null
          shop_points?: number
          total_points?: number | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          notification_enabled?: boolean | null
          notification_time?: string | null
          notify_ai_preview?: boolean | null
          notify_daily_summary?: boolean | null
          notify_pollen?: boolean | null
          notify_severe_weather?: boolean | null
          shop_points?: number
          total_points?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      ramadan_calendar: {
        Row: {
          created_at: string
          day_number: number
          gregorian_end_date: string
          gregorian_start_date: string
          id: string
          reward_amount: number
          reward_type: string
          year: number
        }
        Insert: {
          created_at?: string
          day_number: number
          gregorian_end_date: string
          gregorian_start_date: string
          id?: string
          reward_amount?: number
          reward_type: string
          year: number
        }
        Update: {
          created_at?: string
          day_number?: number
          gregorian_end_date?: string
          gregorian_start_date?: string
          id?: string
          reward_amount?: number
          reward_type?: string
          year?: number
        }
        Relationships: []
      }
      ramadan_claims: {
        Row: {
          calendar_id: string
          claimed_at: string
          id: string
          user_id: string
          user_latitude: number | null
          user_longitude: number | null
        }
        Insert: {
          calendar_id: string
          claimed_at?: string
          id?: string
          user_id: string
          user_latitude?: number | null
          user_longitude?: number | null
        }
        Update: {
          calendar_id?: string
          claimed_at?: string
          id?: string
          user_id?: string
          user_latitude?: number | null
          user_longitude?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ramadan_claims_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "ramadan_calendar"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_locations: {
        Row: {
          country: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          latitude: number
          longitude: number
          name: string
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          latitude: number
          longitude: number
          name: string
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          latitude?: number
          longitude?: number
          name?: string
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          latitude: number
          location_name: string
          longitude: number
          search_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          location_name: string
          longitude: number
          search_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          location_name?: string
          longitude?: number
          search_type?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_offers: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          item_id: string
          offer_price: number
          original_price: number
          starts_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          item_id: string
          offer_price: number
          original_price: number
          starts_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          item_id?: string
          offer_price?: number
          original_price?: number
          starts_at?: string
        }
        Relationships: []
      }
      shop_purchases: {
        Row: {
          id: string
          item_name: string
          item_type: string
          points_spent: number
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_name: string
          item_type: string
          points_spent: number
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_name?: string
          item_type?: string
          points_spent?: number
          purchased_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tip_jar: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          message: string | null
          status: string
          stripe_session_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_allergies: {
        Row: {
          allergen: string
          created_at: string
          id: string
          severity: string | null
          user_id: string
        }
        Insert: {
          allergen: string
          created_at?: string
          id?: string
          severity?: string | null
          user_id: string
        }
        Update: {
          allergen?: string
          created_at?: string
          id?: string
          severity?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_inventory: {
        Row: {
          created_at: string
          id: string
          item_type: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_type: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_offer_purchases: {
        Row: {
          id: string
          offer_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          offer_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          offer_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_offer_purchases_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "shop_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          card_order: Json
          created_at: string
          id: string
          is_24_hour: boolean | null
          is_high_contrast: boolean | null
          language: string | null
          premium_settings: Json
          saved_address: string | null
          saved_latitude: number | null
          saved_longitude: number | null
          updated_at: string
          user_id: string
          visible_cards: Json
        }
        Insert: {
          card_order?: Json
          created_at?: string
          id?: string
          is_24_hour?: boolean | null
          is_high_contrast?: boolean | null
          language?: string | null
          premium_settings?: Json
          saved_address?: string | null
          saved_latitude?: number | null
          saved_longitude?: number | null
          updated_at?: string
          user_id: string
          visible_cards?: Json
        }
        Update: {
          card_order?: Json
          created_at?: string
          id?: string
          is_24_hour?: boolean | null
          is_high_contrast?: boolean | null
          language?: string | null
          premium_settings?: Json
          saved_address?: string | null
          saved_latitude?: number | null
          saved_longitude?: number | null
          updated_at?: string
          user_id?: string
          visible_cards?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_routines: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          location: string | null
          name: string
          time: string
          updated_at: string
          user_id: string
          weather_sensitive: boolean
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          location?: string | null
          name: string
          time: string
          updated_at?: string
          user_id: string
          weather_sensitive?: boolean
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          time?: string
          updated_at?: string
          user_id?: string
          weather_sensitive?: boolean
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_visit_date: string
          longest_streak: number
          streak_freezes_used: number | null
          total_predictions: number
          total_visits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_visit_date?: string
          longest_streak?: number
          streak_freezes_used?: number | null
          total_predictions?: number
          total_visits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_visit_date?: string
          longest_streak?: number
          streak_freezes_used?: number | null
          total_predictions?: number
          total_visits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weather_history: {
        Row: {
          avg_temp: number
          condition: string | null
          created_at: string
          date: string
          high_temp: number
          humidity: number | null
          id: string
          latitude: number
          location_name: string
          longitude: number
          low_temp: number
          precipitation: number | null
          user_id: string | null
          wind_speed: number | null
        }
        Insert: {
          avg_temp: number
          condition?: string | null
          created_at?: string
          date: string
          high_temp: number
          humidity?: number | null
          id?: string
          latitude: number
          location_name: string
          longitude: number
          low_temp: number
          precipitation?: number | null
          user_id?: string | null
          wind_speed?: number | null
        }
        Update: {
          avg_temp?: number
          condition?: string | null
          created_at?: string
          date?: string
          high_temp?: number
          humidity?: number | null
          id?: string
          latitude?: number
          location_name?: string
          longitude?: number
          low_temp?: number
          precipitation?: number | null
          user_id?: string | null
          wind_speed?: number | null
        }
        Relationships: []
      }
      weather_predictions: {
        Row: {
          actual_condition: string | null
          actual_high: number | null
          actual_low: number | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          is_verified: boolean | null
          latitude: number
          location_name: string
          longitude: number
          points_earned: number | null
          powerup_flags: Json | null
          predicted_condition: string
          predicted_high: number
          predicted_low: number
          prediction_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_condition?: string | null
          actual_high?: number | null
          actual_low?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_verified?: boolean | null
          latitude: number
          location_name: string
          longitude: number
          points_earned?: number | null
          powerup_flags?: Json | null
          predicted_condition: string
          predicted_high: number
          predicted_low: number
          prediction_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_condition?: string | null
          actual_high?: number | null
          actual_low?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_verified?: boolean | null
          latitude?: number
          location_name?: string
          longitude?: number
          points_earned?: number | null
          powerup_flags?: Json | null
          predicted_condition?: string
          predicted_high?: number
          predicted_low?: number
          prediction_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weather_reports: {
        Row: {
          accuracy: string
          actual_condition: string
          created_at: string | null
          id: string
          latitude: number
          location_name: string
          longitude: number
          report_date: string
          report_details: string | null
          reported_condition: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy: string
          actual_condition: string
          created_at?: string | null
          id?: string
          latitude: number
          location_name: string
          longitude: number
          report_date?: string
          report_details?: string | null
          reported_condition: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy?: string
          actual_condition?: string
          created_at?: string | null
          id?: string
          latitude?: number
          location_name?: string
          longitude?: number
          report_date?: string
          report_details?: string | null
          reported_condition?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          correct_predictions: number | null
          current_streak: number | null
          display_name: string | null
          longest_streak: number | null
          rank: number | null
          total_points: number | null
          total_predictions: number | null
        }
        Relationships: []
      }
      location_search_stats: {
        Row: {
          last_searched: string | null
          latitude: string | null
          location_name: string | null
          longitude: string | null
          search_count: number | null
          unique_sessions: number | null
        }
        Relationships: []
      }
      public_games: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          is_public: boolean | null
          play_count: number | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_public?: boolean | null
          play_count?: number | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_public?: boolean | null
          play_count?: number | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_leaderboard: {
        Args: never
        Returns: {
          correct_predictions: number
          current_streak: number
          display_name: string
          longest_streak: number
          rank: number
          total_points: number
          total_predictions: number
        }[]
      }
      get_public_profile: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          display_name: string
          id: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invoke_publish_scheduled_posts: { Args: never; Returns: undefined }
      manual_verify_predictions: { Args: never; Returns: Json }
      trigger_verify_predictions: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
