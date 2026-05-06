import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, Shield, FileText } from 'lucide-react';

interface Props {
  type: 'terms' | 'privacy';
  onClose: () => void;
}

export function LegalModal({ type, onClose }: Props) {
  useEffect(() => {
    // Al abrir el modal, asegurar que el teclado/scroll base se detenga si aplica
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const portal = document.getElementById('phone-frame');
  if (!portal) return null;

  const title = type === 'terms' ? 'Términos de Servicio y EULA' : 'Política de Privacidad';
  const Icon = type === 'terms' ? FileText : Shield;

  return createPortal(
    <motion.div
      className="absolute inset-0 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000 }} // Bien alto
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="absolute bottom-0 left-0 right-0 flex flex-col rounded-t-[28px] overflow-hidden"
        style={{
          height: '92%',
          background: 'linear-gradient(180deg, rgba(14,12,28,0.99) 0%, rgba(6,5,18,1) 100%)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderBottom: 'none',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[12px] flex items-center justify-center font-bold"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd' }}
            >
              <Icon size={18} />
            </div>
            <h2 className="text-white font-black text-[16px]">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          >
            <X size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        {/* Content (Text) */}
        <div className="flex-1 overflow-y-auto px-6 py-6" style={{ overscrollBehavior: 'contain' }}>
          <div className="prose prose-invert max-w-none text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            
            {type === 'terms' && (
              <>
                <p className="mb-4"><strong>Última actualización:</strong> 31 de Marzo de 2026</p>
                <p className="mb-6">
                  Al descargar o usar la aplicación Morix, estos términos se aplicarán a usted automáticamente. Por lo tanto, le recomendamos que los lea detenidamente antes de utilizar la aplicación.
                </p>

                <h3 className="text-white font-bold text-[14px] mb-2 mt-6">Licencia de Usuario Final (EULA)</h3>
                <p className="mb-4">
                  Se le otorga una licencia limitada, no exclusiva, intransferible y revocable para utilizar la aplicación Morix para fines personales y no comerciales en cualquier dispositivo móvil que usted posea o controle, según lo permitido por su tienda de aplicaciones (Apple App Store o Google Play Store). Usted es responsable del contenido que consuma o suba a través del chat de la comunidad. No se tolera contenido abusivo ni de incitación al odio. Aquellos que violen estas reglas perderán el acceso a sus cuentas y el contenido será moderado. 
                </p>

                <h3 className="text-white font-bold text-[14px] mb-2 mt-6">Uso de la Aplicación</h3>
                <ul className="list-disc pl-5 mb-4 space-y-1">
                  <li>No tiene permiso para copiar ni modificar la aplicación, ni ninguna parte de la misma ni nuestras marcas comerciales de ninguna manera.</li>
                  <li>No tiene permiso para intentar extraer el código fuente de la aplicación, ni traducir la aplicación a otros idiomas ni hacer versiones derivadas.</li>
                  <li>La aplicación en sí, así como las marcas registradas, los derechos de autor, los derechos sobre bases de datos y otros derechos de propiedad intelectual relacionados con ella, siguen perteneciendo a Morix Company.</li>
                </ul>

                <h3 className="text-white font-bold text-[14px] mb-2 mt-6">Compras y Suscripciones (App Store / Google Play)</h3>
                <p className="mb-4">
                  Ciertas características o contenidos dentro de Morix requieren pago mediante suscripción. Estas suscripciones se facturarán utilizando los sistemas de pago oficiales de su dispositivo (Apple App Store o Google Play Store). Morix no procesa ni almacena su información bancaria directamente; todas las transacciones son gestionadas de forma segura por la plataforma respectiva. Las suscripciones se renuevan automáticamente a menos que las cancele en la configuración de su cuenta de la tienda.
                </p>

                <h3 className="text-white font-bold text-[14px] mb-2 mt-6">Contenido Subido por el Usuario y Actividad (Chat y Red Social)</h3>
                <p className="mb-4">
                  Para mantener un entorno seguro y de motivación a todos nuestros miembros, nos reservamos el derecho de monitorear o censurar contenido generado por el usuario que incumpla leyes, que sea acosador u ofensivo. Cualquier falta de respeto a otros miembros de la comunidad puede implicar suspensión temporal o permanente sin derecho a reembolso de sus compras ni suscripciones activas.
                </p>

                <h3 className="text-white font-bold text-[14px] mb-2 mt-6">Cambios en los Términos</h3>
                <p className="mb-4">
                  Morix se reserva el derecho de modificar o complementar estos Términos en cualquier etapa. Es su responsabilidad revisar estos Términos ocasionalmente para estar al tanto de los cambios efectuados a los mismos.
                </p>

                <h3 className="text-white font-bold text-[14px] mb-2 mt-6">Contacto</h3>
                <p className="mb-8">
                  Si tiene alguna pregunta o sugerencia sobre nuestros Términos de Servicio y EULA (Acuerdo de Licencia Final), no dude en contactarnos a: <strong>contacto@morixoficial.com</strong>.
                </p>
              </>
            )}

            {type === 'privacy' && (
              <>
                <p className="mb-4"><strong>Última actualización:</strong> 31 de Marzo de 2026</p>
                <p className="mb-6">
                  Morix ha construido la aplicación Morix como una aplicación comercial (Freemium). El propósito de esta Política de Privacidad es informarle respecto a sus políticas en lo referente al respeto de su privacidad en caso de que alguien decida utilizar nuestro Servicio.
                </p>

                <h3 className="text-white font-bold text-[14px] mb-2 mt-6">Información que Recopilamos</h3>
                <p className="mb-4">
                  Para una mejor experiencia al utilizar nuestro Servicio, es posible que le solicitemos que nos proporcione cierta información de identificación personal. La aplicación es capaz de recopilar la información que nosotros solicitamos en su registro, que podría incluir:
                </p>
                <ul className="list-disc pl-5 mb-4 space-y-1">
                  <li><strong>Correo Electrónico (Email) y nombre completo.</strong></li>
                  <li><strong>Historial de Dispositivos y Logs:</strong> Para estadísticas propias de Supabase Authentication y seguridad de su propia cuenta.</li>
                  <li><strong>Historial de Visitas/Intereses:</strong> Para saber y predecir algoritmicamente qué contenidos sugerir.</li>
                </ul>
                <p className="mb-4">
                  Por norma y política de Supabase y nuestro diseño de la app, tu contraseña en ningún punto puede ser desencriptada por nosotros y se mantiene segura bajo métodos de *hash* en la base de datos central.
                </p>

                <h3 className="text-white font-bold text-[14px] mb-2 mt-6">Uso de la información</h3>
                <p className="mb-4">
                  Morix Company recopila dicha información para los siguientes propósitos:
                </p>
                <ul className="list-disc pl-5 mb-4 space-y-1">
                  <li>Personalizar el contenido (recomendación de meditaciones y cursos adecuados).</li>
                  <li>Permitir y mostrar su actividad, ranking y progresos en la pestaña comunitaria "Social".</li>
                  <li>Gestionar pagos o reembolsos generados en interacciones de Wompi.</li>
                </ul>

                <h3 className="text-white font-bold text-[14px] mb-2 mt-6">Servicios de Terceros</h3>
                <p className="mb-4">
                  La aplicación utiliza servicios de terceros que pueden recopilar información utilizada para identificarlo. Abajo hay un resumen de los proveedores de servicios externos utilizados por la aplicación:
                </p>
                <ul className="list-disc pl-5 mb-4 space-y-1">
                  <li><strong>Supabase:</strong> Para bases de datos y persistencia.</li>
                  <li><strong>Cloudflare R2:</strong> Analíticas de acceso de nuestros videos e imágenes.</li>
                  <li><strong>RevenueCat:</strong> Para gestionar y sincronizar sus suscripciones de forma segura entre dispositivos.</li>
                </ul>

                <h3 className="text-white font-bold text-[14px] mb-2 mt-6">Seguridad</h3>
                <p className="mb-4">
                  Valoramos su confianza al proporcionarnos su Información Personal, por lo que nos esforzamos por protegerla mediante diversos medios comercialmente viables de cifrado. Sin embargo, recuerde que ningún método de transmisión a través de Internet o de almacenamiento electrónico es 100% seguro.
                </p>

                <h3 className="text-white font-bold text-[14px] mb-2 mt-6">Contacto y Control de sus Datos</h3>
                <p className="mb-8">
                  Usted tiene derecho y la posibilidad técnica dentro del menú de Privacidad de solicitar el borrado de sus datos (Borrado Permanente de Cuenta) y la descarga del JSON de su información. Para dudas o solicitud manual, escríbanos a: <strong>contacto@morixoficial.com</strong>.
                </p>
              </>
            )}

          </div>
        </div>
      </motion.div>
    </motion.div>,
    portal
  );
}
