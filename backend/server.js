/**
 * backend/server.js
 * Travex × CamPay (clean, stable version)
 */

const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const QRCode = require("qrcode");
const crypto = require("crypto");
const fetch = require("node-fetch");
const cors = require("cors");

// Load .env from project root (../.env)
require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

// --- ENV checks (do NOT print secrets) ---
console.log("SUPABASE_URL loaded =", !!process.env.SUPABASE_URL);
console.log("SERVICE_ROLE_KEY loaded =", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("CAMPAY_WEBHOOK_KEY loaded =", !!process.env.CAMPAY_WEBHOOK_KEY);

if (!process.env.SUPABASE_URL) throw new Error("Missing SUPABASE_URL in .env");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env");
if (!process.env.CAMPAY_WEBHOOK_KEY)
  throw new Error("Missing CAMPAY_WEBHOOK_KEY in .env");
if (!process.env.CAMPAY_WEBHOOK_URL)
  throw new Error("Missing CAMPAY_WEBHOOK_URL in .env");
if (!process.env.QR_SECRET)
  throw new Error("Missing QR_SECRET in .env");

// --- Supabase client (server-side) ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
console.log("✅ Supabase client created");

const app = express();

app.use(cors({
  origin: [
    "http://localhost:8081",
    "http://localhost:19006"
  ]
}));

app.use(express.json());

// --- QR generator helper ---
async function generateTicketQR(ticketId) {
  const iat = Math.floor(Date.now() / 1000);

  const payloadData = {
    v: 1,
    tid: ticketId,
    iat,
  };

  const dataString = `${payloadData.v}|${payloadData.tid}|${payloadData.iat}`;

  const signature = crypto
    .createHmac("sha256", process.env.QR_SECRET)
    .update(dataString)
    .digest("base64url");

  payloadData.sig = signature;

  const payload = JSON.stringify(payloadData);

  const qrSvg = await QRCode.toString(payload, {
    type: "svg",
  });

  return { payload, qrSvg };
}


// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Travex backend running" });
});

// Root route
app.get("/", (req, res) => {
  res.json({ ok: true, service: "Travex backend", status: "live" });
});

// Supabase ping (quick connectivity test)
app.get("/supabase/ping", async (req, res) => {
  const { data, error } = await supabase
    .from("campay_payments")
    .select("campay_reference")
    .limit(1);

  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true, sample: data });
});

// Create ticket (unpaid reservation)
app.post("/tickets", async (req, res) => {
  const { route_id, seats, expires_at } = req.body || {};

  if (!route_id || !seats) {
    return res.status(400).json({
      ok: false,
      error: "Missing route_id or seats",
    });
  }

  // If frontend did not send expires_at, default to 5 minutes from now
  const expiresAt =
    expires_at || new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      route_id,
      seats,
      status: "pending",
      expires_at: expiresAt,
      paid: false,
    })
    .select("*")
    .single();

  if (error) {
    console.log("❌ Ticket create error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.json({ ok: true, ticket: data });
});

// Get ticket by id (frontend fetch)
app.get("/tickets/:id", async (req, res) => {
  const ticketId = req.params.id;

  const { data, error } = await supabase
    .from("tickets")
    .select("id, route_id, seats, paid, qr_svg")
    .eq("id", ticketId)
    .single();

  if (error) {
    return res.status(404).json({ ok: false, error: "Ticket not found" });
  }

  return res.json({ ok: true, ticket: data });
});

// Preview QR as image in browser
app.get("/tickets/:id/qr", async (req, res) => {
  const ticketId = req.params.id;

  const { data, error } = await supabase
    .from("tickets")
    .select("qr_svg")
    .eq("id", ticketId)
    .single();

  if (error || !data?.qr_svg) {
    return res.status(404).send("QR not found");
  }

  res.setHeader("Content-Type", "image/svg+xml");
  return res.send(data.qr_svg);
});

// Start CamPay payment collection
app.post("/campay/collect", async (req, res) => {
  const { ticket_id, phone_number, operator, amount } = req.body || {};

  if (!ticket_id || !phone_number || !operator || !amount) {
    return res.status(400).json({
      ok: false,
      error: "Missing required fields",
    });
  }

  try {
    const campayRes = await fetch(
      `${process.env.CAMPAY_BASE_URL}/collect/`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.CAMPAY_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency: "XAF",
          from: phone_number,
          description: `Travex ticket ${ticket_id}`,
          external_reference: ticket_id,
          operator,
          webhook_url: process.env.CAMPAY_WEBHOOK_URL,
        }),
      }
    );

    const data = await campayRes.json();

    if (!campayRes.ok) {
      console.log("❌ CamPay error:", data);
      return res.status(500).json({
        ok: false,
        error: "CamPay request failed",
        details: data,
      });
    }

    console.log("✅ CamPay payment started:", data.reference);

    return res.json({
      ok: true,
      reference: data.reference,
    });
  } catch (err) {
    console.log("❌ CamPay network error:", err.message);
    return res.status(500).json({
      ok: false,
      error: "Network error contacting CamPay",
    });
  }
});

