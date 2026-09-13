import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Devuelve el estado REAL del pedido (lo escribe mercadopago-webhook).
// Existe porque RLS no permite lectura anónima de `orders`: el frontend
// NUNCA debe confiar en la URL (?pago=exito es falsificable) ni en lo que
// diga el cliente. Solo este estado vale para dar por pagado un pedido.
Deno.serve(async (req)=>{
  if(req.method==="OPTIONS") return new Response(null,{status:204, headers:corsHeaders});
  const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase=createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let orderId="";
  try{
    const url=new URL(req.url);
    orderId=url.searchParams.get("order_id") || url.searchParams.get("pedido") || "";
    if(!orderId && req.method==="POST"){
      const body=await req.json().catch(()=>({}));
      orderId=body.order_id || body.orderId || body.pedido || "";
    }
  }catch{}

  if(!orderId) return new Response(JSON.stringify({ok:false, error:"order_id requerido"}),{status:400, headers:{...corsHeaders, "Content-Type":"application/json"}});

  const {data:rows, error}=await supabase.from("orders").select("data").eq("order_id", orderId).limit(1);
  if(error) return new Response(JSON.stringify({ok:false, error:error.message}),{status:500, headers:{...corsHeaders, "Content-Type":"application/json"}});
  const order=rows && rows[0] ? (rows[0] as any).data : null;
  if(!order) return new Response(JSON.stringify({ok:false, error:"Pedido no encontrado"}),{status:404, headers:{...corsHeaders, "Content-Type":"application/json"}});

  return new Response(JSON.stringify({
    ok:true,
    orderId,
    status: order.status || "pago_pendiente",
    total: order.total || 0,
    paymentMethod: order.paymentMethod || "",
    updatedAt: order.updatedAt || order.createdAt || null,
  }),{status:200, headers:{...corsHeaders, "Content-Type":"application/json"}});
})
