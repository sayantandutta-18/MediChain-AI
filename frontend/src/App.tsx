import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ApiStatusProvider } from '@/context/ApiStatusContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { AppRoutes } from '@/routes/AppRoutes';

export const App = () => (
  <BrowserRouter>
    <ApiStatusProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </ApiStatusProvider>
  </BrowserRouter>
);

export default App;
