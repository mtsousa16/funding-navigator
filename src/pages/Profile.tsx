import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AvatarCropDialog } from '@/components/AvatarCropDialog';
import { Settings, Grid3X3, Link as LinkIcon, LogOut, AtSign, Mail, MessageCircle } from 'lucide-react';

interface ProfilePageProps {
  currentUserId?: string;
  onSignOut?: () => void;
}

export default function ProfilePage({ currentUserId, onSignOut }: ProfilePageProps) {
  const { userId: paramUserId } = useParams();
  const profileUserId = paramUserId || currentUserId;
  const isOwnProfile = profileUserId === currentUserId;
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMutual, setIsMutual] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editShowEmail, setEditShowEmail] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [showCrop, setShowCrop] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!profileUserId) return;

    supabase.from('profiles').select('*').eq('user_id', profileUserId).single()
      .then(({ data }) => {
        setProfile(data);
        if (data) {
          setEditName(data.display_name || '');
          setEditUsername(data.username || '');
          setEditBio(data.bio || '');
          setEditWebsite(data.website_url || '');
          setEditShowEmail(data.show_email || false);
        }
      });

    if (isOwnProfile) {
      supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email || null));
    }

    supabase.from('posts').select('*').eq('user_id', profileUserId).order('created_at', { ascending: false })
      .then(({ data }) => setPosts(data || []));

    supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', profileUserId)
      .then(({ count }) => setFollowersCount(count || 0));

    supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', profileUserId)
      .then(({ count }) => setFollowingCount(count || 0));

    if (currentUserId && currentUserId !== profileUserId) {
      // Check if I follow them
      supabase.from('follows').select('id').eq('follower_id', currentUserId).eq('following_id', profileUserId).single()
        .then(({ data }) => setIsFollowing(!!data));
      // Check if they follow me (for DM mutual check)
      Promise.all([
        supabase.from('follows').select('id').eq('follower_id', currentUserId).eq('following_id', profileUserId).single(),
        supabase.from('follows').select('id').eq('follower_id', profileUserId).eq('following_id', currentUserId).single(),
      ]).then(([a, b]) => setIsMutual(!!a.data && !!b.data));
    }
  }, [profileUserId, currentUserId]);

  const handleFollow = async () => {
    if (!currentUserId || !profileUserId) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', profileUserId);
      setIsFollowing(false);
      setIsMutual(false);
      setFollowersCount(c => c - 1);
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: profileUserId });
      setIsFollowing(true);
      setFollowersCount(c => c + 1);
      // Check if now mutual
      const { data: theyFollowMe } = await supabase.from('follows').select('id').eq('follower_id', profileUserId).eq('following_id', currentUserId).single();
      setIsMutual(!!theyFollowMe);
      // Notify
      await supabase.from('notifications').insert({
        user_id: profileUserId, type: 'follow', title: 'Novo seguidor',
        body: 'Alguém começou a seguir você.', related_user_id: currentUserId,
      });
    }
  };

  const handleSendMessage = async () => {
    if (!currentUserId || !profileUserId) return;
    // Check if conversation exists
    const { data: myParts } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', currentUserId);
    const { data: theirParts } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', profileUserId);
    const myConvos = new Set((myParts || []).map(p => p.conversation_id));
    const existingConvo = (theirParts || []).find(p => myConvos.has(p.conversation_id));

    if (existingConvo) {
      navigate('/messages');
      return;
    }

    // Create new conversation
    const { data: convo } = await supabase.from('conversations').insert({}).select('id').single();
    if (convo) {
      await supabase.from('conversation_participants').insert([
        { conversation_id: convo.id, user_id: currentUserId },
        { conversation_id: convo.id, user_id: profileUserId },
      ]);
      navigate('/messages');
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUserId) return;
    const { error } = await supabase.from('profiles').update({
      display_name: editName,
      username: editUsername.toLowerCase() || null,
      bio: editBio,
      website_url: editWebsite,
      show_email: editShowEmail,
    }).eq('user_id', currentUserId);
    if (error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        toast({ title: 'Username já em uso', description: 'Escolha outro nome de usuário.', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      }
      return;
    }
    setProfile((p: any) => ({ ...p, display_name: editName, username: editUsername.toLowerCase(), bio: editBio, website_url: editWebsite, show_email: editShowEmail }));
    setEditing(false);
    toast({ title: 'Perfil atualizado!' });
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    setShowCrop(true);
    e.target.value = '';
  };

  const handleCropComplete = async (blob: Blob) => {
    if (!currentUserId) return;
    setShowCrop(false);
    const path = `${currentUserId}/avatar.png`;
    await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/png' });
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = data.publicUrl + '?t=' + Date.now();
    await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', currentUserId);
    setProfile((p: any) => ({ ...p, avatar_url: url }));
    toast({ title: 'Foto atualizada!' });
  };

  const headerName = profile?.username ? `@${profile.username}` : profile?.display_name || 'Perfil';

  if (!profile) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-lg mx-auto pb-16">
      <div className="sticky top-0 bg-card z-40 border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold">{headerName}</h1>
        {isOwnProfile && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(!editing)}><Settings className="h-5 w-5 text-foreground" /></button>
            <button onClick={onSignOut}><LogOut className="h-5 w-5 text-foreground" /></button>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Profile header */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-20 w-20">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="text-2xl bg-secondary text-secondary-foreground">
                {(profile.display_name || profile.username || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <>
                <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 text-xs">+</button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              </>
            )}
          </div>
          <div className="flex-1 flex justify-around text-center">
            <div><div className="font-bold text-lg">{posts.length}</div><div className="text-xs text-muted-foreground">posts</div></div>
            <div><div className="font-bold text-lg">{followersCount}</div><div className="text-xs text-muted-foreground">seguidores</div></div>
            <div><div className="font-bold text-lg">{followingCount}</div><div className="text-xs text-muted-foreground">seguindo</div></div>
          </div>
        </div>

        {/* Bio section */}
        <div>
          {profile.display_name && <p className="font-semibold text-sm">{profile.display_name}</p>}
          {profile.username && (
            <p className="text-sm text-primary flex items-center gap-1"><AtSign className="h-3 w-3" />{profile.username}</p>
          )}
          {profile.show_email && userEmail && isOwnProfile && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Mail className="h-3 w-3" />{userEmail}</p>
          )}
          {profile.show_email && !isOwnProfile && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Mail className="h-3 w-3" />Email público habilitado</p>
          )}
          {profile.bio && <p className="text-sm mt-1">{profile.bio}</p>}
          {profile.website_url && (
            <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1 mt-1">
              <LinkIcon className="h-3 w-3" />{profile.website_url}
            </a>
          )}
        </div>

        {/* Actions */}
        {!isOwnProfile && (
          <div className="flex gap-2">
            <Button onClick={handleFollow} variant={isFollowing ? 'outline' : 'default'} className="flex-1">
              {isFollowing ? 'Deixar de Seguir' : 'Seguir'}
            </Button>
            <Button
              onClick={handleSendMessage}
              variant="secondary"
              className="flex-1 gap-2"
              disabled={!isMutual}
              title={!isMutual ? 'Vocês precisam se seguir mutuamente para enviar mensagens' : ''}
            >
              <MessageCircle className="h-4 w-4" />
              {isMutual ? 'Mensagem' : 'DM bloqueada'}
            </Button>
          </div>
        )}
        {!isOwnProfile && !isMutual && isFollowing && (
          <p className="text-xs text-muted-foreground text-center">💡 Vocês precisam se seguir mutuamente para trocar mensagens.</p>
        )}

        {/* Edit form */}
        {editing && isOwnProfile && (
          <div className="space-y-3 p-4 rounded-lg bg-secondary border border-border">
            <Input placeholder="Nome de exibição" value={editName} onChange={e => setEditName(e.target.value)} />
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="username" value={editUsername} onChange={e => setEditUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase())} className="pl-9" />
            </div>
            <Textarea placeholder="Bio" value={editBio} onChange={e => setEditBio(e.target.value)} className="min-h-[60px]" />
            <Input placeholder="Website" value={editWebsite} onChange={e => setEditWebsite(e.target.value)} />
            <div className="flex items-center justify-between">
              <Label htmlFor="show-email" className="text-sm">Mostrar email no perfil</Label>
              <Switch id="show-email" checked={editShowEmail} onCheckedChange={setEditShowEmail} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveProfile} className="flex-1">Salvar</Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">Cancelar</Button>
            </div>
          </div>
        )}

        {/* Posts grid */}
        <div className="flex items-center justify-center border-t border-border pt-3 mb-2">
          <Grid3X3 className="h-4 w-4 text-foreground mr-1" />
          <span className="text-xs font-semibold uppercase">Publicações</span>
        </div>

        {posts.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhuma publicação</p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map(post => (
              <div key={post.id} className="aspect-square bg-secondary rounded overflow-hidden">
                {post.image_url ? (
                  <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <p className="text-xs text-muted-foreground line-clamp-3">{post.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AvatarCropDialog open={showCrop} onClose={() => setShowCrop(false)} imageFile={cropFile} onCropComplete={handleCropComplete} />
    </div>
  );
}
