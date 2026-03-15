import { Amplify } from "aws-amplify";
import { post } from "aws-amplify/api";
import awsconfig from "./aws-exports";

Amplify.configure(awsconfig);

const API_NAME = "paropkarAI"; // matches aws-exports.js

// Calculate apply-by date via Lambda
export async function calculateDeadline({ certType, state, scholarshipDeadline }) {
  try {
    const res = await post({
      apiName: API_NAME,
      path: "/deadline/calculate",
      options: { body: { startDate: scholarshipDeadline, daysToAdd: 0, certType, state, scholarshipDeadline } },
    }).response;
    const data = await res.body.json();
    return localCalculate(certType, state, scholarshipDeadline); // use local until backend logic is tuned
  } catch (err) {
    console.error("calculateDeadline error:", err);
    return localCalculate(certType, state, scholarshipDeadline);
  }
}

// Save reminder to DynamoDB via Lambda
export async function saveReminder({ userId, certType, state, scholarshipDeadline, applyByDate }) {
  try {
    const res = await post({
      apiName: API_NAME,
      path: "/reminders",
      options: { body: { userId, title: `${certType} renewal`, deadline: applyByDate, notes: `State: ${state}, Scholarship deadline: ${scholarshipDeadline}` } },
    }).response;
    return await res.body.json();
  } catch (err) {
    console.error("saveReminder error:", err);
    const reminders = JSON.parse(localStorage.getItem("paropkar_reminders") || "[]");
    reminders.push({ certType, state, scholarshipDeadline, applyByDate, pending: true });
    localStorage.setItem("paropkar_reminders", JSON.stringify(reminders));
    return { success: true, offline: true };
  }
}

// Send photo to Textract via Lambda
export async function scanCertificate(base64Image) {
  try {
    const res = await post({
      apiName: API_NAME,
      path: "/scan",
      options: { body: { imageBase64: base64Image } },
    }).response;
    return await res.body.json();
  } catch (err) {
    console.error("scanCertificate error:", err);
    throw err;
  }
}

// Polly text-to-speech via Lambda
export async function speakText(text, language = "hi-IN") {
  try {
    const res = await post({
      apiName: API_NAME,
      path: "/speak",
      options: { body: { text, voiceId: language === "en-IN" ? "Aditi" : "Aditi", languageCode: language } },
    }).response;
    const data = await res.body.json();
    const audioBytes = Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0));
    const blob = new Blob([audioBytes], { type: "audio/mpeg" });
    const audio = new Audio(URL.createObjectURL(blob));
    audio.play();
    return audio;
  } catch (err) {
    console.error("speakText error:", err);
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      window.speechSynthesis.speak(utterance);
    }
  }
}

// Offline fallback deadline calculator
const PROCESSING_TIMES = {
  Karnataka:       { income_certificate: 15, caste_certificate: 10, domicile_certificate: 12 },
  "Uttar Pradesh": { income_certificate: 25, caste_certificate: 20, domicile_certificate: 22 },
  Maharashtra:     { income_certificate: 18, caste_certificate: 15, domicile_certificate: 16 },
  "Tamil Nadu":    { income_certificate: 14, caste_certificate: 12, domicile_certificate: 13 },
  Bihar:           { income_certificate: 28, caste_certificate: 22, domicile_certificate: 25 },
  Rajasthan:       { income_certificate: 20, caste_certificate: 17, domicile_certificate: 18 },
  "West Bengal":   { income_certificate: 20, caste_certificate: 16, domicile_certificate: 18 },
  Gujarat:         { income_certificate: 16, caste_certificate: 13, domicile_certificate: 14 },
};

function localCalculate(certType, state, scholarshipDeadline) {
  const procDays = (PROCESSING_TIMES[state] || {})[certType] || 20;
  const deadline = new Date(scholarshipDeadline);
  const applyBy = new Date(deadline);
  applyBy.setDate(applyBy.getDate() - procDays - 3);
  return {
    applyByDate: applyBy.toISOString().split("T")[0],
    processingDays: procDays,
    daysLeft: Math.ceil((applyBy - new Date()) / (1000 * 60 * 60 * 24)),
    offline: true,
  };
}

// Groq AI reasoning — generates renewal instructions and conversational responses
export async function askGroq(message, language = "hi-IN") {
  try {
    const res = await post({
      apiName: API_NAME,
      path: "/groq",
      options: { body: { message, language } },
    }).response;
    return await res.body.json();
  } catch (err) {
    console.error("askGroq error:", err);
    // Offline fallback
    return {
      text: "आपका certificate जल्द expire होने वाला है। Tahsildar office जाएं।",
      opts: ["Income Certificate", "Caste Certificate", "Domicile Certificate"]
    };
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function verifyAadhaar(token, aadhaarNumber, extractedText) {
  try {
    const res = await post({
      apiName: API_NAME,
      path: "/auth/verify-aadhaar",
      options: { body: { token, aadhaarNumber, extractedText } },
    }).response;
    return await res.body.json();
  } catch (err) {
    console.error("verifyAadhaar error:", err);
    throw err;
  }
}

export function getStoredAuth() {
  try {
    const token = localStorage.getItem("paropkar_token");
    const user = JSON.parse(localStorage.getItem("paropkar_user") || "null");
    return { token, user };
  } catch { return { token: null, user: null }; }
}

export function storeAuth(token, user) {
  localStorage.setItem("paropkar_token", token);
  localStorage.setItem("paropkar_user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("paropkar_token");
  localStorage.removeItem("paropkar_user");
}
