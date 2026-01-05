-- Create or replace the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create campaign_leads table for tracking individual leads from marketing campaigns
-- Each click on a campaign link creates a unique lead that can be tracked through pipeline stages

CREATE TABLE IF NOT EXISTS public.campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Everflow tracking data
  everflow_transaction_id TEXT NOT NULL UNIQUE, -- Unique click ID from Everflow
  everflow_event_status TEXT DEFAULT 'Offer Link Clicked',
  
  -- Click metadata
  click_timestamp TIMESTAMPTZ,
  ip_address TEXT,
  country TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create updated_at trigger
CREATE TRIGGER update_campaign_leads_updated_at
  BEFORE UPDATE ON public.campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;

-- Users can view their own campaign leads
CREATE POLICY "Users can view own campaign leads"
ON public.campaign_leads
FOR SELECT
USING (auth.uid() = user_id);

-- Users can manage their own campaign leads (for manual updates if needed)
CREATE POLICY "Users can manage own campaign leads"
ON public.campaign_leads
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Managers can view their officers' campaign leads
CREATE POLICY "Managers can view officer campaign leads"
ON public.campaign_leads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = campaign_leads.user_id 
    AND profiles.parent_id = auth.uid()
  )
);

-- Admins can view all campaign leads
CREATE POLICY "Admins can view all campaign leads"
ON public.campaign_leads
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for faster lookups
CREATE INDEX idx_campaign_leads_campaign_id ON public.campaign_leads(campaign_id);
CREATE INDEX idx_campaign_leads_user_id ON public.campaign_leads(user_id);
CREATE INDEX idx_campaign_leads_transaction_id ON public.campaign_leads(everflow_transaction_id);
CREATE INDEX idx_campaign_leads_status ON public.campaign_leads(everflow_event_status);
