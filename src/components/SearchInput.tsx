import { useState, useRef, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getAllOrganizationNames } from '@/data/mockData';

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchInput({ onSearch, isLoading }: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const allNames = getAllOrganizationNames();

  useEffect(() => {
    if (query.length >= 2) {
      const q = query.toLowerCase();
      setSuggestions(allNames.filter(n => n.toLowerCase().includes(q)).slice(0, 5));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [query, allNames]);

  const handleSubmit = (value?: string) => {
    const searchQuery = value || query;
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Pesquisar organização... (ex: ANTRA, Conectas, Geledés)"
          className="pl-12 pr-12 h-14 text-base glass-panel border-border/50 focus:border-primary/50 glow-primary"
          disabled={isLoading}
        />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary animate-spin" />
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute w-full mt-1 glass-panel border border-border/50 rounded-lg overflow-hidden z-50">
          {suggestions.map((s) => (
            <button
              key={s}
              className="w-full text-left px-4 py-3 text-sm hover:bg-primary/10 transition-colors"
              onMouseDown={() => {
                setQuery(s);
                handleSubmit(s);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
