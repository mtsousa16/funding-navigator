import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, AtSign, Shield } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!username.trim()) {
          toast({ title: 'Erro', description: 'Nome de usuário é obrigatório.', variant: 'destructive' });
          setLoading(false);
          return;
        }
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.trim().toLowerCase())
          .maybeSingle();
        if (existing) {
          toast({ title: 'Erro', description: 'Esse nome de usuário já está em uso.', variant: 'destructive' });
          setLoading(false);
          return;
        }
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              username: username.trim().toLowerCase(),
              full_name: displayName.trim() || username.trim(),
            }
          }
        });
        if (error) throw error;
        if (signUpData.user) {
          await supabase.from('profiles').update({
            username: username.trim().toLowerCase(),
            display_name: displayName.trim() || username.trim(),
          }).eq('user_id', signUpData.user.id);
        }
        toast({ title: 'Conta criada!', description: 'Bem-vindo ao GrandeIrmão.' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({ title: 'Erro', description: String(result.error), variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-[-30%] left-[-20%] w-[70vw] h-[70vw] rounded-full bg-primary/8 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-primary/5 blur-[100px]" />
      <div className="absolute inset-0 scan-line pointer-events-none" />

      {/* Glass card */}
      <div className="relative w-full max-w-sm glass-panel rounded-2xl p-6 space-y-6 glow-border">
        {/* Logo / Brand */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-xl bg-primary/15 flex items-center justify-center border border-primary/30 animate-pulse-glow">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground glow-text tracking-tight">
            GrandeIrmão
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? 'Acesse sua central de investigação' : 'Crie sua conta investigativa'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Usuário</label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="nome.de.usuario"
                    value={username}
                    onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase())}
                    className="pl-9 bg-input/50 border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all"
                    required
                    minLength={3}
                    maxLength={30}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome de exibição</label>
                <Input
                  placeholder="Seu nome"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="bg-input/50 border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="bg-input/50 border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Senha</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-input/50 border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isLogin && (
            <button type="button" className="text-xs text-primary/70 hover:text-primary transition-colors">
              Esqueceu a senha?
            </button>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all duration-300"
            disabled={loading}
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : isLogin ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="glass-card px-3 py-0.5 rounded-full text-muted-foreground text-[10px] tracking-widest">ou</span>
          </div>
        </div>

        {/* Google */}
        <Button
          variant="outline"
          className="w-full glass-card border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
          onClick={handleGoogle}
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Entrar com Google
        </Button>

        {/* Toggle */}
        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? 'Novo investigador?' : 'Já tem acesso?'}{' '}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-semibold hover:text-primary/80 transition-colors"
          >
            {isLogin ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  );
}
