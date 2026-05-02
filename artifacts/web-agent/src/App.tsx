import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import Outputs from "@/pages/Outputs";
import Preview from "@/pages/Preview";
import Templates from "@/pages/Templates";
import History from "@/pages/History";
import Extract from "@/pages/Extract";
import ImageToPage from "@/pages/ImageToPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/outputs" component={Outputs} />
        <Route path="/preview" component={Preview} />
        <Route path="/templates" component={Templates} />
        <Route path="/history" component={History} />
        <Route path="/extract" component={Extract} />
        <Route path="/image-to-page" component={ImageToPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
