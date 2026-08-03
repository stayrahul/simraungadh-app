-- ============================================================
-- Simraungadh Civic Hub — Complete Supabase Schema (Idempotent)
-- Includes Tables, Triggers, RLS Policies, and Storage Setup
-- You can safely run this entire file multiple times.
-- ============================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Tables (IF NOT EXISTS prevents errors if they already exist)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  department TEXT, -- For officials (e.g. 'Roads', 'Water')
  role TEXT CHECK (role IN ('citizen', 'official')) DEFAULT 'citizen',
  civic_points INT DEFAULT 0,
  push_token TEXT,
  phone_number TEXT,
  home_ward INT,
  gender TEXT,
  age INT,
  tole TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add columns if the table already existed before the upgrade
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS civic_points INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_ward INT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tole TEXT;

CREATE TABLE IF NOT EXISTS public.issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'General', -- e.g. Roads, Water, Electricity
  ward_number INT NOT NULL,
  image_url TEXT,
  image_urls TEXT[] DEFAULT '{}'::text[],
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending', -- pending, in_progress, resolved, rejected
  upvotes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add columns if the table already existed before the upgrade
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS ward_number INT DEFAULT 1;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'General',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  pdf_url TEXT,
  image_url TEXT,
  image_urls TEXT[] DEFAULT '{}'::text[],
  is_emergency BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add columns if the table already existed before the upgrade
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT false;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}'::text[];

-- ============================================================
-- 3. Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.issue_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_official_response BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.issue_comments ENABLE ROW LEVEL SECURITY;

-- Comments RLS
DROP POLICY IF EXISTS "Comments are viewable by everyone." ON public.issue_comments;
CREATE POLICY "Comments are viewable by everyone."
  ON public.issue_comments FOR SELECT USING ( true );

DROP POLICY IF EXISTS "Authenticated users can create comments." ON public.issue_comments;
CREATE POLICY "Authenticated users can create comments."
  ON public.issue_comments FOR INSERT WITH CHECK ( auth.uid() = author_id );

DROP POLICY IF EXISTS "Users can delete own comments." ON public.issue_comments;
CREATE POLICY "Users can delete own comments."
  ON public.issue_comments FOR DELETE USING ( auth.uid() = author_id );

-- Profiles RLS (Drop first to prevent "already exists" errors)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT USING ( true );

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT WITH CHECK ( auth.uid() = id );

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE USING ( auth.uid() = id );


-- Issues RLS
DROP POLICY IF EXISTS "Issues are viewable by everyone." ON public.issues;
CREATE POLICY "Issues are viewable by everyone."
  ON public.issues FOR SELECT USING ( true );

DROP POLICY IF EXISTS "Authenticated users can create issues." ON public.issues;
CREATE POLICY "Authenticated users can create issues."
  ON public.issues FOR INSERT WITH CHECK ( auth.uid() = author_id );

DROP POLICY IF EXISTS "Officials can update any issue status, authors can update own issue." ON public.issues;
CREATE POLICY "Officials can update any issue status, authors can update own issue."
  ON public.issues FOR UPDATE USING ( 
    auth.uid() = author_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'official') 
  );

DROP POLICY IF EXISTS "Users can delete own issues, officials can delete any." ON public.issues;
CREATE POLICY "Users can delete own issues, officials can delete any."
  ON public.issues FOR DELETE USING ( 
    auth.uid() = author_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'official') 
  );


-- Notices RLS
DROP POLICY IF EXISTS "Notices are viewable by everyone." ON public.notices;
CREATE POLICY "Notices are viewable by everyone."
  ON public.notices FOR SELECT USING ( true );

DROP POLICY IF EXISTS "Only officials can insert notices." ON public.notices;
CREATE POLICY "Only officials can insert notices."
  ON public.notices FOR INSERT WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'official') );

DROP POLICY IF EXISTS "Only officials can update notices." ON public.notices;
CREATE POLICY "Only officials can update notices."
  ON public.notices FOR UPDATE USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'official') );

DROP POLICY IF EXISTS "Only officials can delete notices." ON public.notices;
CREATE POLICY "Only officials can delete notices."
  ON public.notices FOR DELETE USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'official') );


-- ============================================================
-- 4. Triggers (Auto-create profile on signup)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, phone_number, gender, age, home_ward, tole)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'citizen'),
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'gender',
    (NEW.raw_user_meta_data->>'age')::INT,
    (NEW.raw_user_meta_data->>'home_ward')::INT,
    NEW.raw_user_meta_data->>'tole'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    gender = EXCLUDED.gender,
    age = EXCLUDED.age,
    home_ward = EXCLUDED.home_ward,
    tole = EXCLUDED.tole,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ============================================================
