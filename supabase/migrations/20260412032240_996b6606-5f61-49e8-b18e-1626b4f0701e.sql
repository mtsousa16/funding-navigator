-- Stories table
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT,
  text_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active stories"
ON public.stories FOR SELECT
USING (expires_at > now());

CREATE POLICY "Users create own stories"
ON public.stories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own stories"
ON public.stories FOR DELETE
USING (auth.uid() = user_id);

-- Story views table
CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story owners can see views"
ON public.story_views FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = story_views.story_id AND s.user_id = auth.uid()
  )
  OR viewer_id = auth.uid()
);

CREATE POLICY "Auth users can insert views"
ON public.story_views FOR INSERT
WITH CHECK (auth.uid() = viewer_id);

-- Index for fast expiry queries
CREATE INDEX idx_stories_expires ON public.stories(expires_at);
CREATE INDEX idx_stories_user ON public.stories(user_id);
CREATE INDEX idx_story_views_story ON public.story_views(story_id);