/*
  # إضافة جداول فترات التسجيل الثانوي والبطولة
  # يتطابق تماماً مع هيكل exam_periods للحفاظ على التوافق
*/

-- إنشاء جدول فترات التسجيل الثانوي
CREATE TABLE IF NOT EXISTS secondary_registration_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول تسجيلات التسجيل الثانوي
CREATE TABLE IF NOT EXISTS secondary_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secondary_period_id uuid NOT NULL REFERENCES secondary_registration_periods(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  birth_date date,
  last_belt text,
  registered_at timestamptz DEFAULT now(),
  UNIQUE(secondary_period_id, player_id)
);

-- إنشاء جدول فترات البطولة
CREATE TABLE IF NOT EXISTS championship_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول تسجيلات البطولة
CREATE TABLE IF NOT EXISTS championship_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_period_id uuid NOT NULL REFERENCES championship_periods(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  birth_date date,
  last_belt text,
  registered_at timestamptz DEFAULT now(),
  UNIQUE(championship_period_id, player_id)
);

-- تفعيل RLS
ALTER TABLE secondary_registration_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE secondary_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE championship_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE championship_registrations ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لفترات التسجيل الثانوي (نفس منطق exam_periods)
CREATE POLICY "Admin can view all secondary periods" ON secondary_registration_periods FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Coach can view secondary periods" ON secondary_registration_periods FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'coach'));

CREATE POLICY "Admin can insert secondary periods" ON secondary_registration_periods FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admin can update secondary periods" ON secondary_registration_periods FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admin can delete secondary periods" ON secondary_registration_periods FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- سياسات تسجيلات التسجيل الثانوي
CREATE POLICY "Admin can view all secondary registrations" ON secondary_registrations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Coach can view own secondary registrations" ON secondary_registrations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'coach' AND profiles.id = secondary_registrations.coach_id));

CREATE POLICY "Coach can insert secondary registrations" ON secondary_registrations FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'coach' AND profiles.id = secondary_registrations.coach_id));

CREATE POLICY "Admin can delete secondary registrations" ON secondary_registrations FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- سياسات RLS لفترات البطولة (نفس المنطق)
CREATE POLICY "Admin can view all championship periods" ON championship_periods FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Coach can view championship periods" ON championship_periods FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'coach'));

CREATE POLICY "Admin can insert championship periods" ON championship_periods FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admin can update championship periods" ON championship_periods FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admin can delete championship periods" ON championship_periods FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- سياسات تسجيلات البطولة
CREATE POLICY "Admin can view all championship registrations" ON championship_registrations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Coach can view own championship registrations" ON championship_registrations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'coach' AND profiles.id = championship_registrations.coach_id));

CREATE POLICY "Coach can insert championship registrations" ON championship_registrations FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'coach' AND profiles.id = championship_registrations.coach_id));

CREATE POLICY "Admin can delete championship registrations" ON championship_registrations FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_secondary_registrations_secondary_period_id ON secondary_registrations(secondary_period_id);
CREATE INDEX IF NOT EXISTS idx_secondary_registrations_player_id ON secondary_registrations(player_id);
CREATE INDEX IF NOT EXISTS idx_secondary_registrations_coach_id ON secondary_registrations(coach_id);
CREATE INDEX IF NOT EXISTS idx_championship_registrations_championship_period_id ON championship_registrations(championship_period_id);
CREATE INDEX IF NOT EXISTS idx_championship_registrations_player_id ON championship_registrations(player_id);
CREATE INDEX IF NOT EXISTS idx_championship_registrations_coach_id ON championship_registrations(coach_id);
