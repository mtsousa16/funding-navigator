
CREATE TABLE public.grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grantee_name TEXT NOT NULL,
  title TEXT,
  total_amount NUMERIC,
  year INTEGER,
  topic TEXT,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read grants" ON public.grants FOR SELECT USING (true);
CREATE POLICY "Authenticated insert grants" ON public.grants FOR INSERT TO authenticated WITH CHECK (true);
