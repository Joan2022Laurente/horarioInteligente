export type ServiceCategory = 
  | 'ALL'
  | 'SNACKS_FOOD'
  | 'SECOND_HAND_TECH'
  | 'CLOTHING_THRIFT'
  | 'TECH_GADGETS'
  | 'PRINTING_SUPPLIES'
  | 'TUTORING' 
  | 'EXAM_PREP' 
  | 'PROJECT_HELP'
  | 'CODE_REVIEW'
  | 'MATERIAL_NOTES';

export type ServiceSortBy = 'POPULAR' | 'RATING' | 'RECENT' | 'PRICE_LOW' | 'PRICE_HIGH';

export type MarketplaceType = 'PRODUCT' | 'SERVICE';

export interface ServiceItem {
  id: string;
  itemType?: MarketplaceType;
  category: ServiceCategory;
  serviceType: string;
  condition?: string;
  price: string;
  numericPrice: number;
  originalPrice?: number;
  unit?: string;
  title: string;
  description: string;
  imageUrl: string;
  badge?: string;
  location?: string;
  rating: number;
  reviewsCount: number;
  salesCount: number;
  tutorName: string;
  tutorCareer: string;
  tutorCycle: number;
  tutorEmail?: string;
  courseName?: string;
  reputation: number;
  tags: string[];
  contactMethod: string;
  highlights?: string[];
}

export interface ServiceFilter {
  category: ServiceCategory;
  searchQuery: string;
  courseName: string | 'ALL';
  sortBy: ServiceSortBy;
  itemType?: MarketplaceType | 'ALL';
  maxPrice?: number;
}
