import { createClient } from '@supabase/supabase-js';

// استخدام القيم مباشرة بدلاً من متغيرات البيئة
const supabaseUrl = 'https://qnozlrgdqrnayuixtwmd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFub3pscmdkcXJuYXl1aXh0d21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzEzNTIsImV4cCI6MjA3MjA0NzM1Mn0.GeAFug9yoKYoGmXE3kgC4WsdVu08KHarr-tMbsaYDyo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'admin' | 'coach';

export interface Organization {
  id: string;
  name: string;
  type: 'club' | 'youth_center';
  created_at: string;
}

export interface Profile {

  id: string;
  full_name: string;
  name: string;
  role: UserRole;
  organization_id: string | null;
  created_at: string;
  organization?: Organization;
}

export interface Coach extends Profile {

  email: string;
  name: string;
  username: string;
  // Coach is a Profile with role 'coach'
}

export interface Player {

  player_type: string;
  organization: any;
  id: string;
  full_name: string;
  name: string;
  age: number | null;
  belt: string | null;
  belt_level: string;
  coach_id: string;
  file_number: string | null;
  phone: string;
  birth_date: string | null;
  created_at: string;
  coach?: Profile;
  registered?: boolean;
  secondaryRegistered?: boolean;
  national_id?: string | null;
  branch?: string | null;
  authority?: string | null;
  gender?: string | null;
  registration_type?: string | null;
  season_registration_date?: string | null;
  registration_date?: string | null;
  الرقم_القومي?: string | null;
  الفرع?: string | null;
  الهيئة?: string | null;
  النوع?: string | null;
  نوع_القيد?: string | null;
  تاريخ_التسجيل_للموسم?: string | null;
  تاريخه?: string | null;
}

export interface ExamPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface ExamRegistration {
  id: string;
  exam_period_id: string;
  player_id: string;
  coach_id: string;
  player_name: string;
  birth_date: string | null;
  last_belt: string | null;
  registered_at: string;
}

export interface SecondaryRegistrationPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface SecondaryRegistration {
  id: string;
  secondary_period_id: string;
  player_id: string;
  coach_id: string;
  player_name: string;
  birth_date: string | null;
  last_belt: string | null;
  registered_at: string;
}

export interface ChampionshipPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface ChampionshipRegistration {
  id: string;
  championship_period_id: string;
  player_id: string;
  coach_id: string;
  player_name: string;
  birth_date: string | null;
  last_belt: string | null;
  registered_at: string;
}

