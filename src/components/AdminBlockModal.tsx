import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface AdminBlockModalProps {
  targetUserId: string;
  onClose: () => void;
}

export function AdminBlockModal({ targetUserId, onClose }: AdminBlockModalProps) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleBlock = async () => {
    const totalMinutes = days * 1440 + hours * 60 + minutes;
    if (totalMinutes <= 0) {
      toast({ title: 'Defina um tempo de bloqueio', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const blockedUntil = new Date(Date.now() + totalMinutes * 60000).toISOString();

    const { error } = await supabase.from('user_blocks').insert({
      user_id: targetUserId,
      blocked_by: (await supabase.auth.getUser()).data.user?.id,
      reason: reason.trim() || 'Violação das regras da comunidade',
      blocked_until: blockedUntil,
    });

    if (!error) {
      // Notify the blocked user
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        type: 'system',
        title: 'Conta bloqueada temporariamente',
        body: reason.trim() || 'Violação das regras da comunidade',
      });
      toast({ title: 'Usuário bloqueado' });
      onClose();
    } else {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Bloquear Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Defina o tempo de bloqueio:</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Dias</label>
              <Input type="number" min={0} value={days} onChange={e => setDays(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Horas</label>
              <Input type="number" min={0} max={23} value={hours} onChange={e => setHours(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Minutos</label>
              <Input type="number" min={0} max={59} value={minutes} onChange={e => setMinutes(Number(e.target.value))} />
            </div>
          </div>
          <Textarea
            placeholder="Motivo do bloqueio..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex gap-2">
            <Button onClick={handleBlock} disabled={loading} variant="destructive" className="flex-1">
              {loading ? '...' : 'Confirmar Bloqueio'}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
