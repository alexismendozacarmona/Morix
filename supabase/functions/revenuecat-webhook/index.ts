import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Creamos el cliente de Supabase con la Service Role Key para poder saltarnos el RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    const { event } = await req.json()
    console.log('Recibido evento de RevenueCat:', event.type)

    const userId = event.app_user_id
    const eventType = event.type

    // Tipos de eventos que significan que el usuario es Premium
    const premiumEvents = [
      'INITIAL_PURCHASE',
      'RENEWAL',
      'UNCANCELLATION',
      'NON_RENEWING_PURCHASE'
    ]

    // Tipos de eventos que significan que perdió el Premium
    const expirationEvents = [
      'EXPIRATION',
      'CANCELLATION'
    ]

    let newPlan = null

    if (premiumEvents.includes(eventType)) {
      newPlan = 'premium'
    } else if (expirationEvents.includes(eventType)) {
      newPlan = 'free'
    }

    if (newPlan) {
      console.log(`Actualizando usuario ${userId} a plan: ${newPlan}`)
      
      const { error } = await supabase
        .from('morix_users')
        .update({ plan: newPlan })
        .eq('id', userId)

      if (error) {
        console.error('Error actualizando Supabase:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      }
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { "Content-Type": "application/json" } 
    })

  } catch (error) {
    console.error('Error procesando webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
