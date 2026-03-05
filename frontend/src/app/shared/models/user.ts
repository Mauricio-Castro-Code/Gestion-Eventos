import { UserRole } from './role';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active?: boolean;
  phone?: string;
  career?: string;
  worker_id?: string | null;
}
