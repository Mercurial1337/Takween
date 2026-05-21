-- ============================================================================
-- Takween Seed Data
-- Run after the initial migration to populate reference data
-- ============================================================================

-- ---- DEPARTMENTS ----
INSERT INTO departments (name) VALUES
  ('CS'),
  ('IS'),
  ('SC'),
  ('CSys')
ON CONFLICT (name) DO NOTHING;

-- ---- LEVELS ----
INSERT INTO levels (name, sort_order) VALUES
  ('Year 1', 1),
  ('Year 2', 2),
  ('Year 3', 3),
  ('Year 4', 4)
ON CONFLICT (name) DO NOTHING;

-- ---- PREDEFINED SKILLS ----
INSERT INTO skills (name, is_predefined) VALUES
  -- Programming Languages
  ('JavaScript', true),
  ('Python', true),
  ('Java', true),
  ('C++', true),
  ('C#', true),
  ('TypeScript', true),
  ('PHP', true),
  ('Swift', true),
  ('Kotlin', true),
  ('Rust', true),
  ('Go', true),
  ('R', true),
  ('MATLAB', true),
  ('SQL', true),
  -- Frontend
  ('React', true),
  ('Next.js', true),
  ('Vue.js', true),
  ('Angular', true),
  ('HTML/CSS', true),
  ('Tailwind CSS', true),
  ('Flutter', true),
  ('React Native', true),
  -- Backend
  ('Node.js', true),
  ('Django', true),
  ('Flask', true),
  ('Spring Boot', true),
  ('Express.js', true),
  ('Laravel', true),
  ('ASP.NET', true),
  ('FastAPI', true),
  -- Data & AI
  ('Machine Learning', true),
  ('Deep Learning', true),
  ('Data Analysis', true),
  ('TensorFlow', true),
  ('PyTorch', true),
  ('Computer Vision', true),
  ('NLP', true),
  ('Data Visualization', true),
  -- DevOps & Cloud
  ('Docker', true),
  ('AWS', true),
  ('Azure', true),
  ('Google Cloud', true),
  ('Linux', true),
  ('Git', true),
  ('CI/CD', true),
  -- Databases
  ('PostgreSQL', true),
  ('MongoDB', true),
  ('MySQL', true),
  ('Firebase', true),
  ('Redis', true),
  ('Supabase', true),
  -- Design
  ('UI/UX Design', true),
  ('Figma', true),
  ('Adobe XD', true),
  ('Graphic Design', true),
  -- Other
  ('Technical Writing', true),
  ('Project Management', true),
  ('Agile/Scrum', true),
  ('API Design', true),
  ('Cybersecurity', true),
  ('Networking', true),
  ('Embedded Systems', true),
  ('IoT', true),
  ('Blockchain', true),
  ('Game Development', true),
  ('Unity', true),
  ('Unreal Engine', true),
  ('Mobile Development', true),
  ('Arduino', true),
  ('Raspberry Pi', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- NOTE: To create the first admin user:
-- 1. Register a normal account through the app
-- 2. Run this SQL in Supabase SQL editor:
--    UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
-- ============================================================================
