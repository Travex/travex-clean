import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * CORS headers
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Main handler
 */
serve(async (req: Request) => {
  /* ---------------------------------- */
  /* CORS preflight                     */
  /* ---------------------------------- */
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  /* ---------------------------------- */
  /* Method guard                       */
  /* ---------------------------------- */
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        message: "POST only",
      }),
      { status: 405, headers: corsHeaders }
    );
  }

  /* ---------------------------------- */
  /* Parse request body                 */
  /* ---------------------------------- */
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Invalid JSON body",
      }),
      { status: 400, headers: corsHeaders }
    );
  }

  const { txRef, expectedAmount, expectedCurrency } = body;

  if (!txRef || typeof txRef !== "string") {
    return new Response(
      JSON.stringify({
        success: false,
        message: "txRef is required",
      }),
      { status: 400, headers: corsHeaders }
    );
  }

  /* ---------------------------------- */
  /* Load Flutterwave secrets           */
  /* ---------------------------------- */
  const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY");
  const FLW_ENV = Deno.env.get("FLW_ENV");

  if (!FLW_SECRET_KEY || !FLW_ENV) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Flutterwave environment not configured",
      }),
      { status: 500, headers: corsHeaders }
    );
  }

  /* ---------------------------------- */
  /* Prepare Flutterwave request        */
  /* ---------------------------------- */
  const flutterwaveBaseUrl = "https://api.flutterwave.com/v3";

  const verifyEndpoint = `${flutterwaveBaseUrl}/transactions/verify_by_reference?tx_ref=${txRef}`;

  const flutterwaveHeaders = {
    Authorization: `Bearer ${FLW_SECRET_KEY}`,
    "Content-Type": "application/json",
  };

  /* ---------------------------------- */
  /* Call Flutterwave                   */
  /* ---------------------------------- */
  let flutterwaveResponse;
  try {
    flutterwaveResponse = await fetch(verifyEndpoint, {
      method: "GET",
      headers: flutterwaveHeaders,
    });
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to reach Flutterwave",
      }),
      { status: 502, headers: corsHeaders }
    );
  }

  const flutterwaveData = await flutterwaveResponse.json();

  /* ---------------------------------- */
  /* Validate Flutterwave response      */
  /* ---------------------------------- */
  if (flutterwaveData.status !== "success") {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Flutterwave verification failed",
        flutterwaveStatus: flutterwaveData.status,
      }),
      { status: 400, headers: corsHeaders }
    );
  }

  const transaction = flutterwaveData.data;

  if (!transaction || transaction.status !== "successful") {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Transaction not successful",
      }),
      { status: 400, headers: corsHeaders }
    );
  }

  /* ---------------------------------- */
  /* Optional: amount & currency check  */
  /* ---------------------------------- */
  if (
    expectedAmount !== undefined &&
    Number(transaction.amount) !== Number(expectedAmount)
  ) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Amount mismatch",
      }),
      { status: 400, headers: corsHeaders }
    );
  }

  if (
    expectedCurrency !== undefined &&
    transaction.currency !== expectedCurrency
  ) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Currency mismatch",
      }),
      { status: 400, headers: corsHeaders }
    );
  }

  /* ---------------------------------- */
  /* VERIFIED — SAFE RESPONSE            */
  /* ---------------------------------- */

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Insert verified ticket
 */
const { error: insertError } = await supabase
  .from("verified_tickets")
  .insert({
    tx_ref: transaction.tx_ref,
    transaction_id: transaction.id,
    amount: transaction.amount,
    currency: transaction.currency,
    status: "valid",
  });

if (insertError) {
  return new Response(
    JSON.stringify({
      success: false,
      message: "Payment verified but ticket insert failed",
      error: insertError.message,
    }),
    { status: 500, headers: corsHeaders }
  );
}

/**
 * Final success response
 */
return new Response(
  JSON.stringify({
    success: true,
    message: "Payment verified and ticket created",
    txRef: transaction.tx_ref,
  }),
  { status: 200, headers: corsHeaders }
);
});
