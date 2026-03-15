/* Amplify Params - DO NOT EDIT
  ENV
  REGION
  JWT_SECRET
  AADHAAR_TABLE
Amplify Params - DO NOT EDIT */

const express = require("express");
const bodyParser = require("body-parser");
const awsServerlessExpressMiddleware = require("aws-serverless-express/middleware");
const AWS = require("aws-sdk");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const app = express();
app.use(bodyParser.json());
app.use(awsServerlessExpressMiddleware.eventContext());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const dynamo = new AWS.DynamoDB.DocumentClient({ region: process.env.REGION || "ap-south-1" });
const JWT_SECRET = process.env.JWT_SECRET || "paropkar-dev-secret";
const AADHAAR_TABLE = process.env.AADHAAR_TABLE || "paropkar-aadhaar";

function hashAadhaar(aadhaar) {
  return crypto.createHash("sha256").update(aadhaar + "paropkar-salt-2025").digest("hex");
}

/**
 * POST /auth/aadhaar-login
 * Body: { aadhaar: "123456789012", name: "Rahul" }
 * Hashes Aadhaar, stores/retrieves user, returns JWT
 */
app.post("/auth/aadhaar-login", async (req, res) => {
  const { aadhaar, name } = req.body;
  if (!aadhaar || aadhaar.replace(/\s/g,"").length !== 12) {
    return res.status(400).json({ error: "Valid 12-digit Aadhaar required" });
  }

  const clean = aadhaar.replace(/\s/g, "");
  const hash = hashAadhaar(clean);
  const userId = hash.slice(0, 16);
  const last4 = clean.slice(-4);
  const now = Math.floor(Date.now() / 1000);

  try {
    // Upsert user record
    await dynamo.put({
      TableName: AADHAAR_TABLE,
      Item: {
        aadhaarHash: hash,
        userId,
        last4,
        name: name || null,
        lastLogin: now,
        ttl: now + (365 * 24 * 3600),
      },
    }).promise();

    const token = jwt.sign({ userId, last4, name: name || null }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ success: true, token, userId, last4 });
  } catch (err) {
    console.error("aadhaar-login error:", err);
    // Fallback: still issue token even if DynamoDB fails (demo mode)
    const token = jwt.sign({ userId, last4, name: name || null }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ success: true, token, userId, last4, offline: true });
  }
});

/**
 * POST /auth/verify-aadhaar
 * Body: { token, aadhaarNumber, extractedText }
 * Checks if Aadhaar in scanned doc matches logged-in user
 */
app.post("/auth/verify-aadhaar", async (req, res) => {
  const { token, aadhaarNumber, extractedText } = req.body;
  if (!token || !aadhaarNumber) return res.status(400).json({ error: "token and aadhaarNumber required" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const clean = aadhaarNumber.replace(/\s/g, "");
    if (clean.length !== 12) return res.status(400).json({ error: "Invalid Aadhaar" });

    const hash = hashAadhaar(clean);
    const userId = hash.slice(0, 16);

    // Check if this Aadhaar matches the logged-in user
    const ownerMatch = userId === decoded.userId;

    // Check if Aadhaar appears in scanned doc text
    let docMatch = false;
    if (extractedText) {
      const t = extractedText.replace(/\s/g, "");
      docMatch = t.includes(clean) || t.includes(clean.slice(-4));
    }

    res.json({
      success: true,
      ownerMatch,
      docMatch,
      message: ownerMatch && docMatch
        ? "Document ownership verified — Aadhaar matches."
        : ownerMatch
        ? "Aadhaar registered. Upload document to verify ownership."
        : "Aadhaar does not match your account.",
    });
  } catch (err) {
    if (err.name === "JsonWebTokenError") return res.status(401).json({ error: "Invalid token" });
    res.status(500).json({ error: "Verification failed" });
  }
});

app.listen(3000, () => console.log("paropkarAuth started"));
module.exports = app;