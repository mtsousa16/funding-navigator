import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, PlusSquare, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { icon: Home, path: '/', label: 'Feed' },
  { icon: Search, path: '/search', label: 'Buscar' },
  { icon: PlusSquare, path: '/create', label: 'Criar' },
  { icon: MessageCircle, path: '/messages', label: 'DM' },
  { icon: User, path: '/profile', label: 'Perfil' },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t-0 flex items-center justify-around h-16 z-50">
      {NAV_ITEMS.map(item => {
        const active = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 p-2 transition-all duration-200 rounded-xl min-w-[48px]',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className={cn(
              'p-1.5 rounded-lg transition-all duration-200',
              active && 'bg-primary/15'
            )}>
              <item.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.5} />
            </div>
            <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
