import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, GET, OPTIONS",
};

Deno.serve(async (req)=>{
  if(req.method==="OPTIONS") return new Response(null,{status:204, headers:corsHeaders});
  const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const MP_TOKEN=Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  const supabase=createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verificación GET para Mercado Pago
  if(req.method==="GET") return new Response(JSON.stringify({status:"ok", webhook:"mercadopago"}),{status:200, headers:{...corsHeaders, "Content-Type":"application/json"}});

  let body:any={};
  let query:any={};
  try{ query=Object.fromEntries(new URL(req.url).searchParams.entries()) }catch{}
  try{ body=await req.json().catch(()=>({})) }catch{}
  const data={...query, ...body};
  const topic=data.topic || data.type;
  const id=data.data?.id || data.id;

  // Solo procesar pagos
  if(topic!=="payment" && data.type!=="payment") {
    return new Response(JSON.stringify({ok:true, ignored:true}),{status:200, headers:{...corsHeaders, "Content-Type":"application/json"}});
  }
  if(!id || !MP_TOKEN) return new Response(JSON.stringify({ok:false}),{status:200, headers:{...corsHeaders, "Content-Type":"application/json"}});

  try{
    const mpRes=await fetch(`https://api.mercadopago.com/v1/payments/${id}`,{headers:{Authorization:`Bearer ${MP_TOKEN}`}});
    const payment=await mpRes.json();
    if(!mpRes.ok) return new Response(JSON.stringify({ok:false, mpError:payment}),{status:200, headers:{...corsHeaders, "Content-Type":"application/json"}});
    const orderId=payment.external_reference;
    const status=payment.status;
    if(!orderId) return new Response(JSON.stringify({ok:true}),{status:200, headers:{...corsHeaders, "Content-Type":"application/json"}});

    // Mapear estado MP a nuestro status
    let newStatus:string|null=null;
    if(status==="approved") newStatus="pagado";
    else if(status==="pending" || status==="in_process") newStatus="pago_pendiente";
    else if(status==="rejected" || status==="cancelled") newStatus="cancelado";

    if(newStatus){
      const {data:rows}=await supabase.from("orders").select("data").eq("order_id", orderId).limit(1);
      const current=rows && rows[0] ? (rows[0] as any).data : null;
      if(current){
        const updated={...current, status:newStatus, history:[...(current.history||[]), {at:new Date().toISOString(), from:current.status, to:newStatus, via:"mercadopago_webhook", paymentId:id}]};
        await supabase.from("orders").update({data: updated}).eq("order_id", orderId);
      }
    }
    return new Response(JSON.stringify({ok:true, orderId, mpStatus:status}),{status:200, headers:{...corsHeaders, "Content-Type":"application/json"}});
  }catch(e:any){
    return new Response(JSON.stringify({ok:false, error:String(e?.message||e)}),{status:200, headers:{...corsHeaders, "Content-Type":"application/json"}});
  }
})
