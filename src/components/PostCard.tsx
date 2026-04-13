import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { FollowButton } from '@/components/FollowButton';
import { PostOptionsMenu } from '@/components/PostOptionsMenu';
import { useNavigate } from 'react-router-dom';

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    content: string | null;
    image_url: string | null;
    video_url: string | null;
    funding_snapshot: any;
    created_at: string;
  };
  currentUserId?: string;
  isAdmin?: boolean;
  onDeleted?: () => void;
}

export function PostCard({ post, currentUserId, isAdmin = false, onDeleted }: PostCardProps) {
  const [profile, setProfile] = useState<any>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [content, setContent] = useState(post.content);
  const [deleted, setDeleted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('profiles').select('display_name, avatar_url, username').eq('user_id', post.user_id).single()
      .then(({ data }) => setProfile(data));

    supabase.from('likes').select('id, user_id').eq('post_id', post.id)
      .then(({ data }) => {
        setLikeCount(data?.length ?? 0);
        setLiked(!!data?.find(l => l.user_id === currentUserId));
      });
  }, [post.id, post.user_id, currentUserId]);

  const toggleLike = async () => {
    if (!currentUserId) return;
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUserId);
      setLiked(false);
      setLikeCount(c => c - 1);
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId });
      setLiked(true);
      setLikeCount(c => c + 1);
    }
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    if (data) {
      const withProfiles = await Promise.all(data.map(async c => {
        const { data: p } = await supabase.from('profiles').select('display_name, username').eq('user_id', c.user_id).single();
        return { ...c, display_name: p?.username || p?.display_name || 'Usuário' };
      }));
      setComments(withProfiles);
    }
  };

  const handleComment = async () => {
    if (!currentUserId || !newComment.trim()) return;
    await supabase.from('comments').insert({ post_id: post.id, user_id: currentUserId, content: newComment.trim() });
    setNewComment('');
    loadComments();
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  };

  if (deleted) return null;

  return (
    <div className="bg-card border-b border-border">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <button onClick={() => navigate(`/profile/${post.user_id}`)}>
          <Avatar className="h-8 w-8">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
              {(profile?.username || profile?.display_name || 'U')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <button onClick={() => navigate(`/profile/${post.user_id}`)} className="text-sm font-semibold text-foreground">
          {profile?.username ? `@${profile.username}` : profile?.display_name || 'Usuário'}
        </button>
        <div className="ml-1">
          <FollowButton currentUserId={currentUserId} targetUserId={post.user_id} size="sm" />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{timeAgo(post.created_at)}</span>
        <PostOptionsMenu
          postId={post.id}
          postUserId={post.user_id}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          content={content}
          onDeleted={() => { setDeleted(true); onDeleted?.(); }}
          onEdited={(newContent) => setContent(newContent)}
        />
      </div>

      {/* Media */}
      {post.image_url && (
        <img src={post.image_url} alt="" className="w-full aspect-square object-cover" />
      )}
      {post.video_url && (
        <video src={post.video_url} controls className="w-full aspect-video" />
      )}

      {/* Funding card */}
      {post.funding_snapshot && (
        <div className="mx-3 my-2 p-3 rounded-lg bg-secondary border border-border">
          <p className="text-xs font-semibold text-primary">📊 Financiamento Rastreado</p>
          <p className="text-sm font-bold mt-1">{post.funding_snapshot.funderName}</p>
          {post.funding_snapshot.amount && (
            <p className="text-lg font-bold text-primary">
              {post.funding_snapshot.currency || 'USD'} {Number(post.funding_snapshot.amount).toLocaleString()}
            </p>
          )}
          {post.funding_snapshot.year && (
            <p className="text-xs text-muted-foreground">Ano: {post.funding_snapshot.year}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 p-3">
        <button onClick={toggleLike} className="transition-transform active:scale-125">
          <Heart className={cn('h-6 w-6', liked ? 'fill-accent text-accent' : 'text-foreground')} />
        </button>
        <button onClick={() => { setShowComments(!showComments); if (!showComments) loadComments(); }}>
          <MessageCircle className="h-6 w-6 text-foreground" />
        </button>
        <Send className="h-6 w-6 text-foreground" />
        <Bookmark className="h-6 w-6 text-foreground ml-auto" />
      </div>

      {/* Like count */}
      {likeCount > 0 && (
        <p className="px-3 text-sm font-semibold">{likeCount} curtida{likeCount > 1 ? 's' : ''}</p>
      )}

      {/* Content */}
      {content && (
        <p className="px-3 pb-2 text-sm">
          <span className="font-semibold mr-1">{profile?.username ? `@${profile.username}` : profile?.display_name || 'Usuário'}</span>
          {content}
        </p>
      )}

      {/* Comments */}
      {showComments && (
        <div className="px-3 pb-3 space-y-2">
          {comments.map(c => (
            <p key={c.id} className="text-sm">
              <span className="font-semibold mr-1">{c.display_name}</span>
              {c.content}
            </p>
          ))}
          <div className="flex gap-2">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Adicione um comentário..."
              className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground"
              onKeyDown={e => e.key === 'Enter' && handleComment()}
            />
            {newComment.trim() && (
              <button onClick={handleComment} className="text-sm font-semibold text-primary">
                Publicar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
