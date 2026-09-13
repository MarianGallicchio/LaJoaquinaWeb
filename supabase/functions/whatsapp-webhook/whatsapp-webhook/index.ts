Deno.serve(async (req)=>{
  const url=new URL(req.url)
  const VERIFY=Deno.env.get("WHATSAPP_VERIFY_TOKEN")||"lajoaquina_verify_2026"
  if(req.method==="GET"){
    if(url.searchParams.get("hub.mode")==="subscribe" && url.searchParams.get("hub.verify_token")===VERIFY)
      return new Response(url.searchParams.get("hub.challenge")||"",{status:200})
    return new Response("Forbidden",{status:403})
  }
  if(req.method==="POST"){
    try{ console.log(await req.text()) }catch{}
    return new Response(JSON.stringify({status:"ok"}),{status:200, headers:{"Content-Type":"application/json"}})
  }
  return new Response("Method not allowed",{status:405})
})
