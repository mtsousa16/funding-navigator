
-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'standard');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'standard',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Search Credits
CREATE TABLE public.search_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  searches_used INT DEFAULT 0,
  month_year TEXT NOT NULL,
  max_searches INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, month_year)
);
ALTER TABLE public.search_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own credits" ON public.search_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own credits" ON public.search_credits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own credits" ON public.search_credits FOR UPDATE USING (auth.uid() = user_id);

-- Posts
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  image_url TEXT,
  video_url TEXT,
  funding_ref_id UUID,
  funding_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Auth insert posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Auth insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Likes
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read likes" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Auth insert likes" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own likes" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Follows
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (follower_id, following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Auth insert follows" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users delete own follows" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversation Participants
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (conversation_id, user_id)
);
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS for conversations: only participants can see
CREATE POLICY "Participants read conversations" ON public.conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid()));
CREATE POLICY "Auth insert conversations" ON public.conversations FOR INSERT WITH CHECK (true);

-- RLS for participants
CREATE POLICY "Participants read participants" ON public.conversation_participants FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid()));
CREATE POLICY "Auth insert participants" ON public.conversation_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS for messages: only conversation participants can read/write
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "Participants insert messages" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'standard');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime for messages and posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
