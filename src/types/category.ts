export interface Category {
  id: number;
  name: string;
  description: string;
  image: string | null;
  slug: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
