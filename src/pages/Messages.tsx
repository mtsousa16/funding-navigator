import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminBroadcast } from '@/components/AdminBroadcast';

interface MessagesPageProps {
  currentUserId?: string;
  isAdmin?: boolean;
}

export default function MessagesPage({ currentUserId, isAdmin }: MessagesPageProps) {
  const location = useLocation();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Capture openConvoId from navigation state
  useEffect(() => {
    const state = location.state as { openConvoId?: string } | null;
    if (state?.openConvoId) {
      setPendingOpenId(state.openConvoId);
      // Clear state so refresh doesn't re-open
      window.history.replaceState({}, '');
    }
  }, [location]);

  useEffect(() => {
    if (!currentUserId) return;
    loadConversations();
  }, [currentUserId]);

  // Auto-open conversation when pending
  useEffect(() => {
    if (pendingOpenId && conversations.length > 0) {
      const exists = conversations.find(c => c.id === pendingOpenId);
      if (exists) {
        openConvo(pendingOpenId);
        setPendingOpenId(null);
      }
    }
  }, [pendingOpenId, conversations]);

  const loadConversations = async () => {
    if (!currentUserId) return;
    const { data: parts } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', currentUserId);

    if (!parts?.length) { setConversations([]); return; }
    const convoIds = parts.map(p => p.conversation_id);

    const convos = await Promise.all(convoIds.map(async convoId => {
      const { data: otherParts } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', convoId)
        .neq('user_id', currentUserId);

      const otherUserId = otherParts?.[0]?.user_id;
      let profile = null;
      if (otherUserId) {
        const { data } = await supabase.from('profiles').select('display_name, avatar_url, username').eq('user_id', otherUserId).single();
        profile = data;
      }

      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return { id: convoId, otherUserId, profile, lastMsg };
    }));

    setConversations(convos.sort((a, b) => {
      const ta = a.lastMsg?.created_at || '';
      const tb = b.lastMsg?.created_at || '';
      return tb.localeCompare(ta);
    }));
  };

  const openConvo = async (convoId: string) => {
    setActiveConvo(convoId);
    const convo = conversations.find(c => c.id === convoId);
    setOtherUser(convo?.profile);

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true });
    setMessages(data || []);

    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    const channel = supabase
      .channel(`dm-${convoId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convoId}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as any]);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const sendMessage = async () => {
    if (!currentUserId || !activeConvo || !newMsg.trim()) return;
    await supabase.from('messages').insert({
      conversation_id: activeConvo,
      sender_id: currentUserId,
      content: newMsg.trim(),
    });
    // Notify recipient
    const convo = conversations.find(c => c.id === activeConvo);
    if (convo?.otherUserId) {
      await supabase.from('notifications').insert({
        user_id: convo.otherUserId,
        type: 'dm',
        title: 'Nova mensagem',
        body: newMsg.trim().substring(0, 100),
        related_user_id: currentUserId,
      });
    }
    setNewMsg('');
  };

  if (activeConvo) {
    return (
      <div className="max-w-lg mx-auto flex flex-col h-[calc(100vh-56px)]">
        <div className="sticky top-0 bg-card z-40 border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setActiveConvo(null)}><ArrowLeft className="h-5 w-5" /></button>
          <Avatar className="h-8 w-8">
            {otherUser?.avatar_url && <AvatarImage src={otherUser.avatar_url} />}
            <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
              {(otherUser?.username || otherUser?.display_name || 'U')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm">{otherUser?.username ? `@${otherUser.username}` : otherUser?.display_name || 'Usuário'}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map(msg => (
            <div key={msg.id} className={cn('flex', msg.sender_id === currentUserId ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[75%] px-3 py-2 rounded-2xl text-sm',
                msg.sender_id === currentUserId ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-3 flex gap-2">
          <Input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Mensagem..." onKeyDown={e => e.key === 'Enter' && sendMessage()} className="flex-1" />
          <Button size="icon" onClick={sendMessage} disabled={!newMsg.trim()}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-16">
      <div className="sticky top-0 bg-card z-40 border-b border-border px-4 py-3">
        <h1 className="text-base font-semibold">Mensagens</h1>
      </div>

      {/* Admin broadcast */}
      {isAdmin && currentUserId && <AdminBroadcast currentUserId={currentUserId} />}

      {conversations.length === 0 ? (
        <p className="text-center py-20 text-muted-foreground text-sm">Nenhuma conversa ainda</p>
      ) : (
        conversations.map(convo => (
          <button
            key={convo.id}
            onClick={() => openConvo(convo.id)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors border-b border-border"
          >
            <Avatar className="h-12 w-12">
              {convo.profile?.avatar_url && <AvatarImage src={convo.profile.avatar_url} />}
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                {(convo.profile?.username || convo.profile?.display_name || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm">{convo.profile?.username ? `@${convo.profile.username}` : convo.profile?.display_name || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground truncate">{convo.lastMsg?.content || ''}</p>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
