import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from '@/components/PostCard';
import { StoriesBar } from '@/components/StoriesBar';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { useBlockCheck } from '@/hooks/useBlockCheck';
import { ShieldAlert } from 'lucide-react';

interface FeedPageProps {
  currentUserId?: string;
  isAdmin?: boolean;
}

export default function FeedPage({ currentUserId, isAdmin }: FeedPageProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { blocked, blockReason, blockUntil } = useBlockCheck(currentUserId);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel('feed-posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        setPosts(prev => [payload.new as any, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="max-w-lg mx-auto pb-16">
      {/* Header */}
      <div className="sticky top-0 bg-card z-40 border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">GrandeIrmão</h1>
        <NotificationsPanel currentUserId={currentUserId} />
      </div>

      {/* Block warning */}
      {blocked && (
        <div className="mx-4 mt-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <p className="text-sm font-semibold text-destructive">Conta temporariamente bloqueada</p>
          </div>
          <p className="text-sm text-foreground">{blockReason}</p>
          {blockUntil && (
            <p className="text-xs text-muted-foreground">
              Até: {new Date(blockUntil).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      )}

      {/* Stories */}
      <StoriesBar currentUserId={currentUserId} blocked={blocked} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-semibold">Nenhuma publicação ainda</p>
          <p className="text-sm mt-1">Faça uma busca e compartilhe no feed!</p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard key={post.id} post={post} currentUserId={currentUserId} isAdmin={isAdmin} onDeleted={fetchPosts} />
        ))
      )}
    </div>
  );
}
