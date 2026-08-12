-- Aura & Anchor Database Schema
-- Run this in Supabase SQL Editor

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  demographics JSONB DEFAULT '{}'::jsonb,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relationships
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('spouse', 'partner', 'friend', 'parent', 'sibling', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invites
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('spouse', 'partner', 'friend', 'parent', 'sibling', 'other')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  relationship_id UUID REFERENCES relationships(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding responses (encrypted)
CREATE TABLE IF NOT EXISTS onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  encrypted_answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, relationship_id, question_key)
);

-- AI-generated questions
CREATE TABLE IF NOT EXISTS ai_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  for_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'skipped')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User answers to questions (encrypted)
CREATE TABLE IF NOT EXISTS user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES ai_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Briefings sent to partner
CREATE TABLE IF NOT EXISTS briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  for_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  related_answer_id UUID REFERENCES user_answers(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relationship insights from AI
CREATE TABLE IF NOT EXISTS relationship_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress milestones
CREATE TABLE IF NOT EXISTS healing_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(relationship_id, milestone_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_relationships_user1 ON relationships(user1_id);
CREATE INDEX IF NOT EXISTS idx_relationships_user2 ON relationships(user2_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_to_email ON invites(to_email);
CREATE INDEX IF NOT EXISTS idx_onboarding_user_rel ON onboarding_responses(user_id, relationship_id);
CREATE INDEX IF NOT EXISTS idx_ai_questions_for_user ON ai_questions(for_user_id, status);
CREATE INDEX IF NOT EXISTS idx_briefings_for_user ON briefings(for_user_id);
CREATE INDEX IF NOT EXISTS idx_insights_relationship ON relationship_insights(relationship_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER relationships_updated_at BEFORE UPDATE ON relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE healing_milestones ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Relationships policies
CREATE POLICY "Users can view own relationships" ON relationships FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can create relationships" ON relationships FOR INSERT
  WITH CHECK (auth.uid() = user1_id);
CREATE POLICY "Users can update own relationships" ON relationships FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Invites policies
CREATE POLICY "Users can view sent invites" ON invites FOR SELECT
  USING (auth.uid() = from_user_id);
CREATE POLICY "Users can view invites to their email" ON invites FOR SELECT
  USING (to_email = (SELECT email FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can create invites" ON invites FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Users can update own invites" ON invites FOR UPDATE
  USING (auth.uid() = from_user_id OR to_email = (SELECT email FROM profiles WHERE user_id = auth.uid()));

-- Onboarding responses policies
CREATE POLICY "Users can manage own onboarding" ON onboarding_responses FOR ALL
  USING (auth.uid() = user_id);

-- AI questions policies
CREATE POLICY "Users can view questions for them" ON ai_questions FOR SELECT
  USING (
    auth.uid() = for_user_id OR
    auth.uid() IN (SELECT user1_id FROM relationships WHERE id = relationship_id UNION SELECT user2_id FROM relationships WHERE id = relationship_id)
  );
CREATE POLICY "Service can insert questions" ON ai_questions FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user1_id FROM relationships WHERE id = relationship_id UNION SELECT user2_id FROM relationships WHERE id = relationship_id)
  );
CREATE POLICY "Users can update their questions" ON ai_questions FOR UPDATE
  USING (auth.uid() = for_user_id);

-- User answers policies
CREATE POLICY "Users can manage own answers" ON user_answers FOR ALL
  USING (auth.uid() = user_id);

-- Briefings policies
CREATE POLICY "Users can view briefings for them" ON briefings FOR SELECT
  USING (auth.uid() = for_user_id);
CREATE POLICY "Partners can create briefings" ON briefings FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user1_id FROM relationships WHERE id = relationship_id UNION SELECT user2_id FROM relationships WHERE id = relationship_id)
  );
CREATE POLICY "Users can mark briefings read" ON briefings FOR UPDATE
  USING (auth.uid() = for_user_id);

-- Insights policies
CREATE POLICY "Partners can view insights" ON relationship_insights FOR SELECT
  USING (
    auth.uid() IN (SELECT user1_id FROM relationships WHERE id = relationship_id UNION SELECT user2_id FROM relationships WHERE id = relationship_id)
  );
CREATE POLICY "Partners can insert insights" ON relationship_insights FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user1_id FROM relationships WHERE id = relationship_id UNION SELECT user2_id FROM relationships WHERE id = relationship_id)
  );

-- Milestones policies
CREATE POLICY "Partners can view milestones" ON healing_milestones FOR SELECT
  USING (
    auth.uid() IN (SELECT user1_id FROM relationships WHERE id = relationship_id UNION SELECT user2_id FROM relationships WHERE id = relationship_id)
  );
CREATE POLICY "Partners can insert milestones" ON healing_milestones FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user1_id FROM relationships WHERE id = relationship_id UNION SELECT user2_id FROM relationships WHERE id = relationship_id)
  );
