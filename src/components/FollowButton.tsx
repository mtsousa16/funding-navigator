import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface FollowButtonProps {
  currentUserId?: string;
  targetUserId: string;
  size?: 'sm' | 'default';
  showViewProfile?: boolean;
}

export function FollowButton({ currentUserId, targetUserId, size = 'sm', showViewProfile = false }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUserId || currentUserId === targetUserId) { setLoading(false); return; }
    supabase.from('follows').select('id').eq('follower_id', currentUserId).eq('following_id', targetUserId).single()
      .then(({ data }) => { setIsFollowing(!!data); setLoading(false); });
  }, [currentUserId, targetUserId]);

  if (!currentUserId || currentUserId === targetUserId) return null;
  if (loading) return null;

  const toggle = async () => {
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', targetUserId);
      setIsFollowing(false);
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetUserId });
      setIsFollowing(true);
      // Create notification
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        type: 'follow',
        title: 'Novo seguidor',
        body: 'Alguém começou a seguir você.',
        related_user_id: currentUserId,
      });
    }
  };

  if (isFollowing && showViewProfile) {
    return (
      <div className="flex gap-1">
        <Button size={size} variant="outline" onClick={toggle} className="text-xs h-7 px-2">Seguindo</Button>
        <Button size={size} variant="secondary" onClick={() => navigate(`/profile/${targetUserId}`)} className="text-xs h-7 px-2">Ver perfil</Button>
      </div>
    );
  }

  return (
    <Button size={size} variant={isFollowing ? 'outline' : 'default'} onClick={toggle} className="text-xs h-7 px-2">
      {isFollowing ? 'Seguindo' : 'Seguir'}
    </Button>
  );
}
