-- Create deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  property_address TEXT NOT NULL,
  home_value NUMERIC NOT NULL,
  mortgage_balance NUMERIC NOT NULL,
  max_investment NUMERIC NOT NULL,
  owner_names TEXT[],
  everflow_event_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Users can view their own deals
CREATE POLICY "Users can view their own deals"
ON public.deals
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own deals
CREATE POLICY "Users can create their own deals"
ON public.deals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own deals
CREATE POLICY "Users can update their own deals"
ON public.deals
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all deals
CREATE POLICY "Admins can view all deals"
ON public.deals
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all deals
CREATE POLICY "Admins can update all deals"
ON public.deals
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster user lookups
CREATE INDEX idx_deals_user_id ON public.deals(user_id);