-- Allow managers to view their officers' profiles
CREATE POLICY "Managers can view their officers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  parent_id = auth.uid()
  AND role = 'officer'
);

-- Allow managers to update their officers' profiles (specifically status)
CREATE POLICY "Managers can update their officers"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  parent_id = auth.uid()
  AND role = 'officer'
)
WITH CHECK (
  parent_id = auth.uid()
  AND role = 'officer'
);
