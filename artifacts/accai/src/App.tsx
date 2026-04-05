import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cuenta } from "@/pages/Cuenta";
import { Reels } from "@/pages/Reels";
import { ReelDetail } from "@/pages/ReelDetail";
import { Competidores } from "@/pages/Competidores";
import { AccaiAI } from "@/pages/AccaiAI";
import { Plan90D } from "@/pages/Plan90D";

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
        <Route path="/">
          <Redirect to="/cuenta" />
        </Route>
        <Route path="/cuenta" component={Cuenta} />
        <Route path="/reels" component={Reels} />
        <Route path="/reels/:id" component={ReelDetail} />
        <Route path="/competidores" component={Competidores} />
        <Route path="/accai-ai" component={AccaiAI} />
        <Route path="/plan-90d" component={Plan90D} />
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
