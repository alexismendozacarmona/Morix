/**
 * billingService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Puente entre Morix y los sistemas de pago nativos (Google Play / App Store).
 * Usa RevenueCat (@revenuecat/purchases-capacitor) para gestionar suscripciones.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Purchases, LOG_LEVEL, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

// 🔑 REVENUECAT API KEYS
const RC_GOOGLE_KEY = 'goog_ovuVpnYioNhuaZsVYTBGKvnCCWr'; // Google Play
const RC_APPLE_KEY  = 'appl_example_key'; // App Store (Pendiente)

// El MOCK_MODE permite probar la UI sin estar en un emulador real
const IS_NATIVE = Capacitor.isNativePlatform();
const MOCK_MODE = !IS_NATIVE;

export interface BillingStatus {
  isActive: boolean;
  type: 'free' | 'trial' | 'premium';
}

export const BillingService = {
  /**
   * Inicializa RevenueCat. Debe llamarse al abrir la app (en App.tsx o Root.tsx).
   */
  async init(userId: string) {
    if (MOCK_MODE) {
      console.log('[BillingService] Mock Init for User:', userId);
      return;
    }

    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      
      const apiKey = Capacitor.getPlatform() === 'ios' ? RC_APPLE_KEY : RC_GOOGLE_KEY;
      await Purchases.configure({ apiKey, appUserID: userId });
      
      console.log('[BillingService] RevenueCat configurado correctamente.');
    } catch (e) {
      console.error('[BillingService] Error al configurar RevenueCat:', e);
    }
  },

  /**
   * Obtiene el estado actual de la suscripción.
   */
  async getStatus(): Promise<BillingStatus> {
    if (MOCK_MODE) {
      // Simula estado basado en lo que hayamos guardado localmente o en Supabase
      return { isActive: false, type: 'free' };
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      // 'premium' debe ser el ID de tu Entitlement en el dashboard de RevenueCat
      const premiumEntitlement = customerInfo.customerInfo.entitlements.active['premium'];
      
      return {
        isActive: !!premiumEntitlement,
        type: premiumEntitlement ? 'premium' : 'free'
      };
    } catch (e) {
      console.error('[BillingService] Error al obtener info del cliente:', e);
      return { isActive: false, type: 'free' };
    }
  },

  /**
   * Ejecuta la compra de un plan.
   * @param planType 'mensual' | 'anual'
   */
  async purchasePlan(planType: 'mensual' | 'anual'): Promise<boolean> {
    console.log(`[BillingService] Iniciando compra de plan: ${planType}`);

    if (MOCK_MODE) {
      // Simulación de éxito tras 2 segundos
      await new Promise(r => setTimeout(r, 2000));
      console.log('[BillingService] MOCK: Compra exitosa');
      return true;
    }

    try {
      // 1. Obtener los productos configurados en RevenueCat (Offerings)
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;

      if (!currentOffering) {
        alert('No hay ofertas configuradas en RevenueCat. Revisa que el ID del paquete en Google Play coincida.');
        throw new Error('No hay ofertas configuradas en el dashboard de RevenueCat.');
      }

      // 2. Buscar el paquete que coincida (ej: 'mensual' o 'anual')
      // Buscamos coincidencias flexibles (español o inglés)
      const pkg = currentOffering.availablePackages.find(p => {
        const id = p.identifier.toLowerCase();
        if (planType === 'mensual') return id.includes('mensual') || id.includes('monthly');
        if (planType === 'anual')   return id.includes('anual') || id.includes('annual') || id.includes('yearly');
        return false;
      });

      if (!pkg) {
        throw new Error(`Paquete ${planType} no encontrado. Asegúrate de configurar identificadores que contengan 'monthly' o 'annual' en RevenueCat.`);
      }

      // 3. Lanzar el flujo de pago nativo (Google/Apple)
      const purchaseResult = await Purchases.purchasePackage({ aPackage: pkg });
      
      // Si llegamos aquí sin excepción, la compra fue exitosa
      return !!purchaseResult.customerInfo.entitlements.active['premium'];

    } catch (e: any) {
      if (e.userCancelled) {
        console.log('[BillingService] El usuario canceló la compra.');
      } else {
        console.error('[BillingService] Error en la compra:', e);
        alert('Error en la compra: ' + (e.message || 'Error desconocido. Revisa la configuración de RevenueCat.'));
      }
      return false;
    }
  },

  /**
   * Restaura compras anteriores (útil si el usuario reinstala la app).
   */
  async restorePurchases(): Promise<boolean> {
    if (MOCK_MODE) return true;
    try {
      const customerInfo = await Purchases.restorePurchases();
      return !!customerInfo.customerInfo.entitlements.active['premium'];
    } catch (e) {
      console.error('[BillingService] Error al restaurar:', e);
      return false;
    }
  }
};
