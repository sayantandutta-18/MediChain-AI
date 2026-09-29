import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ApiStatusProvider } from '@/context/ApiStatusContext';
import { AppRoutes } from '@/routes/AppRoutes';

export const App = () => (
  <BrowserRouter>
    <ApiStatusProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ApiStatusProvider>
  </BrowserRouter>
);

export default App;
