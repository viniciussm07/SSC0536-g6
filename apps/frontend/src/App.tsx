import { RouterProvider } from '@tanstack/react-router';
import { criarRouter } from '@/router';

const router = criarRouter();

export default function App() {
  return <RouterProvider router={router} />;
}
