import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from '@/components/PostCard';
import { StoriesBar } from '@/components/StoriesBar';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { useBlockCheck } from '@/hooks/useBlockCheck';
import { ShieldAlert, Shield } from 'lucide-react';

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
    <div className="max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-panel px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/30">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-lg font-heading font-bold text-foreground tracking-tight">GrandeIrmão</h1>
        </div>
        <NotificationsPanel currentUserId={currentUserId} />
      </div>

      {/* Block warning */}
      {blocked && (
        <div className="mx-4 mt-3 p-4 rounded-xl glass-card border-destructive/30 space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <p className="text-sm font-semibold text-destructive">Conta temporariamente bloqueada</p>
          </div>
          <p className="text-sm text-foreground">{blockReason}</p>
          {blockUntil && (
            <p className="text-xs text-muted-foreground">Até: {new Date(blockUntil).toLocaleString('pt-BR')}</p>
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
        <div className="text-center py-20 text-muted-foreground space-y-2">
          <p className="text-lg font-heading font-semibold">Fórum vazio</p>
          <p className="text-sm">Faça uma busca e compartilhe suas descobertas!</p>
        </div>
      ) : (
        <div className="space-y-3 px-3 mt-3">
          {posts.map(post => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} isAdmin={isAdmin} onDeleted={fetchPosts} />
          ))}
        </div>
      )}
    </div>
  );
}
