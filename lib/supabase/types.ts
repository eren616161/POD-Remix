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
      anonymous_usage: {
        Row: {
          id: string
          ip_hash: string
          date: string
          count: number
          created_at: string
        }
        Insert: {
          id?: string
          ip_hash: string
          date?: string
          count?: number
          created_at?: string
        }
        Update: {
          id?: string
          ip_hash?: string
          date?: string
          count?: number
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          original_image_url: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          original_image_url: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          original_image_url?: string
          created_at?: string
        }
      }
      variants: {
        Row: {
          id: string
          project_id: string
          variant_number: number
          batch_number: number
          strategy: string
          image_url: string
          recommended_background: 'light' | 'dark'
          product_hint: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          variant_number: number
          batch_number?: number
          strategy: string
          image_url: string
          recommended_background: 'light' | 'dark'
          product_hint?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          variant_number?: number
          batch_number?: number
          strategy?: string
          image_url?: string
          recommended_background?: 'light' | 'dark'
          product_hint?: string | null
          created_at?: string
        }
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
  }
}

// Helper types for easier use
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type Variant = Database['public']['Tables']['variants']['Row']
export type VariantInsert = Database['public']['Tables']['variants']['Insert']
export type AnonymousUsage = Database['public']['Tables']['anonymous_usage']['Row']
export type AnonymousUsageInsert = Database['public']['Tables']['anonymous_usage']['Insert']

