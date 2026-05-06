import { Capacitor } from '@capacitor/core';
import Landing from './screens/Landing';
import Onboarding from './screens/Onboarding';

/**
 * HomeGate — "portero" inteligente de la ruta raíz "/".
 *
 * - En iOS / Android (app nativa instalada): muestra el Onboarding normal.
 * - En cualquier navegador web (PC o móvil): muestra la Landing Page comercial.
 *
 * No toca ninguna lógica de autenticación ni pantallas existentes.
 */
export default function HomeGate() {
  const isNative = Capacitor.isNativePlatform();
  return isNative ? <Onboarding /> : <Landing />;
}