-- 5. Storage Setup (Images & PDFs)
-- ============================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('civic_images', 'civic_images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('civic_documents', 'civic_documents', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS (Drop first to prevent already exists errors)
DROP POLICY IF EXISTS "Avatars are publicly accessible." ON storage.objects;
CREATE POLICY "Avatars are publicly accessible."
  ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Users can upload own avatar." ON storage.objects;
CREATE POLICY "Users can upload own avatar."
  ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

DROP POLICY IF EXISTS "Civic images are publicly accessible." ON storage.objects;
CREATE POLICY "Civic images are publicly accessible."
  ON storage.objects FOR SELECT USING ( bucket_id = 'civic_images' );

DROP POLICY IF EXISTS "Authenticated users can upload civic images." ON storage.objects;
CREATE POLICY "Authenticated users can upload civic images."
  ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'civic_images' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Civic documents are publicly accessible." ON storage.objects;
CREATE POLICY "Civic documents are publicly accessible."
  ON storage.objects FOR SELECT USING ( bucket_id = 'civic_documents' );

DROP POLICY IF EXISTS "Only officials can upload civic documents." ON storage.objects;
CREATE POLICY "Only officials can upload civic documents."
  ON storage.objects FOR INSERT WITH CHECK ( 
    bucket_id = 'civic_documents' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'official') 
  );

-- ============================================================
-- 6. Upvotes System
-- ============================================================
CREATE TABLE IF NOT EXISTS public.issue_upvotes (
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (issue_id, user_id)
);

ALTER TABLE public.issue_upvotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Upvotes are viewable by everyone." ON public.issue_upvotes;
CREATE POLICY "Upvotes are viewable by everyone."
  ON public.issue_upvotes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own upvote." ON public.issue_upvotes;
CREATE POLICY "Users can insert their own upvote."
  ON public.issue_upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own upvote." ON public.issue_upvotes;
CREATE POLICY "Users can delete their own upvote."
  ON public.issue_upvotes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.issues SET upvotes_count = upvotes_count + 1 WHERE id = NEW.issue_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.issues SET upvotes_count = upvotes_count - 1 WHERE id = OLD.issue_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_upvote_change ON public.issue_upvotes;
DROP TRIGGER IF EXISTS on_issue_upvote ON public.issue_upvotes;
CREATE TRIGGER on_issue_upvote
  AFTER INSERT OR DELETE ON public.issue_upvotes
  FOR EACH ROW EXECUTE FUNCTION public.handle_upvote_count();

-- Function to handle civic points
CREATE OR REPLACE FUNCTION public.handle_civic_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    UPDATE public.profiles
    SET civic_points = civic_points + 10
    WHERE id = NEW.author_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_issue_resolved ON public.issues;
CREATE TRIGGER on_issue_resolved
  AFTER UPDATE OF status ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.handle_civic_points();

-- ============================================================
-- 7. Directory Contacts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.directory_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  phone TEXT,
  details TEXT,
  avatar TEXT,
  ward TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, category)
);

ALTER TABLE public.directory_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Directory contacts viewable by everyone." ON public.directory_contacts;
CREATE POLICY "Directory contacts viewable by everyone."
  ON public.directory_contacts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only officials can manage directory." ON public.directory_contacts;
CREATE POLICY "Only officials can manage directory."
  ON public.directory_contacts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'official')
  );

-- Insert Initial Real Data
INSERT INTO public.directory_contacts (name, category, phone, details, avatar, ward) VALUES
('Kishori Prasad Kalawar', 'Ward Members', '053-411072', 'Mayor (नगर प्रमुख)', 'star', 'All'),
('Najmu Sehar', 'Ward Members', '053-411072', 'Deputy Mayor (उप-प्रमुख)', 'star', 'All'),
('Vivek Mukhiya', 'Ward Members', '9840000002', 'Ward 7 Chairman', 'user-check', '7'),
('Din Dayal Mukhiya', 'Ward Members', '9840000003', 'Ward Chairman', 'user-check', '1'),
('Arvind Kumar', 'Ward Members', '9840000004', 'Ward Chairman', 'user-check', '2'),
('Ajiullah Ansari', 'Ward Members', '9840000005', 'Ward Chairman', 'user-check', '3'),
('Awadhesh Sahani', 'Ward Members', '9840000006', 'Ward Chairman', 'user-check', '4'),
('Simraungadh Hospital', 'Hospitals', '053-411075', 'Emergency 24/7', 'activity', 'All'),
('Kankali Medical', 'Hospitals', '9840000008', 'Pharmacy & Clinic', 'crosshair', '2'),
('Raju Plumbing Services', 'Plumbers', '9840000007', 'Quick pipe repair', 'tool', '1'),
('Bishnu Electrician', 'Electricians', '9840000009', 'House wiring expert', 'zap', '7'),
('Ramawatar Yadav', 'Electricians', '9840000010', 'Industrial electricals', 'zap', '2'),
('Simraungadh Police Station', 'Emergency', '100', '24/7 Police Services', 'shield', 'All'),
('Fire Brigade (Simraungadh)', 'Emergency', '101', 'Fire Emergency', 'alert-triangle', 'All')
ON CONFLICT (name, category) DO NOTHING;

