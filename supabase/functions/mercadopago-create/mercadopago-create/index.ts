import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req)=>{
  if(req.method==="OPTIONS") return new Response(null,{status:204, headers:corsHeaders});
  if(req.method!=="POST") return new Response(JSON.stringify({error:"Use POST"}),{status:405, headers:{...corsHeaders, "Content-Type":"application/json"}});

  const MP_TOKEN=Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if(!MP_TOKEN) return new Response(JSON.stringify({error:"MERCADOPAGO_ACCESS_TOKEN no configurado en Supabase secrets"}),{status:500, headers:{...corsHeaders, "Content-Type":"application/json"}});

  let body:any={};
  try{ body=await req.json() }catch{ return new Response(JSON.stringify({error:"Invalid JSON"}),{status:400, headers:{...corsHeaders, "Content-Type":"application/json"}})}
  const orderInput=body.order || body;
  if(!orderInput || !orderInput.items) return new Response(JSON.stringify({error:"order.items requerido"}),{status:400, headers:{...corsHeaders, "Content-Type":"application/json"}});

  const supabase=createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const orderId=orderInput.orderId || `JQ-${Date.now().toString().slice(-6)}`;
  const order={...orderInput, orderId, status:"pago_pendiente", createdAt: orderInput.createdAt || new Date().toISOString()};

  // Guardar pedido en Supabase
  const {error:insErr}=await supabase.from("orders").insert({order_id:orderId, data:order});
  if(insErr && insErr.code!=="23505") return new Response(JSON.stringify({error:insErr.message}),{status:500, headers:{...corsHeaders, "Content-Type":"application/json"}});

  // Crear preferencia en Mercado Pago via fetch directo
  const baseUrl=req.headers.get("origin") || req.headers.get("referer")?.split("?")[0]?.split("#")[0]?.replace(/\/$/, "") || "https://lajoaquina.shop";
  const items=(order.items||[]).map((it:any,i:number)=>({
    id:`${orderId}-${i}`,
    title:`${it.product?.name||"Producto"} (${it.selectedVariant?.weight||""})`.slice(0,250),
    quantity:Number(it.quantity)||1,
    unit_price:Number(it.selectedVariant?.price)||0,
    currency_id:"ARS",
  }));
  if(order.discount>0) items.push({id:`${orderId}-desc`, title:"Descuentos aplicados", quantity:1, unit_price:-Math.round(Number(order.discount)), currency_id:"ARS"});
  if(order.shippingCost>0) items.push({id:`${orderId}-envio`, title:"Costo de envío", quantity:1, unit_price:Math.round(Number(order.shippingCost)), currency_id:"ARS"});

  try{
    const mpRes=await fetch("https://api.mercadopago.com/checkout/preferences",{
      method:"POST",
      headers:{Authorization:`Bearer ${MP_TOKEN}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        items,
        payer:{name:order.customerName, email:order.customerEmail||undefined, phone: order.customerPhone? {number:String(order.customerPhone)}:undefined},
        back_urls:{success:`${baseUrl}/?pago=exito&pedido=${orderId}`, failure:`${baseUrl}/?pago=fallo&pedido=${orderId}`, pending:`${baseUrl}/?pago=pendiente&pedido=${orderId}`},
        auto_return:"approved",
        notification_url:`https://wvxmzdtcyraxmwvbuwiy.supabase.co/functions/v1/mercadopago-webhook`,
        external_reference:orderId,
        statement_descriptor:"LA JOAQUINA PET SHOP",
      })
    });
    const mpData=await mpRes.json();
    if(!mpRes.ok) return new Response(JSON.stringify({error: mpData.message || "MP error", details: mpData}),{status:500, headers:{...corsHeaders, "Content-Type":"application/json"}});
    return new Response(JSON.stringify({order, initPoint: mpData.init_point, sandboxInitPoint: mpData.sandbox_init_point, preferenceId: mpData.id}),{status:200, headers:{...corsHeaders, "Content-Type":"application/json"}});
  }catch(e:any){
    return new Response(JSON.stringify({error:String(e?.message||e)}),{status:500, headers:{...corsHeaders, "Content-Type":"application/json"}});
  }
})
