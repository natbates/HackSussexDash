// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/misc/protectedRoute.jsx";
import { AuthProvider } from "./hooks/useAuth.jsx";

import Footer from "./components/ui/footer/footer.jsx";
import Navbar from "./components/ui/navbar/navbar.jsx";

import LoginPage from "./pages/login/login.jsx";
import Callback from "./components/misc/callback.jsx";

import NotFound from "./pages/not-found/notFound.jsx";
import Dashboard from "./pages/dashboard/dashboard.jsx";

import "./styles/global.css";
import "./styles/queries.css";

const App = () => (
  
  <AuthProvider>
    <div className="page-container">
      <Navbar />
      <div className="content-wrap">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/callback" element={<Callback />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                  <Dashboard />
              </ProtectedRoute>
              }
            >

          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </div>
  </AuthProvider>
);

export default App;
