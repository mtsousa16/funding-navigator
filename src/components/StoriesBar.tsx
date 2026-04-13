import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Plus, X, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Story {
  id: string;
  user_id: string;
  image_url: string | null;
  text_content: string | null;
  created_at: string;
  expires_at: string;
}

interface UserStories {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  stories: Story[];
  hasUnviewed: boolean;
}

interface StoriesBarProps {
  currentUserId?: string;
  blocked?: boolean;
}

export function StoriesBar({ currentUserId, blocked }: StoriesBarProps) {
  const [userStories, setUserStories] = useState<UserStories[]>([]);
  const [activeStory, setActiveStory] = useState<{ userIdx: number; storyIdx: number } | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [viewers, setViewers] = useState<any[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStories = async () => {
    const { data: stories } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (!stories || stories.length === 0) {
      setUserStories([]);
      return;
    }

    // Get profiles for all story users
    const userIds = [...new Set(stories.map((s: any) => s.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, username')
      .in('user_id', userIds);

    // Get viewed stories by current user
    let viewedStoryIds = new Set<string>();
    if (currentUserId) {
      const { data: views } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', currentUserId);
      viewedStoryIds = new Set((views || []).map((v: any) => v.story_id));
    }

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const grouped = new Map<string, UserStories>();

    for (const s of stories as any[]) {
      if (!grouped.has(s.user_id)) {
        const p = profileMap.get(s.user_id);
        grouped.set(s.user_id, {
          userId: s.user_id,
          displayName: (p as any)?.username || (p as any)?.display_name || 'Usuário',
          avatarUrl: (p as any)?.avatar_url || null,
          stories: [],
          hasUnviewed: false,
        });
      }
      const group = grouped.get(s.user_id)!;
      group.stories.push(s as Story);
      if (!viewedStoryIds.has(s.id)) group.hasUnviewed = true;
    }

    // Own stories first
    const arr = Array.from(grouped.values());
    const own = arr.filter(u => u.userId === currentUserId);
    const others = arr.filter(u => u.userId !== currentUserId);
    setUserStories([...own, ...others]);
  };

  useEffect(() => { fetchStories(); }, [currentUserId]);

  const openStory = async (userIdx: number, storyIdx: number = 0) => {
    setActiveStory({ userIdx, storyIdx });
    setShowViewers(false);
    const story = userStories[userIdx]?.stories[storyIdx];
    if (!story || !currentUserId) return;

    // Record view
    if (story.user_id !== currentUserId) {
      await supabase.from('story_views').upsert(
        { story_id: story.id, viewer_id: currentUserId },
        { onConflict: 'story_id,viewer_id' }
      );
    }

    // Fetch view count
    loadViewData(story.id);

    // Auto-advance after 5s
    if (progressRef.current) clearTimeout(progressRef.current);
    progressRef.current = setTimeout(() => advanceStory(userIdx, storyIdx), 5000);
  };

  const loadViewData = async (storyId: string) => {
    const { count } = await supabase
      .from('story_views')
      .select('id', { count: 'exact' })
      .eq('story_id', storyId);
    setViewCount(count || 0);
  };

  const loadViewers = async (storyId: string) => {
    const { data } = await supabase
      .from('story_views')
      .select('viewer_id, viewed_at')
      .eq('story_id', storyId)
      .order('viewed_at', { ascending: false });

    if (data && data.length > 0) {
      const viewerIds = data.map((v: any) => v.viewer_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, username')
        .in('user_id', viewerIds);
      const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setViewers(data.map((v: any) => ({
        ...v,
        profile: pMap.get(v.viewer_id) || { display_name: 'Usuário' }
      })));
    }
    setShowViewers(true);
  };

  const advanceStory = (userIdx: number, storyIdx: number) => {
    const user = userStories[userIdx];
    if (!user) { closeStory(); return; }
    if (storyIdx + 1 < user.stories.length) {
      openStory(userIdx, storyIdx + 1);
    } else if (userIdx + 1 < userStories.length) {
      openStory(userIdx + 1, 0);
    } else {
      closeStory();
    }
  };

  const prevStory = () => {
    if (!activeStory) return;
    const { userIdx, storyIdx } = activeStory;
    if (storyIdx > 0) {
      openStory(userIdx, storyIdx - 1);
    } else if (userIdx > 0) {
      const prevUser = userStories[userIdx - 1];
      openStory(userIdx - 1, prevUser.stories.length - 1);
    }
  };

  const closeStory = () => {
    if (progressRef.current) clearTimeout(progressRef.current);
    setActiveStory(null);
    setShowViewers(false);
    fetchStories();
  };

  const handleCreateStory = async (file: File) => {
    if (!currentUserId || blocked) return;
    setCreating(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${currentUserId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('story-media').upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('story-media').getPublicUrl(path);

      await supabase.from('stories').insert({
        user_id: currentUserId,
        image_url: urlData.publicUrl,
      } as any);

      toast({ title: 'Story publicado!' });
      fetchStories();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const currentStory = activeStory ? userStories[activeStory.userIdx]?.stories[activeStory.storyIdx] : null;
  const currentStoryUser = activeStory ? userStories[activeStory.userIdx] : null;
  const isOwnStory = currentStory?.user_id === currentUserId;

  return (
    <>
      {/* Stories row */}
      <div className="flex gap-3 px-4 py-3 overflow-x-auto border-b border-border bg-card">
        {/* Add story button */}
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-1 min-w-[64px]"
          disabled={creating}
        >
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center bg-secondary">
            {creating ? (
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="h-6 w-6 text-primary" />
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">Seu story</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleCreateStory(f);
            e.target.value = '';
          }}
        />

        {/* User stories */}
        {userStories.map((us, idx) => (
          <button
            key={us.userId}
            onClick={() => openStory(idx)}
            className="flex flex-col items-center gap-1 min-w-[64px]"
          >
            <div className={`w-16 h-16 rounded-full p-0.5 ${us.hasUnviewed ? 'bg-gradient-to-br from-primary to-pink-500' : 'bg-muted'}`}>
              <Avatar className="w-full h-full border-2 border-card">
                {us.avatarUrl && <AvatarImage src={us.avatarUrl} className="object-cover" />}
                <AvatarFallback className="text-sm bg-secondary text-secondary-foreground">
                  {us.displayName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-[10px] text-foreground truncate max-w-[64px]">
              {us.userId === currentUserId ? 'Você' : us.displayName}
            </span>
          </button>
        ))}
      </div>

      {/* Story viewer overlay */}
      {activeStory && currentStory && currentStoryUser && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Progress bars */}
          <div className="flex gap-1 px-2 pt-2">
            {currentStoryUser.stories.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                <div
                  className={`h-full rounded-full ${i < activeStory.storyIdx ? 'bg-white w-full' : i === activeStory.storyIdx ? 'bg-white animate-progress' : 'w-0'}`}
                  style={i === activeStory.storyIdx ? { animation: 'progress 5s linear forwards' } : {}}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar className="h-8 w-8">
              {currentStoryUser.avatarUrl && <AvatarImage src={currentStoryUser.avatarUrl} />}
              <AvatarFallback className="text-xs">{currentStoryUser.displayName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <span className="text-white text-sm font-semibold">{currentStoryUser.displayName}</span>
              <span className="text-white/60 text-xs ml-2">
                {new Date(currentStory.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <button onClick={closeStory} className="text-white p-1"><X className="h-6 w-6" /></button>
          </div>

          {/* Story content */}
          <div className="flex-1 relative flex items-center justify-center">
            {currentStory.image_url ? (
              <img src={currentStory.image_url} alt="" className="max-w-full max-h-full object-contain" />
            ) : (
              <p className="text-white text-xl px-8 text-center">{currentStory.text_content}</p>
            )}

            {/* Nav zones */}
            <button onClick={prevStory} className="absolute left-0 top-0 bottom-0 w-1/3" />
            <button onClick={() => advanceStory(activeStory.userIdx, activeStory.storyIdx)} className="absolute right-0 top-0 bottom-0 w-1/3" />
          </div>

          {/* Footer - view count (own stories) */}
          {isOwnStory && (
            <div className="px-4 py-3">
              <button
                onClick={() => loadViewers(currentStory.id)}
                className="flex items-center gap-2 text-white/80"
              >
                <Eye className="h-4 w-4" />
                <span className="text-sm">{viewCount} visualizações</span>
              </button>
            </div>
          )}

          {/* Viewers panel */}
          {showViewers && isOwnStory && (
            <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[60vh] overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Visualizações ({viewCount})</h3>
                <button onClick={() => setShowViewers(false)}><X className="h-5 w-5 text-foreground" /></button>
              </div>
              {viewers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma visualização ainda</p>
              ) : (
                viewers.map((v: any) => (
                  <div key={v.viewer_id} className="flex items-center gap-3 py-2">
                    <Avatar className="h-8 w-8">
                      {v.profile?.avatar_url && <AvatarImage src={v.profile.avatar_url} />}
                      <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                        {(v.profile?.username || v.profile?.display_name || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground">{v.profile?.username || v.profile?.display_name || 'Usuário'}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(v.viewed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </>
  );
}
