import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import InfoPage from "./pages/InfoPage";
import NotFound from "./pages/NotFound";
import "./App.css";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/features" element={<InfoPage type="features" />} />
          <Route path="/how-it-works" element={<InfoPage type="how" />} />
          <Route path="/faq" element={<InfoPage type="faq" />} />
          <Route path="/privacy" element={<InfoPage type="privacy" />} />
          <Route path="/about" element={<InfoPage type="about" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
