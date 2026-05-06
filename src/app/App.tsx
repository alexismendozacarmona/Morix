import { RouterProvider } from 'react-router';
import { router } from './routes';

/**
 * App owns only the router. All context providers live inside Root.tsx
 * (the root route component) so they share the same React module instance
 * as every consumer, avoiding any HMR context-identity mismatches.
 */
export default function App() {
  return <RouterProvider router={router} />;
}
