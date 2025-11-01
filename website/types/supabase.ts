export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      cassettes: {
        Row: {
          id: string
          artist: string
          album: string
          year: number | null
          label: string | null
          catalog_number: string | null
          price: number
          in_stock: boolean
          quantity: number
          cover_url: string | null
          images: Json | null
          description: string | null
          condition: string | null
          notes: string | null
          shop_links: Json | null
          tags: string[] | null
          genre: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          artist: string
          album: string
          year?: number | null
          label?: string | null
          catalog_number?: string | null
          price: number
          in_stock?: boolean
          quantity?: number
          cover_url?: string | null
          images?: Json | null
          description?: string | null
          condition?: string | null
          notes?: string | null
          shop_links?: Json | null
          tags?: string[] | null
          genre?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          artist?: string
          album?: string
          year?: number | null
          label?: string | null
          catalog_number?: string | null
          price?: number
          in_stock?: boolean
          quantity?: number
          cover_url?: string | null
          images?: Json | null
          description?: string | null
          condition?: string | null
          notes?: string | null
          shop_links?: Json | null
          tags?: string[] | null
          genre?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      available_cassettes: {
        Row: {
          id: string
          artist: string
          album: string
          year: number | null
          price: number
          quantity: number
          genre: string | null
          tags: string[] | null
          condition: string | null
          cover_url: string | null
          shop_links: Json | null
        }
      }
      catalog_stats: {
        Row: {
          total_cassettes: number
          in_stock_count: number
          total_quantity: number
          average_price: number
          min_price: number
          max_price: number
          unique_artists: number
          unique_genres: number
        }
      }
    }
  }
}

// Вспомогательные типы для удобства
export type Cassette = Database['public']['Tables']['cassettes']['Row']
export type CassetteInsert = Database['public']['Tables']['cassettes']['Insert']
export type CassetteUpdate = Database['public']['Tables']['cassettes']['Update']
export type ShopLinks = {
  ozon?: string
  wildberries?: string
  avito?: string
  [key: string]: string | undefined
}
