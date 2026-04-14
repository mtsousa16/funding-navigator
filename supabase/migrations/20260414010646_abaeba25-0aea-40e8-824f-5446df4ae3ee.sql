
-- Drop old restrictive policy
DROP POLICY IF EXISTS "Auth insert participants" ON public.conversation_participants;

-- Allow authenticated users to insert participants (needed to add both sides of a DM)
CREATE POLICY "Auth insert participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (true);
