import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, PlusSquare, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { icon: Home, path: '/', label: 'Feed' },
  { icon: Search, path: '/search', label: 'Buscar' },
  { icon: PlusSquare, path: '/create', label: 'Criar' },
  { icon: MessageCircle, path: '/messages', label: 'Mensagens' },
  { icon: User, path: '/profile', label: 'Perfil' },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around h-14 z-50">
      {NAV_ITEMS.map(item => {
        const active = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 p-2 transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <item.icon className="h-6 w-6" strokeWidth={active ? 2.5 : 1.5} />
          </button>
        );
      })}
    </nav>
  );
}
