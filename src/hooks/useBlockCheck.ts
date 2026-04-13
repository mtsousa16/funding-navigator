import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useBlockCheck(userId?: string) {
  const [blocked, setBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockUntil, setBlockUntil] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_blocks')
      .select('reason, blocked_until')
      .eq('user_id', userId)
      .gt('blocked_until', new Date().toISOString())
      .order('blocked_until', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setBlocked(true);
          setBlockReason(data[0].reason);
          setBlockUntil(data[0].blocked_until);
        } else {
          setBlocked(false);
          setBlockReason('');
          setBlockUntil(null);
        }
      });
  }, [userId]);

  return { blocked, blockReason, blockUntil };
}
