import { StudentProfileRow } from './profile';

export type ServiceType = 
  | 'FOOD_SNACKS' 
  | 'TUTORING_1ON1' 
  | 'CODE_REVIEW' 
  | 'TECH_SETUP' 
  | 'DESIGN_SLIDES' 
  | 'SECOND_HAND' 
  | 'STUDY_GUIDE'
  | 'OTHER';

export type MarketplaceCategory = 'ALL' | 'FOOD' | 'ACADEMIC' | 'TECH_DESIGN' | 'SECOND_HAND';
export type DeliveryMethod = 'CAMPUS_MEET' | 'VIRTUAL' | 'PREORDER';
export type StockStatus = 'AVAILABLE_NOW' | 'PREORDER' | 'OUT_OF_STOCK';
export type OrderStatus = 'ESCROW_HELD' | 'COMPLETED' | 'DISPUTED' | 'REFUNDED' | 'CANCELLED';

export interface AcademicServiceRow {
  id: string;
  mentor_id: string;
  mentor?: StudentProfileRow;
  course_id?: string | null;
  title: string;
  description: string;
  service_type: ServiceType;
  category: MarketplaceCategory;
  price_cents: number;
  unit_label?: string; // e.g. "por unidad", "por hora", "por docena", "precio fijo"
  delivery_method?: DeliveryMethod;
  campus_location?: string;
  whatsapp_phone?: string;
  stock_status?: StockStatus;
  duration_minutes?: number;
  is_active: boolean;
  rating_avg: number;
  total_reviews: number;
  tags?: string[];
  created_at: string;
}

export interface ServiceOrderRow {
  id: string;
  service_id: string;
  service?: AcademicServiceRow;
  buyer_id: string;
  buyer?: StudentProfileRow;
  mentor_id: string;
  mentor?: StudentProfileRow;
  amount_cents: number;
  platform_fee_cents: number;
  status: OrderStatus;
  verification_code?: string | null;
  meeting_link?: string | null;
  created_at: string;
  completed_at?: string | null;
}

