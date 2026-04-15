import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MessageCircle, Share2, ExternalLink, Clock } from 'lucide-react';
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
      .from('comments').select('id, content, created_at, user_id')
      .eq('post_id', post.id).order('created_at', { ascending: true });
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
    <article className="glass-card rounded-xl overflow-hidden transition-all duration-300 hover:border-primary/20">
      {/* Header - forum style */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <button onClick={() => navigate(`/profile/${post.user_id}`)}>
          <Avatar className="h-9 w-9 ring-2 ring-primary/20">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
              {(profile?.username || profile?.display_name || 'U')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={() => navigate(`/profile/${post.user_id}`)} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
            {profile?.username ? `@${profile.username}` : profile?.display_name || 'Usuário'}
          </button>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="text-[11px]">{timeAgo(post.created_at)}</span>
          </div>
        </div>
        <FollowButton currentUserId={currentUserId} targetUserId={post.user_id} size="sm" />
        <PostOptionsMenu
          postId={post.id} postUserId={post.user_id} currentUserId={currentUserId}
          isAdmin={isAdmin} content={content}
          onDeleted={() => { setDeleted(true); onDeleted?.(); }}
          onEdited={(newContent) => setContent(newContent)}
        />
      </div>

      {/* Content - blog/forum style */}
      {content && (
        <div className="px-4 pb-3">
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      )}

      {/* Media */}
      {post.image_url && (
        <div className="mx-4 mb-3 rounded-lg overflow-hidden border border-border/40">
          <img src={post.image_url} alt="" className="w-full object-cover max-h-80" />
        </div>
      )}
      {post.video_url && (
        <div className="mx-4 mb-3 rounded-lg overflow-hidden border border-border/40">
          <video src={post.video_url} controls className="w-full" />
        </div>
      )}

      {/* Funding card - investigative style */}
      {post.funding_snapshot && (
        <div className="mx-4 mb-3 p-3 rounded-lg investigative-gradient border border-primary/20 space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">Financiamento Rastreado</p>
          </div>
          <p className="text-sm font-bold text-foreground">{post.funding_snapshot.funderName}</p>
          {post.funding_snapshot.amount && (
            <p className="text-xl font-heading font-bold text-primary glow-text">
              {post.funding_snapshot.currency || 'USD'} {Number(post.funding_snapshot.amount).toLocaleString()}
            </p>
          )}
          {post.funding_snapshot.year && (
            <p className="text-xs text-muted-foreground">Ano: {post.funding_snapshot.year}</p>
          )}
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center gap-1 px-2 py-2 border-t border-border/30">
        <button onClick={toggleLike} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-all">
          <Heart className={cn('h-4 w-4', liked ? 'fill-primary text-primary' : 'text-muted-foreground')} />
          {likeCount > 0 && <span className="text-xs text-muted-foreground">{likeCount}</span>}
        </button>
        <button onClick={() => { setShowComments(!showComments); if (!showComments) loadComments(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-all">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Comentar</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-all ml-auto">
          <Share2 className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Comments - forum thread style */}
      {showComments && (
        <div className="px-4 pb-4 pt-1 border-t border-border/20 space-y-2">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2 py-1.5">
              <div className="w-0.5 bg-primary/20 rounded-full shrink-0 mt-1" />
              <div>
                <span className="text-xs font-semibold text-primary/80 mr-1">{c.display_name}</span>
                <span className="text-sm text-foreground/80">{c.content}</span>
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Responder..."
              className="flex-1 text-sm bg-input/50 rounded-lg px-3 py-2 border border-border/40 outline-none focus:border-primary/40 placeholder:text-muted-foreground transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleComment()}
            />
            {newComment.trim() && (
              <button onClick={handleComment} className="text-xs font-semibold text-primary px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                Enviar
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
