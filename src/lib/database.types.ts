export type ProjectStatus =
  | 'Concept'
  | 'Offerte Verstuurd'
  | 'Akkoord'
  | 'In Uitvoering'
  | 'Afgerond';

export interface Project {
  id: string;
  name: string;
  client_name: string | null;
  client_address: string | null;
  client_contact: string | null;
  client_phone: string | null;
  client_email: string | null;
  btw_nummer: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  project_id: string;
  name: string | null;
  shape: string | null;
  width: number | null;
  height: number | null;
  position_x: number;
  position_y: number;
  sub_rooms: SubRoom[];
  area_m2: number | null;
  created_at: string;
}

export interface SubRoom {
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Material {
  id: string;
  project_id: string;
  name: string;
  unit: string | null;
  quantity: number;
  price_per_unit: number;
}

export interface Labor {
  id: string;
  project_id: string;
  description: string | null;
  hours: number;
  hourly_rate: number;
}

export interface OfferteVersion {
  id: string;
  project_id: string;
  version_number: number;
  margin_percentage: number;
  total_price: number;
  created_at: string;
}

export interface RoomPhoto {
  id: string;
  room_id: string;
  file_url: string | null;
  note: string | null;
  created_at: string;
}
