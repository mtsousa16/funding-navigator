
-- User blocks table for admin moderation
CREATE TABLE public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  blocked_by UUID NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  blocked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Anyone can check blocks (needed to enforce blocking)
CREATE POLICY "Anyone can read blocks" ON public.user_blocks FOR SELECT USING (true);

-- Only admins can insert blocks
CREATE POLICY "Admins can insert blocks" ON public.user_blocks FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete blocks
CREATE POLICY "Admins can delete blocks" ON public.user_blocks FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT,
  related_user_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users read own notifications
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Authenticated users can create notifications
CREATE POLICY "Auth users create notifications" ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
