import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Play from "./pages/Play";
import About from "./pages/About";
import Variants from "./pages/Variants";
import Stats from "./pages/Stats";
import MultiplayerLobby from "./pages/MultiplayerLobby";
import MultiplayerGame from "./pages/MultiplayerGame";
import Profile from "./pages/Profile";
import Layout from "./components/Layout";
import ChessScene3D from "./components/ChessScene3D";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/play" component={Play} />
      <Route path="/play/online" component={MultiplayerLobby} />
      <Route path="/play/online/:id" component={MultiplayerGame} />
      <Route path="/about" component={About} />
      <Route path="/variants" component={Variants} />
      <Route path="/stats" component={Stats} />
      <Route path="/profile" component={Profile} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <ChessScene3D />
          <Layout>
            <Router />
          </Layout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
