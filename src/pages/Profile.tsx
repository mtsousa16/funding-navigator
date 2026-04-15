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
import { Settings, Link as LinkIcon, LogOut, AtSign, Mail, MessageCircle, FileText, Users, UserPlus } from 'lucide-react';

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
      supabase.from('follows').select('id').eq('follower_id', currentUserId).eq('following_id', profileUserId).single()
        .then(({ data }) => setIsFollowing(!!data));
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
      setIsFollowing(false); setIsMutual(false); setFollowersCount(c => c - 1);
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: profileUserId });
      setIsFollowing(true); setFollowersCount(c => c + 1);
      const { data: theyFollowMe } = await supabase.from('follows').select('id').eq('follower_id', profileUserId).eq('following_id', currentUserId).single();
      setIsMutual(!!theyFollowMe);
      await supabase.from('notifications').insert({
        user_id: profileUserId, type: 'follow', title: 'Novo seguidor',
        body: 'Alguém começou a seguir você.', related_user_id: currentUserId,
      });
    }
  };

  const handleSendMessage = async () => {
    if (!currentUserId || !profileUserId) return;
    const { data: myParts } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', currentUserId);
    const { data: theirParts } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', profileUserId);
    const myConvos = new Set((myParts || []).map(p => p.conversation_id));
    const existingConvo = (theirParts || []).find(p => myConvos.has(p.conversation_id));
    if (existingConvo) { navigate('/messages', { state: { openConvoId: existingConvo.conversation_id } }); return; }
    const { data: convo } = await supabase.from('conversations').insert({}).select('id').single();
    if (convo) {
      await supabase.from('conversation_participants').insert([
        { conversation_id: convo.id, user_id: currentUserId },
        { conversation_id: convo.id, user_id: profileUserId },
      ]);
      navigate('/messages', { state: { openConvoId: convo.id } });
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUserId) return;
    const { error } = await supabase.from('profiles').update({
      display_name: editName, username: editUsername.toLowerCase() || null,
      bio: editBio, website_url: editWebsite, show_email: editShowEmail,
    }).eq('user_id', currentUserId);
    if (error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        toast({ title: 'Username já em uso', variant: 'destructive' });
      } else { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); }
      return;
    }
    setProfile((p: any) => ({ ...p, display_name: editName, username: editUsername.toLowerCase(), bio: editBio, website_url: editWebsite, show_email: editShowEmail }));
    setEditing(false);
    toast({ title: 'Perfil atualizado!' });
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file); setShowCrop(true); e.target.value = '';
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
    <div className="max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-panel px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-heading font-semibold text-foreground">{headerName}</h1>
        {isOwnProfile && (
          <div className="flex gap-3">
            <button onClick={() => setEditing(!editing)} className="text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="h-5 w-5" />
            </button>
            <button onClick={onSignOut} className="text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <div className="p-4 space-y-5">
        {/* Profile card - glassmorphism */}
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-2 ring-primary/30">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                  {(profile.display_name || profile.username || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <>
                  <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg shadow-primary/30">+</button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                </>
              )}
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2 text-center">
              <div className="glass-card rounded-lg py-2">
                <div className="font-heading font-bold text-lg text-foreground">{posts.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
                  <FileText className="h-3 w-3" />posts
                </div>
              </div>
              <div className="glass-card rounded-lg py-2">
                <div className="font-heading font-bold text-lg text-primary">{followersCount}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
                  <Users className="h-3 w-3" />seguidores
                </div>
              </div>
              <div className="glass-card rounded-lg py-2">
                <div className="font-heading font-bold text-lg text-foreground">{followingCount}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
                  <UserPlus className="h-3 w-3" />seguindo
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1">
            {profile.display_name && <p className="font-heading font-semibold text-sm text-foreground">{profile.display_name}</p>}
            {profile.username && (
              <p className="text-sm text-primary flex items-center gap-1"><AtSign className="h-3 w-3" />{profile.username}</p>
            )}
            {profile.show_email && userEmail && isOwnProfile && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Mail className="h-3 w-3" />{userEmail}</p>
            )}
            {profile.bio && <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{profile.bio}</p>}
            {profile.website_url && (
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1 mt-1 hover:underline">
                <LinkIcon className="h-3 w-3" />{profile.website_url}
              </a>
            )}
          </div>

          {/* Actions */}
          {!isOwnProfile && (
            <div className="flex gap-2">
              <Button onClick={handleFollow} variant={isFollowing ? 'outline' : 'default'}
                className={`flex-1 ${!isFollowing ? 'bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20' : 'border-primary/30'}`}>
                {isFollowing ? 'Deixar de Seguir' : 'Seguir'}
              </Button>
              <Button onClick={handleSendMessage} variant="outline"
                className="flex-1 gap-2 border-primary/30 hover:bg-primary/10" disabled={!isMutual}
                title={!isMutual ? 'Sigam-se mutuamente para DM' : ''}>
                <MessageCircle className="h-4 w-4" />
                {isMutual ? 'Mensagem' : 'DM 🔒'}
              </Button>
            </div>
          )}
          {!isOwnProfile && !isMutual && isFollowing && (
            <p className="text-xs text-muted-foreground text-center">💡 Sigam-se mutuamente para trocar mensagens.</p>
          )}
        </div>

        {/* Edit form */}
        {editing && isOwnProfile && (
          <div className="glass-panel rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-heading font-semibold text-primary">Editar Perfil</h3>
            <Input placeholder="Nome de exibição" value={editName} onChange={e => setEditName(e.target.value)} className="bg-input/50 border-border/40" />
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="username" value={editUsername} onChange={e => setEditUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase())} className="pl-9 bg-input/50 border-border/40" />
            </div>
            <Textarea placeholder="Bio" value={editBio} onChange={e => setEditBio(e.target.value)} className="min-h-[60px] bg-input/50 border-border/40" />
            <Input placeholder="Website" value={editWebsite} onChange={e => setEditWebsite(e.target.value)} className="bg-input/50 border-border/40" />
            <div className="flex items-center justify-between">
              <Label htmlFor="show-email" className="text-sm text-foreground/80">Mostrar email</Label>
              <Switch id="show-email" checked={editShowEmail} onCheckedChange={setEditShowEmail} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveProfile} className="flex-1 bg-gradient-to-r from-primary to-primary/80">Salvar</Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="flex-1 border-border/40">Cancelar</Button>
            </div>
          </div>
        )}

        {/* Posts - blog/forum list */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 py-3">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs font-heading font-semibold uppercase tracking-widest text-muted-foreground">Publicações</span>
          </div>

          {posts.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma publicação ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map(post => (
                <div key={post.id} className="glass-card rounded-xl p-4 hover:border-primary/20 transition-all cursor-pointer">
                  {post.image_url && (
                    <img src={post.image_url} alt="" className="w-full h-40 object-cover rounded-lg mb-3" />
                  )}
                  {post.content && <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed">{post.content}</p>}
                  {post.funding_snapshot && (
                    <div className="mt-2 p-2 rounded-lg investigative-gradient border border-primary/15">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-[10px] text-primary uppercase tracking-widest font-semibold">Rastreamento</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground mt-1">{post.funding_snapshot.funderName}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(post.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AvatarCropDialog open={showCrop} onClose={() => setShowCrop(false)} imageFile={cropFile} onCropComplete={handleCropComplete} />
    </div>
  );
}
