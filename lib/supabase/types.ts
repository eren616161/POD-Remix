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
          user_id: string
          variant_number: number
          batch_number: number
          strategy: string
          image_url: string
          thumbnail_url: string | null
          recommended_background: 'light' | 'dark'
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id?: string  // Optional - trigger will auto-fill from project
          variant_number: number
          batch_number?: number
          strategy: string
          image_url: string
          thumbnail_url?: string | null
          recommended_background: 'light' | 'dark'
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          variant_number?: number
          batch_number?: number
          strategy?: string
          image_url?: string
          thumbnail_url?: string | null
          recommended_background?: 'light' | 'dark'
          created_at?: string
        }
      }
      user_integrations: {
        Row: {
          id: string
          user_id: string
          provider: string
          api_token: string
          shop_id: string | null
          shop_name: string | null
          connected_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          api_token: string
          shop_id?: string | null
          shop_name?: string | null
          connected_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          api_token?: string
          shop_id?: string | null
          shop_name?: string | null
          connected_at?: string
          updated_at?: string
        }
      }
      user_providers: {
        Row: {
          id: string
          user_id: string
          provider: string
          auth_type: string
          credentials: Json
          connected_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          auth_type: string
          credentials: Json
          connected_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          auth_type?: string
          credentials?: Json
          connected_at?: string | null
          updated_at?: string | null
        }
      }
      user_provider_shops: {
        Row: {
          id: string
          user_id: string
          provider: string
          shop_id: string
          shop_name: string | null
          sales_channel: string | null
          is_default: boolean | null
          metadata: Json | null
          connected_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          shop_id: string
          shop_name?: string | null
          sales_channel?: string | null
          is_default?: boolean | null
          metadata?: Json | null
          connected_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          shop_id?: string
          shop_name?: string | null
          sales_channel?: string | null
          is_default?: boolean | null
          metadata?: Json | null
          connected_at?: string | null
          updated_at?: string | null
        }
      }
      published_products: {
        Row: {
          id: string
          user_id: string
          variant_id: string | null
          printify_product_id: string
          printify_shop_id: string
          blueprint_id: number | null
          print_provider_id: number | null
          product_type: string | null
          title: string
          retail_price: number | null
          shopify_product_id: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          variant_id?: string | null
          printify_product_id: string
          printify_shop_id: string
          blueprint_id?: number | null
          print_provider_id?: number | null
          product_type?: string | null
          title: string
          retail_price?: number | null
          shopify_product_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          variant_id?: string | null
          printify_product_id?: string
          printify_shop_id?: string
          blueprint_id?: number | null
          print_provider_id?: number | null
          product_type?: string | null
          title?: string
          retail_price?: number | null
          shopify_product_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
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

// New types for Printify integration
export type UserIntegration = Database['public']['Tables']['user_integrations']['Row']
export type UserIntegrationInsert = Database['public']['Tables']['user_integrations']['Insert']
export type UserProvider = Database['public']['Tables']['user_providers']['Row']
export type UserProviderInsert = Database['public']['Tables']['user_providers']['Insert']
export type UserProviderShop = Database['public']['Tables']['user_provider_shops']['Row']
export type UserProviderShopInsert = Database['public']['Tables']['user_provider_shops']['Insert']
export type PublishedProduct = Database['public']['Tables']['published_products']['Row']
export type PublishedProductInsert = Database['public']['Tables']['published_products']['Insert']
