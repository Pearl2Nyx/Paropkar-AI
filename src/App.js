import { useState, useRef, useEffect } from "react";
import { calculateDeadline, saveReminder, scanCertificate, speakText, askGroq, getStoredAuth, clearAuth, verifyAadhaar } from "./amplifyApi";
import AuthScreen from "./AuthScreen";

const LANG_CODES={"हिंदी":"hi-IN","English":"en-IN","ಕನ್ನಡ":"kn-IN","தமிழ்":"ta-IN","తెలుగు":"te-IN","বাংলা":"bn-IN","मराठी":"mr-IN","ગુજરાતી":"gu-IN"};
const COLORS={idle:"#6b7280",listening:"#3b82f6",processing:"#10b981",speaking:"#f97316"};
const CERT_VALIDITY={income_certificate:{label:"Income Certificate",validity_days:365,icon:"📄"},caste_certificate:{label:"Caste Certificate",validity_days:1095,icon:"🏷️"},domicile_certificate:{label:"Domicile Certificate",validity_days:730,icon:"🏠"},aadhaar:{label:"Aadhaar Card",validity_days:null,icon:"🪪"},ration_card:{label:"Ration Card",validity_days:1825,icon:"🧾"}};
const STATES=["Karnataka","Uttar Pradesh","Maharashtra","Tamil Nadu","Bihar","Rajasthan","West Bengal","Gujarat"];
const SCHOLARSHIPS=[{name:"NSP Scholarship",deadline:"2025-01-15",cert:"income_certificate"},{name:"KCET Application",deadline:"2025-02-18",cert:"income_certificate"},{name:"NEET Reservation",deadline:"2025-03-10",cert:"caste_certificate"},{name:"State Merit Scholarship",deadline:"2025-04-05",cert:"domicile_certificate"}];
const LANGUAGES=["हिंदी","English","ಕನ್ನಡ","தமிழ்","తెలుగు","বাংলা","मराठी","ગુજరాతી"];
const TABS=[{id:"tracker",label:"Tracker",icon:"🗓️"},{id:"scanner",label:"Scanner",icon:"📸"},{id:"voice",label:"Voice",icon:"🎙️"},{id:"dashboard",label:"Dashboard",icon:"📋"}];
const PT={Karnataka:{income_certificate:15,caste_certificate:10,domicile_certificate:12},"Uttar Pradesh":{income_certificate:25,caste_certificate:20,domicile_certificate:22},Maharashtra:{income_certificate:18,caste_certificate:15,domicile_certificate:16},"Tamil Nadu":{income_certificate:14,caste_certificate:12,domicile_certificate:13},Bihar:{income_certificate:28,caste_certificate:22,domicile_certificate:25},Rajasthan:{income_certificate:20,caste_certificate:17,domicile_certificate:18},"West Bengal":{income_certificate:20,caste_certificate:16,domicile_certificate:18},Gujarat:{income_certificate:16,caste_certificate:13,domicile_certificate:14}};

