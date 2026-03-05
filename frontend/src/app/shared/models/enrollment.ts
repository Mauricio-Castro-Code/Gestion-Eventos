export interface Enrollment {
  id: number;
  event: number;
  eventId?: number;
  event_title?: string;
  event_start_datetime?: string;
  event_end_datetime?: string;
  event_status?: string;
  venue_name?: string;
  student: number;
  studentId?: number;
  student_name?: string;
  student_email?: string;
  student_username?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  statusLabel?: string;
  attended: boolean;
  enrolled_at: string;
  cancelled_at?: string | null;
}
