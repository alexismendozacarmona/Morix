import { createBrowserRouter } from 'react-router';
import Root from './Root';
import HomeGate from './HomeGate';
import Onboarding from './screens/Onboarding';
import Intereses from './screens/Intereses';
import Registro from './screens/Registro';
import Login from './screens/Login';
import ConfirmSignup from './screens/ConfirmSignup';
import SetupPerfil from './screens/SetupPerfil';
import SetupObjetivo from './screens/SetupObjetivo';
import MainLayout from './layouts/MainLayout';
import Inicio from './screens/Inicio';
import Explorar from './screens/Explorar';
import VideoPlayer from './screens/VideoPlayer';
import ShortsPlayer from './screens/ShortsPlayer';
import Admin from './screens/Admin';
import MarketingCenter from './screens/MarketingCenter';
import Biblioteca from './screens/Biblioteca';
import Progreso from './screens/Progreso';
import Perfil from './screens/Perfil';
import Suscripcion from './screens/Suscripcion';
import Playlists from './screens/Playlists';
import Social from './screens/Social';
import CategoryView from './screens/CategoryView';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: HomeGate },
      { path: 'registro', Component: Registro },
      { path: 'login', Component: Login },
      { path: 'confirmar-cuenta', Component: ConfirmSignup },
      { path: 'setup-perfil', Component: SetupPerfil },
      { path: 'intereses', Component: Intereses },
      { path: 'setup-objetivo', Component: SetupObjetivo },
      { path: 'suscripcion', Component: Suscripcion },
      { path: 'video/:id', Component: VideoPlayer },
      { path: 'shorts', Component: ShortsPlayer },
      { path: 'admin', Component: Admin },
      { path: 'admin/marketing', Component: MarketingCenter },
      { path: 'categoria/:tag', Component: CategoryView },
      {
        Component: MainLayout,
        children: [
          { path: 'inicio', Component: Inicio },
          { path: 'explorar', Component: Explorar },
          { path: 'biblioteca', Component: Biblioteca },
          { path: 'playlists', Component: Playlists },
          { path: 'social', Component: Social },
          { path: 'progreso', Component: Progreso },
          { path: 'perfil', Component: Perfil },
        ],
      },
    ],
  },
]);