-- ============================================================
-- 10. Push Notification Delivery System (pg_net)
-- ============================================================

-- Enable the pg_net extension to make HTTP requests from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to hit the Expo Push API
CREATE OR REPLACE FUNCTION public.notify_issue_status_update()
RETURNS trigger AS $$
DECLARE
  author_token text;
  payload jsonb;
BEGIN
  -- Only trigger if the status has actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    
    -- Look up the push token of the citizen who created this issue
    SELECT push_token INTO author_token
    FROM public.profiles
    WHERE id = NEW.author_id;

    -- If they have a token, construct the payload and send it
    IF author_token IS NOT NULL AND author_token != '' THEN
      payload := jsonb_build_object(
        'to', author_token,
        'sound', 'default',
        'title', 'Report Status Updated',
        'body', 'Your report "' || NEW.title || '" has been marked as ' || NEW.status || '.'
      );

      -- Insert in-app notification
      INSERT INTO public.notifications (user_id, title, body, type, reference_id)
      VALUES (NEW.author_id, 'Report Status Updated', 'Your report "' || NEW.title || '" has been marked as ' || NEW.status || '.', 'status_update', NEW.id);

      -- Fire and forget the HTTP request to Expo
      PERFORM net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
        body := payload
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to the issues table
DROP TRIGGER IF EXISTS on_issue_status_change ON public.issues;
CREATE TRIGGER on_issue_status_change
  AFTER UPDATE OF status ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_issue_status_update();

-- ============================================================
-- 11. Follow System & Advanced Notifications
-- ============================================================

-- Create user_follows table
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- RLS for user_follows
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Follows are viewable by everyone." ON public.user_follows;
CREATE POLICY "Follows are viewable by everyone."
  ON public.user_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow others." ON public.user_follows;
CREATE POLICY "Users can follow others."
  ON public.user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow others." ON public.user_follows;
CREATE POLICY "Users can unfollow others."
  ON public.user_follows FOR DELETE USING (auth.uid() = follower_id);


-- TRIGGER 1: Notify on New Follow
CREATE OR REPLACE FUNCTION public.notify_new_follow()
RETURNS trigger AS $$
DECLARE
  target_token text;
  follower_name text;
  payload jsonb;
BEGIN
  -- Get the target user's push token
  SELECT push_token INTO target_token FROM public.profiles WHERE id = NEW.following_id;
  -- Get the follower's name
  SELECT full_name INTO follower_name FROM public.profiles WHERE id = NEW.follower_id;

  IF target_token IS NOT NULL AND target_token != '' THEN
    payload := jsonb_build_object(
      'to', target_token,
      'sound', 'default',
      'title', 'New Follower!',
      'body', COALESCE(follower_name, 'Someone') || ' started following you.'
    );

    -- Insert in-app notification
    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (NEW.following_id, 'New Follower!', COALESCE(follower_name, 'Someone') || ' started following you.', 'new_follow', NEW.follower_id);

    PERFORM net.http_post(url := 'https://exp.host/--/api/v2/push/send', headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb, body := payload);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_follow ON public.user_follows;
CREATE TRIGGER on_new_follow
  AFTER INSERT ON public.user_follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_follow();


-- TRIGGER 2: Notify on New Like
CREATE OR REPLACE FUNCTION public.notify_new_like()
RETURNS trigger AS $$
DECLARE
  target_token text;
  issue_title text;
  payload jsonb;
