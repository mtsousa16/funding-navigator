import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminBroadcastProps {
  currentUserId: string;
}

export function AdminBroadcast({ currentUserId }: AdminBroadcastProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!title.trim()) return;
    setSending(true);

    // Get all user IDs from profiles
    const { data: profiles } = await supabase.from('profiles').select('user_id');
    if (!profiles || profiles.length === 0) {
      toast({ title: 'Nenhum usuário encontrado', variant: 'destructive' });
      setSending(false);
      return;
    }

    const notifications = profiles.map((p: any) => ({
      user_id: p.user_id,
      type: 'broadcast',
      title: title.trim(),
      body: body.trim() || null,
      related_user_id: currentUserId,
    }));

    // Insert in batches of 100
    for (let i = 0; i < notifications.length; i += 100) {
      await supabase.from('notifications').insert(notifications.slice(i, i + 100));
    }

    toast({ title: `Broadcast enviado para ${profiles.length} usuários!` });
    setTitle('');
    setBody('');
    setOpen(false);
    setSending(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors border-b border-border text-left">
        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
          <Megaphone className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm">Broadcast (ADM)</p>
          <p className="text-xs text-muted-foreground">Enviar mensagem para todos</p>
        </div>
      </button>
    );
  }

  return (
    <div className="p-4 border-b border-border bg-secondary/50 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-primary" /> Broadcast para Todos
      </h3>
      <Input placeholder="Título da mensagem" value={title} onChange={e => setTitle(e.target.value)} />
      <Textarea placeholder="Corpo da mensagem (opcional)" value={body} onChange={e => setBody(e.target.value)} className="min-h-[60px]" />
      <div className="flex gap-2">
        <Button onClick={handleSend} disabled={sending || !title.trim()} className="flex-1">
          {sending ? 'Enviando...' : 'Enviar para Todos'}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}
