// @ts-nocheck
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- helpers ---
async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// --- supabase client (service role) ---
const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

serve(async (req) => {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing phone or OTP" }),
        { status: 400 }
      );
    }

    // 1) Normalize phone
    const normalizedPhone = phone.replace(/\D/g, "");

    // 2) Hash OTP
    const otpHash = await sha256(otp);

    // 3) Fetch latest valid OTP
    const { data, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", normalizedPhone)
      .eq("otp_hash", otpHash)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid or expired OTP" }),
        { status: 401 }
      );
    }

    // 4) Mark OTP as verified
    const { error: updateError } = await supabase
      .from("otp_codes")
      .update({ verified: true })
      .eq("id", data.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (error) {
    console.error("verify-otp error:", error);
    return new Response(
      JSON.stringify({ success: false }),
      { status: 500 }
    );
  }
});
