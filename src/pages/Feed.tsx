import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from '@/components/PostCard';
import { StoriesBar } from '@/components/StoriesBar';

interface FeedPageProps {
  currentUserId?: string;
}

export default function FeedPage({ currentUserId }: FeedPageProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="sticky top-0 bg-card z-40 border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold text-foreground">GrandeIrmão</h1>
      </div>

      {/* Stories */}
      <StoriesBar currentUserId={currentUserId} />

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
          <PostCard key={post.id} post={post} currentUserId={currentUserId} />
        ))
      )}
    </div>
  );
}
