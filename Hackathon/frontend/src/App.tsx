import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing";
import RoleSelect from "./pages/RoleSelect";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

import CustomerLayout from "./pages/customer/CustomerLayout";
import Home from "./pages/customer/Home";
import MapView from "./pages/customer/MapView";
import Saved from "./pages/customer/Saved";
import Redeemed from "./pages/customer/Redeemed";
import Profile from "./pages/customer/Profile";
import Wallet from "./pages/customer/Wallet";

import MerchantLayout from "./pages/merchant/MerchantLayout";
import Dashboard from "./pages/merchant/Dashboard";
import CreateOffer from "./pages/merchant/CreateOffer";
import Analytics from "./pages/merchant/Analytics";
import BusinessProfile from "./pages/merchant/BusinessProfile";
import CouponClaims from "./pages/merchant/CouponClaims";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/start" element={<RoleSelect />} />
          <Route path="/auth" element={<Auth />} />

          <Route path="/app" element={<CustomerLayout />}>
            <Route index element={<Home />} />
            <Route path="map" element={<MapView />} />
            <Route path="saved" element={<Saved />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="redeemed" element={<Redeemed />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="/merchant" element={<MerchantLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="create" element={<CreateOffer />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="claims" element={<CouponClaims />} />
            <Route path="profile" element={<BusinessProfile />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
