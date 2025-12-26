-- Drop the existing user view policy
DROP POLICY IF EXISTS "Users can view their own deals" ON public.deals;

-- Create new policy that allows:
-- 1. Users to view their own deals
-- 2. Managers to view deals from their officers (via parent_id)
CREATE POLICY "Users can view own deals and managers can view officer deals"
ON public.deals
FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = deals.user_id 
    AND profiles.parent_id = auth.uid()
  )
);