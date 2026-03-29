import { RouterProvider } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { router } from './routes';

export default function App() {
  return (
    <>
      <RouterProvider router={router} fallbackElement={<div className="flex items-center justify-center min-h-screen">Loading...</div>} />
      <Toaster position="top-center" richColors />
    </>
  );
}