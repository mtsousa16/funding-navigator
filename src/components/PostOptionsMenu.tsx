import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MoreHorizontal, Pencil, Trash2, ShieldAlert } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AdminBlockModal } from './AdminBlockModal';

interface PostOptionsMenuProps {
  postId: string;
  postUserId: string;
  currentUserId?: string;
  isAdmin: boolean;
  content?: string | null;
  onDeleted?: () => void;
  onEdited?: (newContent: string) => void;
  type?: 'post' | 'story';
}

export function PostOptionsMenu({ postId, postUserId, currentUserId, isAdmin, content, onDeleted, onEdited, type = 'post' }: PostOptionsMenuProps) {
  const isOwner = currentUserId === postUserId;
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(content || '');
  const [showBlockModal, setShowBlockModal] = useState(false);

  if (!isOwner && !isAdmin) return null;

  const table = type === 'story' ? 'stories' : 'posts';

  const handleDelete = async () => {
    const { error } = await supabase.from(table).delete().eq('id', postId);
    if (!error) {
      toast({ title: `${type === 'story' ? 'Story' : 'Publicação'} excluída` });
      onDeleted?.();
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    const { error } = await supabase.from('posts').update({ content: editContent.trim() }).eq('id', postId);
    if (!error) {
      onEdited?.(editContent.trim());
      setEditing(false);
      toast({ title: 'Publicação editada' });
    }
  };

  if (editing) {
    return (
      <div className="flex gap-2 items-center w-full">
        <input
          value={editContent}
          onChange={e => setEditContent(e.target.value)}
          className="flex-1 text-sm bg-secondary rounded px-2 py-1 border border-border"
          onKeyDown={e => e.key === 'Enter' && handleEdit()}
        />
        <button onClick={handleEdit} className="text-xs text-primary font-semibold">Salvar</button>
        <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground">Cancelar</button>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-5 w-5" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {isOwner && type === 'post' && (
            <DropdownMenuItem onClick={() => { setEditContent(content || ''); setEditing(true); }}>
              <Pencil className="h-4 w-4 mr-2" />Editar
            </DropdownMenuItem>
          )}
          {(isOwner || isAdmin) && (
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />Excluir
            </DropdownMenuItem>
          )}
          {isAdmin && !isOwner && (
            <DropdownMenuItem onClick={() => setShowBlockModal(true)}>
              <ShieldAlert className="h-4 w-4 mr-2" />Bloquear usuário
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showBlockModal && (
        <AdminBlockModal
          targetUserId={postUserId}
          onClose={() => setShowBlockModal(false)}
        />
      )}
    </>
  );
}
