Deno.serve(async (req)=>{
  if(req.method!=="POST") return new Response(JSON.stringify({error:"Use POST"}),{status:405, headers:{"Content-Type":"application/json"}})
  const WHATSAPP_TOKEN=Deno.env.get("WHATSAPP_TOKEN")
  const WHATSAPP_PHONE_ID=Deno.env.get("WHATSAPP_PHONE_ID")
  if(!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) return new Response(JSON.stringify({error:"Missing WHATSAPP_TOKEN/PHONE_ID secrets"}),{status:500, headers:{"Content-Type":"application/json"}})
  let body:any={}
  try{ body=await req.json() }catch{ return new Response(JSON.stringify({error:"Invalid JSON"}),{status:400, headers:{"Content-Type":"application/json"}}) }

  // Soporta 2 formatos: Database Webhook {type, table, record, old_record} y POST directo {order}
  let order:any=null
  if(body.record && body.record.data) order=body.record.data
  else if(body.record && body.record.order_id) order=body.record.data || body.record
  else if(body.order) order=body.order
  else if(body.data) order=body.data
  else if(body.order_id) order=body
  else order=body

  // Si es webhook de UPDATE sin cambio de status, ignorar
  if(body.type==="UPDATE" && body.old_record && body.record){
    const oldStatus = body.old_record.data?.status || body.old_record.status
    const newStatus = body.record.data?.status || body.record.status
    if(oldStatus===newStatus) return new Response(JSON.stringify({skipped:"status not changed"}),{status:200, headers:{"Content-Type":"application/json"}})
  }

  const toRaw = String(order.customerPhone || order.customer_phone || order.phone || "")
  let digits = toRaw.replace(/\D/g,"").replace(/^0+/,"")
  if(digits.length<10) return new Response(JSON.stringify({skipped:"no phone", toRaw}),{status:200, headers:{"Content-Type":"application/json"}})
  // Normalización AR: 1126730077 -> 5491126730077, 541126730077 -> 5491126730077
  if(digits.length===10 && digits.startsWith("11")) digits="549"+digits
  else if(digits.startsWith("54") && !digits.startsWith("549") && digits.length===12) digits="549"+digits.slice(2)
  else if(!digits.startsWith("54")) digits="54"+digits
  const to = digits

  const storeName="La Joaquina Pet Shop"
  const total = Number(order.total||0).toLocaleString("es-AR")
  const orderId = order.orderId||order.order_id||""
  const base=`¡Hola ${order.customerName||"cliente"}! Te escribimos de ${storeName} por tu pedido ${orderId} ($${total}).`
  let statusMsg=""
  switch(order.status){
    case "confirmado": statusMsg=`Ya lo confirmamos y lo estamos preparando.`; break
    case "pagado": statusMsg=`Recibimos tu pago. Ya lo estamos preparando.`; break
    case "preparando": statusMsg=`Ya está en preparación. Te avisamos cuando salga para entrega.`; break
    case "enviado": statusMsg=`¡Ya está en camino!${order.trackingCode?` Seguilo con el código ${order.trackingCode}.`:""}`; break
    case "entregado": statusMsg=`Figura como entregado. ¿Llegó todo bien? ¡Gracias por tu compra!`; break
    default: statusMsg=`Novedades sobre tu pedido.`; break
  }
  const msg=`${base} ${statusMsg}`

  // Intento 1: plantilla aprobada (entrega fuera de 24h)
  const templateName="pedido_lajoaquina_actualizacion"
  try{
    const resTmpl=await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`,{
      method:"POST",
      headers:{Authorization:`Bearer ${WHATSAPP_TOKEN}`,"Content-Type":"application/json"},
      body:JSON.stringify({messaging_product:"whatsapp", to, type:"template", template:{name:templateName, language:{code:"es_AR"}, components:[
        {type:"header", parameters:[{type:"text", text: orderId}]},
        {type:"body", parameters:[
          {type:"text", text: orderId},
          {type:"text", text: order.customerName||"cliente"},
          {type:"text", text: String(total)},
          {type:"text", text: statusMsg},
          {type:"text", text: order.trackingCode||"Sin seguimiento"}
        ]}
      ]}})
    })
    const jTmpl=await resTmpl.json().catch(()=>({}))
    if(resTmpl.ok) return new Response(JSON.stringify({ok:true, to, via:"template", wa_id:jTmpl.contacts?.[0]?.wa_id}),{status:200, headers:{"Content-Type":"application/json"}})
    // Si plantilla no aprobada, cae a texto libre
    console.log("template failed", JSON.stringify(jTmpl).slice(0,800))
  }catch(e){ console.log("template error", String(e)) }

  try{
    const res=await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`,{
      method:"POST",
      headers:{Authorization:`Bearer ${WHATSAPP_TOKEN}`,"Content-Type":"application/json"},
      body:JSON.stringify({messaging_product:"whatsapp", to, type:"text", text:{preview_url:false, body:msg}})
    })
    const j=await res.json().catch(()=>({}))
    if(!res.ok) return new Response(JSON.stringify({error:j, status:res.status}),{status:500, headers:{"Content-Type":"application/json"}})
    return new Response(JSON.stringify({ok:true, to, wa_id:j.contacts?.[0]?.wa_id}),{status:200, headers:{"Content-Type":"application/json"}})
  }catch(e:any){
    return new Response(JSON.stringify({error:String(e?.message||e)}),{status:500, headers:{"Content-Type":"application/json"}})
  }
})
