import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useInvestigation } from "@/hooks/useInvestigation";
import SearchPage from "./pages/Index";
import InvestigationPage from "./pages/Investigation";
import InsightsPage from "./pages/Insights";
import AllGrantsPage from "./pages/AllGrants";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppLayout() {
  const { state, lastResult, isSearching, searchError, search, clearInvestigation } = useInvestigation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          searchCount={state.searchHistory.length}
          onClearInvestigation={clearInvestigation}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border/50 px-4 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Routes>
              <Route
                path="/"
                element={
                  <SearchPage
                    onSearch={search}
                    isSearching={isSearching}
                    lastResult={lastResult}
                  />
                }
              />
              <Route
                path="/investigation"
                element={<InvestigationPage state={state} />}
              />
              <Route
                path="/insights"
                element={<InsightsPage state={state} />}
              />
              <Route path="/grants" element={<AllGrantsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
