-- Create campaigns table for marketing campaign tracking
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'tiktok', 'facebook', 'instagram', 'linkedin', 'twitter', 'other'
  description TEXT,
  offer_link TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Aggregate stats (updated by sync function)
  total_clicks INTEGER DEFAULT 0,
  application_created INTEGER DEFAULT 0,
  application_qualified INTEGER DEFAULT 0,
  estimate_prepared INTEGER DEFAULT 0,
  application_completed INTEGER DEFAULT 0,
  underwriting_submitted INTEGER DEFAULT 0,
  review_requested INTEGER DEFAULT 0,
  final_offer_presented INTEGER DEFAULT 0,
  funds_disbursed INTEGER DEFAULT 0,
  closed_lost INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create updated_at trigger
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Users can manage their own campaigns (full CRUD)
CREATE POLICY "Users can manage own campaigns"
ON public.campaigns
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Managers can view their officers' campaigns
CREATE POLICY "Managers can view officer campaigns"
ON public.campaigns
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = campaigns.user_id 
    AND profiles.parent_id = auth.uid()
  )
);

-- Admins can view all campaigns
CREATE POLICY "Admins can view all campaigns"
ON public.campaigns
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster user lookups
CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX idx_campaigns_is_active ON public.campaigns(is_active);
