import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, X } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

interface NotificationsPanelProps {
  currentUserId?: string;
}

export function NotificationsPanel({ currentUserId }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);

      // Fetch profiles for related users
      const relatedIds = [...new Set(data.filter((n: any) => n.related_user_id).map((n: any) => n.related_user_id))];
      if (relatedIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url, username').in('user_id', relatedIds);
        const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setNotifications(data.map((n: any) => ({ ...n, relatedProfile: pMap.get(n.related_user_id) })));
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
    if (!currentUserId) return;
    const channel = supabase
      .channel('notifications-' + currentUserId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` }, () => {
        fetchNotifications();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  const markAllRead = async () => {
    if (!currentUserId) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUserId).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleClick = (n: any) => {
    if (n.related_user_id && n.type === 'follow') {
      navigate(`/profile/${n.related_user_id}`);
      setOpen(false);
    }
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  };

  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); if (!open) markAllRead(); }} className="relative p-1">
        <Bell className="h-6 w-6 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 max-h-[70vh] bg-card border border-border rounded-lg shadow-lg z-50 overflow-y-auto">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="font-semibold text-sm">Notificações</h3>
            <button onClick={() => setOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma notificação</p>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full flex items-center gap-3 p-3 text-left hover:bg-secondary transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
              >
                {n.relatedProfile ? (
                  <Avatar className="h-8 w-8">
                    {n.relatedProfile.avatar_url && <AvatarImage src={n.relatedProfile.avatar_url} />}
                    <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                      {(n.relatedProfile.username || n.relatedProfile.display_name || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bell className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground truncate">{n.body}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
