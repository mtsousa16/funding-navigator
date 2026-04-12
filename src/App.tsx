import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useInvestigation } from "@/hooks/useInvestigation";
import { useCredits } from "@/hooks/useCredits";
import { BottomNav } from "@/components/BottomNav";
import AuthPage from "./pages/Auth";
import FeedPage from "./pages/Feed";
import SearchPage from "./pages/Index";
import CreatePostPage from "./pages/CreatePost";
import ProfilePage from "./pages/Profile";
import MessagesPage from "./pages/Messages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { state, lastResult, isSearching, searchError, search, clearInvestigation } = useInvestigation();
  const { canSearch, remaining, consumeCredit } = useCredits(user?.id, isAdmin);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const handleSearch = async (query: string) => {
    const allowed = await consumeCredit();
    if (!allowed) return null;
    return search(query);
  };

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<FeedPage currentUserId={user.id} />} />
        <Route
          path="/search"
          element={
            <SearchPage
              onSearch={handleSearch}
              isSearching={isSearching}
              lastResult={lastResult}
              canSearch={canSearch}
              remaining={remaining}
              isAdmin={isAdmin}
              currentUserId={user.id}
              state={state}
              onClearInvestigation={clearInvestigation}
            />
          }
        />
        <Route path="/create" element={<CreatePostPage currentUserId={user.id} />} />
        <Route path="/messages" element={<MessagesPage currentUserId={user.id} />} />
        <Route path="/profile" element={<ProfilePage currentUserId={user.id} onSignOut={signOut} />} />
        <Route path="/profile/:userId" element={<ProfilePage currentUserId={user.id} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
