export type EventStatus = 'borrador' | 'publicado' | 'cancelado';

export interface Event {
  id: number;
  title: string;
  description: string;
  requirements?: string;
  category: number | null;
  category_name?: string;
  venue: number;
  venue_name?: string;
  organizer: number;
  organizer_name?: string;
  start_datetime: string;
  end_datetime: string;
  registration_deadline?: string | null;
  max_capacity: number;
  capacity?: number;
  modality: 'presencial' | 'virtual' | 'hibrido';
  status: EventStatus;
  statusLabel?: string;
  is_public: boolean;
  image_url?: string;
  materials_url?: string;
  attendees?: number;
  enrolled_count?: number;
  available_slots?: number;
  capacityPercentage?: number;
  created_at?: string;
  updated_at?: string;
}
