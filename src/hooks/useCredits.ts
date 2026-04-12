import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useCredits(userId: string | undefined, isAdmin: boolean) {
  const [searchesUsed, setSearchesUsed] = useState(0);
  const [maxSearches] = useState(3);
  const [loading, setLoading] = useState(true);

  const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM

  const fetchCredits = useCallback(async () => {
    if (!userId || isAdmin) { setLoading(false); return; }
    const { data } = await supabase
      .from('search_credits')
      .select('searches_used')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .single();
    setSearchesUsed(data?.searches_used ?? 0);
    setLoading(false);
  }, [userId, isAdmin, monthYear]);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);

  const canSearch = isAdmin || searchesUsed < maxSearches;
  const remaining = isAdmin ? Infinity : Math.max(0, maxSearches - searchesUsed);

  const consumeCredit = useCallback(async () => {
    if (!userId || isAdmin) return true;
    if (searchesUsed >= maxSearches) return false;

    const { data: existing } = await supabase
      .from('search_credits')
      .select('id, searches_used')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .single();

    if (existing) {
      await supabase
        .from('search_credits')
        .update({ searches_used: existing.searches_used + 1 })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('search_credits')
        .insert({ user_id: userId, month_year: monthYear, searches_used: 1, max_searches: maxSearches });
    }

    setSearchesUsed(prev => prev + 1);
    return true;
  }, [userId, isAdmin, searchesUsed, maxSearches, monthYear]);

  return { searchesUsed, maxSearches, canSearch, remaining, consumeCredit, loading };
}