function localCalc(c,s,d){const p=(PT[s]||{})[c]||20,a=new Date(d);a.setDate(a.getDate()-p-3);return{applyByDate:a.toISOString().split("T")[0],processingDays:p,daysLeft:Math.ceil((a-new Date())/864e5),offline:true};}
function Btn({children,onClick,variant="primary",fullWidth,style={}}){const v={primary:{background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",color:"#fff"},ghost:{background:"rgba(59,130,246,0.12)",border:"1px solid rgba(59,130,246,0.3)",color:"#60a5fa"}};return <button onClick={onClick} style={{padding:"13px 20px",borderRadius:10,border:"none",cursor:"pointer",fontSize:14,fontWeight:700,width:fullWidth?"100%":"auto",...v[variant],...style}}>{children}</button>;}
function StatusBadge({status}){const m={valid:{bg:"rgba(16,185,129,0.1)",border:"rgba(16,185,129,0.3)",color:"#10b981",label:"Valid"},expiring:{bg:"rgba(249,115,22,0.1)",border:"rgba(249,115,22,0.3)",color:"#f97316",label:"Expiring Soon"},expired:{bg:"rgba(239,68,68,0.1)",border:"rgba(239,68,68,0.3)",color:"#ef4444",label:"Expired"}};const s=m[status];return <span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:s.bg,border:`1px solid ${s.border}`,color:s.color}}>{s.label}</span>;}

function TrackerTab(){
  const [certType,setCertType]=useState("income_certificate");
  const [state,setState]=useState("Karnataka");
  const [deadline,setDeadline]=useState("2025-01-15");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [reminders,setReminders]=useState([]);
  const calc=async()=>{setLoading(true);try{const d=await calculateDeadline({certType,state,scholarshipDeadline:deadline});setResult({...d,certType,state,deadline});}catch{setResult({...localCalc(certType,state,deadline),certType,state,deadline});}setLoading(false);};
  const remind=async()=>{if(!result)return;await saveReminder({userId:"demo-user",certType:result.certType,state:result.state,scholarshipDeadline:result.deadline,applyByDate:result.applyByDate});setReminders(r=>[...r,result]);alert("Reminder saved!");};
  return(<div>
    <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,marginBottom:6}}>Deadline Calculator</h2>
    <p style={{color:"#64748b",fontSize:13,marginBottom:24}}>Enter your scholarship deadline.</p>
    <div style={{marginBottom:16}}><label style={{display:"block",color:"#94a3b8",fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Certificate Type</label><select value={certType} onChange={e=>setCertType(e.target.value)} style={{width:"100%",padding:"12px 16px",borderRadius:10,background:"rgba(30,41,59,0.9)",border:"1px solid rgba(148,163,184,0.2)",color:"#e2e8f0",fontSize:14,appearance:"none"}}>{Object.entries(CERT_VALIDITY).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div>
    <div style={{marginBottom:16}}><label style={{display:"block",color:"#94a3b8",fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Your State</label><select value={state} onChange={e=>setState(e.target.value)} style={{width:"100%",padding:"12px 16px",borderRadius:10,background:"rgba(30,41,59,0.9)",border:"1px solid rgba(148,163,184,0.2)",color:"#e2e8f0",fontSize:14,appearance:"none"}}>{STATES.map(s=><option key={s}>{s}</option>)}</select></div>
    <div style={{marginBottom:16}}><label style={{display:"block",color:"#94a3b8",fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Scholarship Deadline</label><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} style={{width:"100%",padding:"12px 16px",borderRadius:10,background:"rgba(30,41,59,0.9)",border:"1px solid rgba(148,163,184,0.2)",color:"#e2e8f0",fontSize:14,boxSizing:"border-box"}}/></div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>{SCHOLARSHIPS.map(s=><button key={s.name} onClick={()=>{setDeadline(s.deadline);setCertType(s.cert);}} style={{padding:"5px 12px",borderRadius:20,fontSize:11,background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",color:"#93c5fd",cursor:"pointer"}}>{s.name}</button>)}</div>
    <Btn onClick={calc} fullWidth>{loading?"Calculating...":"Calculate Apply-By Date"}</Btn>
    {result&&<div style={{marginTop:20,background:"rgba(16,185,129,0.07)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:14,padding:20}}>
      <div style={{fontSize:13,color:"#64748b",marginBottom:6}}>{CERT_VALIDITY[result.certType]?.icon} {CERT_VALIDITY[result.certType]?.label} - {result.state}</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:result.daysLeft<0?"#ef4444":result.daysLeft<=7?"#f97316":"#10b981",marginBottom:4}}>Apply by {result.applyByDate?new Date(result.applyByDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"N/A"}</div>
      <div style={{color:"#64748b",fontSize:13,marginBottom:16}}>Processing: {result.processingDays} days {result.daysLeft>0?`· ${result.daysLeft} days left`:`· ${Math.abs(result.daysLeft)} days overdue`}{result.offline&&" (offline)"}</div>
      <Btn onClick={remind} variant="ghost">Set Reminder</Btn>
    </div>}
    {reminders.length>0&&<div style={{marginTop:20}}>{reminders.map((r,i)=><div key={i} style={{padding:"12px 16px",borderRadius:10,background:"rgba(30,41,59,0.5)",border:"1px solid rgba(148,163,184,0.1)",marginBottom:8,fontSize:13,color:"#cbd5e1"}}>{CERT_VALIDITY[r.certType]?.icon} {CERT_VALIDITY[r.certType]?.label} - apply by <strong style={{color:"#10b981"}}>{new Date(r.applyByDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</strong></div>)}</div>}
  </div>);
}