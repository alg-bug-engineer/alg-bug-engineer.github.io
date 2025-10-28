import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, RequireAuth } from 'miaoda-auth-react';
import { supabase } from '@/db/supabase';
import { Toaster } from '@/components/ui/sonner';
import Header from '@/components/common/Header';
import routes from './routes';

export default function App() {
  return (
    <Router>
      <AuthProvider client={supabase}>
        <Toaster />
        <RequireAuth whiteList={['/login', '/404']}>
          <Header />
          <Routes>
            {routes.map((route, index) => (
              <Route
                key={index}
                path={route.path}
                element={route.element}
              />
            ))}
          </Routes>
        </RequireAuth>
      </AuthProvider>
    </Router>
  );
}
