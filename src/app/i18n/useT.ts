import { useSettings } from '../contexts/SettingsContext';
import { T } from './index';

/** Returns the translation object for the current app language. */
export function useT() {
  const { appSettings } = useSettings();
  return T[appSettings.idioma] ?? T.es;
}
