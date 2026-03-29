import { createBrowserRouter } from 'react-router';
import Home from './pages/Home';
import Admin from './pages/Admin';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Home,
  },
  {
    path: '/admin',
    Component: Admin,
  },
  {
    path: '*',
    Component: Home,
  },
]);