BEGIN
  -- Get the issue title and the author's push token
  SELECT p.push_token, i.title INTO target_token, issue_title
  FROM public.issues i
  JOIN public.profiles p ON p.id = i.author_id
  WHERE i.id = NEW.issue_id AND i.author_id != NEW.user_id; -- Don't notify if they like their own post

  IF target_token IS NOT NULL AND target_token != '' THEN
    payload := jsonb_build_object(
      'to', target_token,
      'sound', 'default',
      'title', 'New Upvote',
      'body', 'Someone liked your report: "' || issue_title || '"'
    );

    -- Insert in-app notification
    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (
      (SELECT author_id FROM public.issues WHERE id = NEW.issue_id), 
      'New Upvote', 
      'Someone liked your report: "' || issue_title || '"', 
      'new_like', 
      NEW.issue_id
    );

    PERFORM net.http_post(url := 'https://exp.host/--/api/v2/push/send', headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb, body := payload);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_like ON public.issue_upvotes;
CREATE TRIGGER on_new_like
  AFTER INSERT ON public.issue_upvotes
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_like();


-- TRIGGER 3: Notify on New Comment
CREATE OR REPLACE FUNCTION public.notify_new_comment()
RETURNS trigger AS $$
DECLARE
  target_token text;
  issue_title text;
  commenter_name text;
  payload jsonb;
BEGIN
  -- Get the issue author's push token
  SELECT p.push_token, i.title INTO target_token, issue_title
  FROM public.issues i
  JOIN public.profiles p ON p.id = i.author_id
  WHERE i.id = NEW.issue_id AND i.author_id != NEW.author_id; -- Don't notify if commenting on own post

  -- Get commenter's name
  SELECT full_name INTO commenter_name FROM public.profiles WHERE id = NEW.author_id;

  IF target_token IS NOT NULL AND target_token != '' THEN
    payload := jsonb_build_object(
      'to', target_token,
      'sound', 'default',
      'title', 'New Comment',
      'body', COALESCE(commenter_name, 'Someone') || ' commented on "' || issue_title || '"'
    );

    -- Insert in-app notification
    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (
      (SELECT author_id FROM public.issues WHERE id = NEW.issue_id),
      'New Comment',
      COALESCE(commenter_name, 'Someone') || ' commented on "' || issue_title || '"',
      'new_comment',
      NEW.issue_id
    );

    PERFORM net.http_post(url := 'https://exp.host/--/api/v2/push/send', headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb, body := payload);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_comment ON public.issue_comments;
CREATE TRIGGER on_new_comment
  AFTER INSERT ON public.issue_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_comment();

-- ============================================================
-- 12. Automated Profile Creation Trigger
-- ============================================================

-- Automatically create a profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, department)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'citizen'),
    NEW.raw_user_meta_data->>'department'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 13. In-App Notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL, -- 'status_update', 'new_comment', 'new_like', 'new_follow', 'broadcast'
  reference_id UUID, -- ID of the issue or related entity
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT WITH CHECK (true); -- Triggers run as postgres role, but good to be safe

-- ============================================================
-- 14. Notification Triggers
-- ============================================================

-- Function: Notify Issue Author on New Comment
CREATE OR REPLACE FUNCTION public.handle_new_issue_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_issue_author_id UUID;
  v_issue_title TEXT;
BEGIN
  -- Get the author of the issue
  SELECT author_id, title INTO v_issue_author_id, v_issue_title
  FROM public.issues
  WHERE id = NEW.issue_id;

  -- Only notify if the commenter is not the author
  IF v_issue_author_id IS NOT NULL AND v_issue_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (
      v_issue_author_id,
      'New Comment on your Issue',
      'Someone commented on: ' || v_issue_title,
      'new_comment',
      NEW.issue_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: New Comment
DROP TRIGGER IF EXISTS on_new_comment ON public.issue_comments;
CREATE TRIGGER on_new_comment
  AFTER INSERT ON public.issue_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_issue_comment();

-- Function: Notify Issue Author on Status Change
CREATE OR REPLACE FUNCTION public.handle_issue_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (
      NEW.author_id,
      'Issue Status Updated',
      'The status of "' || NEW.title || '" is now: ' || NEW.status,
      'status_update',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Status Change
DROP TRIGGER IF EXISTS on_status_change ON public.issues;
CREATE TRIGGER on_status_change
  AFTER UPDATE OF status ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.handle_issue_status_change();

-- ============================================================
-- 10. Service Applications Table & RLS Policies (Idempotent)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.service_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  applicant_phone TEXT,
  home_ward INT,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.service_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own applications" ON public.service_applications;
CREATE POLICY "Users can view their own applications"
  ON public.service_applications FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'official'));

DROP POLICY IF EXISTS "Users can create applications" ON public.service_applications;
CREATE POLICY "Users can create applications"
  ON public.service_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Officials can update application status" ON public.service_applications;
CREATE POLICY "Officials can update application status"
  ON public.service_applications FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'official'));

