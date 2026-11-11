export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ProductType = 'cassette' | 'cd' | 'merch'
export type ProductStatus = 'available' | 'reserved' | 'in_transit' | 'sold'

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          type: ProductType
          status: ProductStatus
          title: string
          artist: string | null
          album: string | null
          year: number | null
          label: string | null
          catalog_number: string | null
          price: number | null
          quantity: number | null
          condition: string | null
          genre: string | null
          tags: string[] | null
          description: string | null
          notes: string | null
          cover_url: string | null
          images: Json | null
          shop_links: Json | null
          meshok_id: number | null
          meshok_end_date: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: ProductType
          status?: ProductStatus
          title: string
          artist?: string | null
          album?: string | null
          year?: number | null
          label?: string | null
          catalog_number?: string | null
          price?: number | null
          quantity?: number | null
          condition?: string | null
          genre?: string | null
          tags?: string[] | null
          description?: string | null
          notes?: string | null
          cover_url?: string | null
          images?: Json | null
          shop_links?: Json | null
          meshok_id?: number | null
          meshok_end_date?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: ProductType
          status?: ProductStatus
          title?: string
          artist?: string | null
          album?: string | null
          year?: number | null
          label?: string | null
          catalog_number?: string | null
          price?: number | null
          quantity?: number | null
          condition?: string | null
          genre?: string | null
          tags?: string[] | null
          description?: string | null
          notes?: string | null
          cover_url?: string | null
          images?: Json | null
          shop_links?: Json | null
          meshok_id?: number | null
          meshok_end_date?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

export type ShopLinks = {
  meshok?: string
  avito?: string
  ozon?: string
  wildberries?: string
  [key: string]: string | undefined
}

export const STATUS_LABELS: Record<ProductStatus, string> = {
  available:  'В наличии',
  reserved:   'Зарезервировано',
  in_transit: 'В пути',
  sold:       'Продано',
}

export const STATUS_BADGE_CLASS: Record<ProductStatus, string> = {
  available:  'stock-badge--in',
  reserved:   'stock-badge--wait',
  in_transit: 'stock-badge--wait',
  sold:       'stock-badge--wait',
}

export const TYPE_LABELS: Record<ProductType, string> = {
  cassette: 'Кассета',
  cd:       'CD',
  merch:    'Мерч',
}
