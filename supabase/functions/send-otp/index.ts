// @ts-nocheck
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- helpers ---
function toFormData(data) {
  return Object.keys(data)
    .map(
      (key) =>
        encodeURIComponent(key) +
        "=" +
        encodeURIComponent(data[key])
    )
    .join("&");
}

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
    const { phone } = await req.json();

    console.log("send-otp called");
    console.log("Phone:", phone);

    // 1) Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("Generated OTP:", otp);

    // 2) Normalize phone
    const normalizedPhone = phone.replace(/\D/g, "");
    console.log("Normalized phone:", normalizedPhone);

    // 3) Hash OTP
    const otpHash = await sha256(otp);

    // 4) Expiry = now + 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 5) Save OTP record
    const { error } = await supabase.from("otp_codes").insert({
      phone: normalizedPhone,
      otp_hash: otpHash,
      expires_at: expiresAt,
      verified: false,
    });

    if (error) {
      console.error("OTP save error:", error);
      throw error;
    }

    // 6) Send SMS via Africa’s Talking (Sandbox)
    const body = toFormData({
      username: "sandbox",
      to: normalizedPhone,
      message: `Travex OTP: ${otp}`,
    });

    const atResponse = await fetch(
      "https://api.sandbox.africastalking.com/version1/messaging",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "apikey": Deno.env.get("AFRICASTALKING_API_KEY"),
        },
        body,
      }
    );

    const atText = await atResponse.text();
    console.log("Africa's Talking response:", atText);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("send-otp error:", error);
    return new Response(
      JSON.stringify({ success: false }),
      { status: 500 }
    );
  }
});
