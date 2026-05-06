/**
 * resendService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Servicio para manejar envíos de correos masivos y transaccionales.
 * Usa la identidad verificada: contacto@morixoficial.com
 * ─────────────────────────────────────────────────────────────────────────────
 */

// 🔑 Nota: La API KEY ahora se maneja de forma segura en los secretos de Supabase
// No es necesario tenerla aquí.

import { supabase } from '../../lib/supabase';

export interface NewsletterPayload {
  subject: string;
  title: string;
  body: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
}

export const ResendService = {
  /**
   * Envía un boletín a una lista de correos delegando el envío a una Edge Function de Supabase.
   */
  async sendBulk(emails: string[], payload: NewsletterPayload) {
    console.log(`[ResendService] Delegando envío de ${emails.length} usuarios a Supabase...`);
    
    const { data, error } = await supabase.functions.invoke('send-newsletter', {
      body: { emails, payload }
    });

    if (error) {
      console.error('[ResendService] Error al invocar la función:', error);
      throw new Error(`Error en el servidor: ${error.message || 'No se pudo procesar el envío'}`);
    }

    if (!data?.success) {
      console.error('[ResendService] Error reportado por la función:', data?.error);
      throw new Error(data?.error || 'La función no devolvió un resultado exitoso');
    }

    return data;
  },

  /**
   * Genera el HTML Premium con los colores de Morix (Púrpuras/Azules).
   */
  generateHtml(p: NewsletterPayload) {
    const primaryColor = '#8b5cf6'; // Morado vibrante Morix
    const bgColor      = '#030213'; // Azul profundo Morix
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${bgColor}; color: #ffffff; margin: 0; padding: 0; }
            .wrapper { background-color: ${bgColor}; padding: 40px 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #0a0a1a; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
            .header { padding: 30px; text-align: center; }
            .hero { width: 100%; height: auto; display: block; }
            .content { padding: 40px; }
            h1 { font-size: 28px; margin: 0 0 20px 0; font-weight: 800; color: #ffffff; }
            p { font-size: 16px; line-height: 1.6; color: rgba(255,255,255,0.7); margin: 0 0 25px 0; }
            .button-container { text-align: left; }
            .button { 
              display: inline-block; padding: 16px 32px; background-color: ${primaryColor}; 
              color: #ffffff !important; text-decoration: none; border-radius: 16px; font-weight: bold;
              box-shadow: 0 10px 20px rgba(139,92,246,0.3);
            }
            .footer { padding: 30px; text-align: center; font-size: 12px; color: rgba(255,255,255,0.3); }
            .footer a { color: ${primaryColor}; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                 <img src="https://morixoficial.com/logo_email.png" alt="Morix" width="100" />
              </div>
              ${p.imageUrl ? `<img src="${p.imageUrl}" class="hero" />` : ''}
              <div class="content">
                <h1>${p.title}</h1>
                <p>${p.body.replace(/\n/g, '<br>')}</p>
                ${p.ctaUrl ? `
                  <div class="button-container">
                    <a href="${p.ctaUrl}" class="button">${p.ctaText || 'Explorar ahora'}</a>
                  </div>
                ` : ''}
              </div>
              <div class="footer">
                © 2026 Morix Oficial. Todos los derechos reservados.<br>
                Recibiste este correo porque estás suscrito a las novedades de Morix.<br><br>
                <a href="https://morixoficial.com/unsubscribe">Darse de baja</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }
};
