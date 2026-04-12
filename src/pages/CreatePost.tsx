import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus, X, ArrowLeft } from 'lucide-react';

interface CreatePostPageProps {
  currentUserId?: string;
}

export default function CreatePostPage({ currentUserId }: CreatePostPageProps) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handlePost = async () => {
    if (!currentUserId || (!content.trim() && !imageFile)) return;
    setPosting(true);

    let image_url: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const path = `${currentUserId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('post-media').upload(path, imageFile);
      if (!error) {
        const { data } = supabase.storage.from('post-media').getPublicUrl(path);
        image_url = data.publicUrl;
      }
    }

    const { error } = await supabase.from('posts').insert({
      user_id: currentUserId,
      content: content.trim() || null,
      image_url,
    });

    if (error) {
      toast({ title: 'Erro ao publicar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Publicado!' });
      navigate('/');
    }
    setPosting(false);
  };

  return (
    <div className="max-w-lg mx-auto pb-16">
      <div className="sticky top-0 bg-card z-40 border-b border-border px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-semibold">Nova publicação</h1>
        <Button size="sm" onClick={handlePost} disabled={posting || (!content.trim() && !imageFile)}>
          {posting ? '...' : 'Publicar'}
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <Textarea
          placeholder="Escreva uma legenda..."
          value={content}
          onChange={e => setContent(e.target.value)}
          className="min-h-[120px] resize-none border-none bg-transparent text-base focus-visible:ring-0"
          maxLength={2000}
        />

        {imagePreview ? (
          <div className="relative">
            <img src={imagePreview} alt="" className="w-full rounded-lg" />
            <button
              onClick={() => { setImageFile(null); setImagePreview(null); }}
              className="absolute top-2 right-2 bg-foreground/70 text-background rounded-full p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full h-48 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary transition-colors"
          >
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm">Adicionar foto</span>
          </button>
        )}

        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
      </div>
    </div>
  );
}
