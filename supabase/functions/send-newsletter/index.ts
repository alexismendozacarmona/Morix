
// Supabase Edge Function: send-newsletter
// ─────────────────────────────────────────────────────────────────────────────
// Esta función recibe un payload con los emails y el contenido del boletín
// y realiza el envío masivo usando la API de Resend.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejar preflight (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { emails, payload } = await req.json();

    if (!emails || !Array.isArray(emails)) {
      throw new Error('Lista de emails no válida');
    }

    if (!RESEND_API_KEY) {
      throw new Error('Falta la RESEND_API_KEY en los secretos de Supabase');
    }

    console.log(`Enviando boletín a ${emails.length} destinatarios...`);

    // Resend permite hasta 50 destinatarios por email en el campo 'to' si es un array
    // pero para boletines masivos a veces es mejor enviarlos individualmente o en batches controlados.
    // Aquí usaremos la API de Resend para enviar el batch.
    
    // Usaremos la API de Batch de Resend para que cada email sea individual y privado
    const results = [];
    // Resend permite hasta 100 emails por llamada a la API de batch
    for (let i = 0; i < emails.length; i += 100) {
      const batch = emails.slice(i, i + 100);
      
      // Preparamos el array de objetos para el batch
      const emailBatch = batch.map(email => ({
        from: 'Morix <contacto@morixoficial.com>',
        to: email,
        subject: payload.subject,
        html: generateHtml(payload),
      }));
      
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(emailBatch),
      });

      const data = await res.json();
      results.push(data);
      
      if (!res.ok) {
        throw new Error(`Error de Resend en batch ${i}: ${JSON.stringify(data)}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Envío completado', results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

// Función para generar el HTML (Espejo de la que teníamos en el front)
function generateHtml(p: any) {
  const primaryColor = '#8b5cf6';
  const bgColor      = '#030213';
  
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
              <a href="https://morixoficial.com/unsubscribe">Darse de baja</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
