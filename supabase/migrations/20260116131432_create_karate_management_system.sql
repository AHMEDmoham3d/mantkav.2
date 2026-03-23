/*
  # إنشاء نظام إدارة الكاراتيه - Alexandria Karate Management System

  ## الجداول الجديدة

  ### 1. organizations (النوادي ومراكز الشباب)
    - `id` (uuid, primary key)
    - `name` (text) - اسم النادي أو المركز
    - `type` (text) - نوع المؤسسة (club أو youth_center)
    - `created_at` (timestamp)

  ### 2. profiles (الملفات الشخصية)
    - `id` (uuid, primary key) - ربط بجدول auth.users
    - `full_name` (text) - الاسم الكامل
    - `role` (text) - الدور (admin أو coach)
    - `organization_id` (uuid, nullable) - ربط بالنادي/المركز (للمدربين فقط)
    - `created_at` (timestamp)

  ### 3. players (اللاعبين)
    - `id` (uuid, primary key)
    - `full_name` (text) - الاسم الكامل
    - `age` (integer, nullable) - العمر
    - `belt` (text, nullable) - مستوى الحزام
    - `coach_id` (uuid) - ربط بالمدرب (profiles)
    - `created_at` (timestamp)

  ## الأمان (RLS Policies)
    - المدربين يستطيعون رؤية لاعبيهم فقط
    - الأدمن لديه صلاحيات كاملة على جميع البيانات
    - كل جدول محمي بـ RLS
*/

-- إنشاء جدول المؤسسات (النوادي ومراكز الشباب)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('club', 'youth_center')),
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول الملفات الشخصية (profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'coach')),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT role_organization_check CHECK (
    (role = 'admin' AND organization_id IS NULL) OR
    (role = 'coach' AND organization_id IS NOT NULL)
  )
);

-- إنشاء جدول اللاعبين
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  age integer,
  belt text,
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_number text,
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول مواعيد الاختبارات
CREATE TABLE IF NOT EXISTS exam_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول تسجيلات الاختبارات
CREATE TABLE IF NOT EXISTS exam_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_period_id uuid NOT NULL REFERENCES exam_periods(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  birth_date date,
  last_belt text,
  registered_at timestamptz DEFAULT now(),
  UNIQUE(exam_period_id, player_id)
);

-- إنشاء دالة للتحقق من دور المدرب
CREATE OR REPLACE FUNCTION check_coach_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.coach_id AND role = 'coach'
  ) THEN
    RAISE EXCEPTION 'coach_id must reference a profile with role coach';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للتحقق من دور المدرب قبل الإدراج أو التحديث
CREATE TRIGGER ensure_player_has_coach
  BEFORE INSERT OR UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION check_coach_role();

-- تفعيل RLS على جميع الجداول
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_registrations ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للمؤسسات (organizations)
CREATE POLICY "Admin can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- سياسات الأمان للملفات الشخصية (profiles)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- سياسات الأمان للاعبين (players)
CREATE POLICY "Admin can view all players"
  ON players FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Coach can view own players"
  ON players FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coach'
      AND profiles.id = players.coach_id
    )
  );

CREATE POLICY "Admin can insert players"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update players"
  ON players FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete players"
  ON players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- سياسات الأمان لفترات الاختبار (exam_periods)
CREATE POLICY "Admin can view all exam periods"
  ON exam_periods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Coach can view exam periods"
  ON exam_periods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coach'
    )
  );

CREATE POLICY "Admin can insert exam periods"
  ON exam_periods FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update exam periods"
  ON exam_periods FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete exam periods"
  ON exam_periods FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- سياسات الأمان لتسجيلات الاختبار (exam_registrations)
CREATE POLICY "Admin can view all exam registrations"
  ON exam_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Coach can view own exam registrations"
  ON exam_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coach'
      AND profiles.id = exam_registrations.coach_id
    )
  );

CREATE POLICY "Coach can insert exam registrations"
  ON exam_registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coach'
      AND profiles.id = exam_registrations.coach_id
    )
  );

CREATE POLICY "Admin can delete exam registrations"
  ON exam_registrations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- إنشاء indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_players_coach_id ON players(coach_id);
CREATE INDEX IF NOT EXISTS idx_exam_registrations_exam_period_id ON exam_registrations(exam_period_id);
CREATE INDEX IF NOT EXISTS idx_exam_registrations_player_id ON exam_registrations(player_id);
CREATE INDEX IF NOT EXISTS idx_exam_registrations_coach_id ON exam_registrations(coach_id);
