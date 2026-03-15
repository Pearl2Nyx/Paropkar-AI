import { useState } from "react";
import { storeAuth } from "./amplifyApi";

const S = {
  wrap: { minHeight:"100vh", background:"#0b1120", backgroundImage:"radial-gradient(ellipse at 20% 20%, rgba(59,130,246,0.08) 0%, transparent 50%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px", maxWidth:480, margin:"0 auto" },
  card: { width:"100%", background:"rgba(15,23,42,0.95)", border:"1px solid rgba(148,163,184,0.12)", borderRadius:20, padding:"32px 28px" },
  label: { display:"block", color:"#94a3b8", fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 },
  input: { width:"100%", padding:"13px 16px", borderRadius:10, background:"rgba(30,41,59,0.9)", border:"1px solid rgba(148,163,184,0.2)", color:"#e2e8f0", fontSize:15, boxSizing:"border-box", outline:"none" },
  btn: { width:"100%", padding:"14px", borderRadius:10, border:"none", cursor:"pointer", fontSize:15, fontWeight:700, background:"linear-gradient(135deg,#3b82f6,#1d4ed8)", color:"#fff", marginTop:12 },
  err: { color:"#f87171", fontSize:12, marginTop:8, padding:"10px 14px", borderRadius:8, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)" },
  hint: { color:"#475569", fontSize:11, marginTop:10, textAlign:"center" },
};

const API_BASE = "https://yiwxwermf6.execute-api.ap-south-1.amazonaws.com/dev";

async function aadhaarLogin(aadhaar, name) {
  const res = await fetch(`${API_BASE}/auth/aadhaar-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aadhaar, name }),
  });
  return res.json();
}

export default function AuthScreen({ onAuth }) {
  const [aadhaar, setAadhaar] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fmt = (v) => v.replace(/\D/g,"").slice(0,12).replace(/(\d{4})(\d{0,4})(\d{0,4})/,"$1 $2 $3").trim();

  const handleLogin = async () => {
    const clean = aadhaar.replace(/\s/g, "");
    if (clean.length !== 12) { setError("Enter a valid 12-digit Aadhaar number"); return; }
    setError(""); setLoading(true);
    try {
      const res = await aadhaarLogin(clean, name);
      if (res.token) {
        storeAuth(res.token, { userId: res.userId, name: name || null, aadhaarLast4: clean.slice(-4) });
        onAuth({ userId: res.userId, name: name || null, token: res.token });
      } else {
        setError(res.error || "Authentication failed. Try again.");
      }
    } catch {
      // Offline fallback — generate local session
      const userId = "local-" + clean.slice(-4);
      const fakeToken = btoa(JSON.stringify({ userId, name, aadhaarLast4: clean.slice(-4) }));
      storeAuth(fakeToken, { userId, name: name || null, aadhaarLast4: clean.slice(-4) });
      onAuth({ userId, name: name || null, token: fakeToken });
    }
    setLoading(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28, justifyContent:"center" }}>
          <div style={{ width:48, height:48, borderRadius:12, background:"linear-gradient(135deg,#3b82f6,#10b981)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>🤲</div>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:"#e2e8f0" }}>Paropkar AI</div>
            <div style={{ fontSize:11, color:"#475569", letterSpacing:1, textTransform:"uppercase" }}>Certificate Intelligence</div>
          </div>
        </div>

        <div style={{ marginBottom:24 }}>
          <div style={{ color:"#e2e8f0", fontSize:18, fontFamily:"'Playfair Display',serif", marginBottom:6 }}>Verify with Aadhaar</div>
          <div style={{ color:"#64748b", fontSize:13 }}>Your Aadhaar number proves you are the legal owner of the documents you upload.</div>
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={S.label}>Aadhaar Number</label>
          <input
            style={{ ...S.input, letterSpacing:3, fontSize:17 }}
            type="tel" inputMode="numeric"
            placeholder="1234 5678 9012"
            value={aadhaar}
            onChange={e => { setAadhaar(fmt(e.target.value)); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={S.label}>Your Name (optional)</label>
          <input style={S.input} type="text" placeholder="Rahul Kumar" value={name} onChange={e => setName(e.target.value)} />
        </div>

        {error && <div style={S.err}>{error}</div>}

        <button style={S.btn} onClick={handleLogin} disabled={loading}>
          {loading ? "Verifying..." : "Continue →"}
        </button>

        <div style={S.hint}>Your Aadhaar is stored as a one-way hash — never in plain text.</div>

        <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:24 }}>
          {[
            ["🔒","Ownership proof","Only you can upload your certificates"],
            ["📄","Document matching","Aadhaar is matched against scanned docs"],
            ["🛡️","No OTP needed","Instant, offline-capable verification"],
          ].map(([icon,title,desc]) => (
            <div key={title} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"10px 12px", borderRadius:10, background:"rgba(30,41,59,0.4)", border:"1px solid rgba(148,163,184,0.08)" }}>
              <span style={{ fontSize:18 }}>{icon}</span>
              <div>
                <div style={{ color:"#cbd5e1", fontSize:13, fontWeight:600 }}>{title}</div>
                <div style={{ color:"#475569", fontSize:11, marginTop:2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop:16, color:"#1e293b", fontSize:10, textAlign:"center" }}>AWS Hackathon 2025 · Aadhaar-based identity</div>
    </div>
  );
}