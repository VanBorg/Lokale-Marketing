export interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface Module {
  code: string;
  name: string;
  description: string;
  path: string;
  icon: string;
  group: 'A' | 'B';
}

export interface Werkzaamheid {
  id: string;
  name: string;
  description: string;
  unit: string;
  price_per_unit: number;
  category: string;
}

export interface Offerte {
  id: string;
  project_name: string;
  client_name: string;
  client_email: string;
  items: OfferteItem[];
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface OfferteItem {
  id: string;
  werkzaamheid_id: string;
  description: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  total: number;
}