// ✅ CamPay webhook: verify signature → save payment → mark ticket paid
app.get("/campay/webhook", async (req, res) => {
  const q = req.query;
  console.log("🔔 CamPay webhook received:", q);

  // Required fields
  if (!q.signature) return res.status(400).send("Missing signature");
  if (!q.reference) return res.status(400).send("Missing reference");

  // 1) Verify signature
  try {
    jwt.verify(q.signature, process.env.CAMPAY_WEBHOOK_KEY);
  } catch (e) {
    console.log("❌ Invalid signature:", e.message);
    return res.status(401).send("Invalid signature");
  }

  // Normalize values
  const status = (q.status || "").toString();
  const ticketId = q.external_reference ? q.external_reference.toString() : null;

  // 2) Save webhook into Supabase (idempotent if campay_reference UNIQUE)
  const paymentRow = {
    campay_reference: q.reference.toString(),
    external_reference: ticketId,
    status: status || null,
    amount: q.amount ? Number(q.amount) : null,
    currency: q.currency ? q.currency.toString() : null,
    operator: q.operator ? q.operator.toString() : null,
    operator_reference: q.operator_reference
      ? q.operator_reference.toString()
      : null,
    phone_number: q.phone_number ? q.phone_number.toString() : null,
    raw: q, // keep everything for audit/debug
  };

  const { error: insertError } = await supabase
    .from("campay_payments")
    .insert(paymentRow);

  if (insertError) {
    // Postgres unique violation code is 23505 (duplicate webhook)
    if (insertError.code === "23505") {
      console.log("🟡 Duplicate webhook ignored. reference:", paymentRow.campay_reference);
      // IMPORTANT: even if duplicate, we still continue to ticket update below
      // because the first attempt might have failed after insert.
    } else {
      console.log("❌ Supabase insert error:", insertError.message);
      return res.status(500).send("Database error");
    }
  } else {
    console.log("✅ Payment saved:", paymentRow.campay_reference);
  }

  // 3) If successful, mark ticket as paid (UUID safe)
  if (status === "SUCCESSFUL") {
    if (!ticketId) {
      console.log("❌ Missing external_reference (ticket id), cannot mark paid");
      return res.status(200).send("OK (no ticket id)");
    }

    // Update and return updated rows so we can SEE if a row matched
  const { data: updatedRows, error: ticketError } = await supabase
  .from("tickets")
  .update({ paid: true })
  .eq("id", ticketId)
  .select("id, paid, qr_payload");

    console.log("Updated rows:", updatedRows);

    // Generate + store QR if not already generated
if (updatedRows && updatedRows.length > 0) {
  const ticket = updatedRows[0];

  if (!ticket.qr_payload) {
    const { payload, qrSvg } = await generateTicketQR(ticketId);

    const { error: qrError } = await supabase
      .from("tickets")
      .update({
        qr_payload: payload,
        qr_svg: qrSvg,
        qr_generated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (qrError) {
      console.log("❌ Failed to store QR:", qrError.message);
    } else {
      console.log("✅ QR generated + stored for ticket:", ticketId);
    }
  } else {
    console.log("🟡 QR already exists for ticket:", ticketId);
  }
}

    if (ticketError) {
      console.log("❌ Ticket update error:", ticketError.message);
      return res.status(500).send("Ticket update failed");
    }

    // If no rows returned, it means the ticket ID didn't match any row
    if (!updatedRows || updatedRows.length === 0) {
      console.log("❌ No ticket matched this id:", ticketId);
      return res.status(404).send("Ticket not found");
    }

    console.log(`✅ Ticket ${ticketId} marked as paid`);
  } else {
    console.log("Payment status is not SUCCESSFUL, ticket not updated:", status);
  }

  return res.status(200).send("OK");
});

app.get("/scan/check-in", (req, res) => {
  res.json({ ok: true, route: "scan check-in GET visible" });
});

app.post("/scan/check-in", async (req, res) => {
  try {
    const { ticket_id } = req.body || {};

    if (!ticket_id) {
      return res.status(400).json({
        ok: false,
        error: "Missing ticket_id",
      });
    }

    // 1. Get ticket
    const { data: ticket, error: fetchError } = await supabase
      .from("tickets")
      .select("id, paid")
      .eq("id", ticket_id)
      .single();

    if (fetchError || !ticket) {
      return res.status(404).json({
        ok: false,
        error: "Ticket not found",
      });
    }

    if (!ticket.paid) {
      return res.status(400).json({
        ok: false,
        error: "Ticket not paid",
      });
    }

    // 2. Check if already scanned
    const { data: existing, error: existingError } = await supabase
      .from("scanned_tickets")
      .select("ticket_id")
      .eq("ticket_id", ticket_id)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({
        ok: false,
        error: "Failed to check scanned ticket",
        details: existingError.message,
      });
    }

    if (existing) {
      return res.status(400).json({
        ok: false,
        error: "Ticket already used",
      });
    }

    // 3. Mark as used
    const { error: insertError } = await supabase
      .from("scanned_tickets")
      .insert({ ticket_id });

    if (insertError) {
      console.log("VERIFY INSERT ERROR:", insertError);
      return res.status(500).json({
        ok: false,
        error: "Failed to verify ticket",
        details: insertError.message,
      });
    }

    return res.json({
      ok: true,
      message: "Check-in valid",
      ticket_id,
    });
  } catch (err) {
    console.error("❌ Scan error:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
