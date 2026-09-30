import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {

  console.log("notify-pass invoked");
  const { passId } = await req.json();
  console.log("passId:", passId);

  console.log("url ok:", !!SUPABASE_URL, "key ok:", !!SUPABASE_SERVICE_KEY);
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log("db created");

  const { data: pass, error: passError } = await db
    .from("passes")
    .select("status, denied_reason, player_id, group_id, court_id")
    .eq("id", passId)
    .single();
  console.log("pass:", pass, "error:", passError);

  if (!pass) {
    return new Response(JSON.stringify({ error: "Pass not found" }), { status: 404 });
  }

  const { data: userData, error: userError } = await db.auth.admin.getUserById(pass.player_id);
  console.log("userData:", userData, "userError:", userError);
  if (userError || !userData?.user) {
    console.error("getUserById failed:", userError);
    return new Response(JSON.stringify({ error: "User not found" }), { status: 500, headers: corsHeaders });
  }
  const user = userData.user;

  const { data: profile } = await db.from("profiles").select("name").eq("id", pass.player_id).single();

  let courtNames = "";
  if (pass.group_id) {
    const { data: courts } = await db.from("courts").select("name").eq("group_id", pass.group_id).eq("active", true);
    courtNames = courts?.map((c: { name: string }) => c.name).join(", ") || "";
  } else if (pass.court_id) {
    const { data: court } = await db.from("courts").select("name").eq("id", pass.court_id).single();
    courtNames = court?.name || "";
  }

  const name = profile?.name || "Jogador";
  const isApproved = pass.status === "approved";

  const subject = isApproved
    ? `Passe aprovado — ${courtNames}`
    : `Passe recusado — ${courtNames}`;

  const text = isApproved
    ? `Olá, ${name}!\n\nO teu passe para ${courtNames} foi aprovado. Já podes reservar o campo.\n\nCampo Livre`
    : `Olá, ${name}!\n\nO teu passe para ${courtNames} foi recusado.${pass.denied_reason ? `\n\nMotivo: ${pass.denied_reason}` : ""}\n\nPodes solicitar novamente na página do campo.\n\nCampo Livre`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Campo Livre <onboarding@resend.dev>",
      to: user!.email,
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });

  } catch (e) {
    console.error("Unhandled exception:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
