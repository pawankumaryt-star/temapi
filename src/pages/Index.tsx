import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive, ArrowLeft, Check, ChevronRight, Copy, FileText, HelpCircle, Inbox,
  Loader2, Mail, Menu, Moon, Paperclip, Plus, QrCode, RefreshCw, Search,
  ShieldCheck, Sparkles, Sun, Trash2, X, Zap
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  DOMAINS, EmailMessage, TempEmail, clearEmailStorage, deleteEmail,
  fetchMessage, fetchMessages, generateCustomEmail, generateNaturalEmail,
  generateTempEmail, loadEmailFromStorage, saveEmailToStorage
} from "@/lib/tempmail-api";
import EmailViewer from "@/components/EmailViewer";
import { useTheme } from "@/hooks/use-theme";
import Preloader from "@/components/Preloader";

type Tab = "inbox" | "generate" | "domains" | "settings";
const navItems = [
  {to:"/", label:"Inbox", icon:Inbox},
  {to:"/features", label:"Features", icon:Sparkles},
  {to:"/how-it-works", label:"How it works", icon:Zap},
  {to:"/faq", label:"FAQ", icon:HelpCircle},
  {to:"/about", label:"About", icon:ShieldCheck},
];

function useSEO(title:string, description:string){
  useEffect(()=>{
    document.title=title;
    const set=(name:string,content:string)=>{
      let el=document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement|null;
      if(!el){el=document.createElement("meta");el.name=name;document.head.appendChild(el)}
      el.content=content;
    };
    set("description",description); set("robots","index, follow");
  },[title,description]);
}

function Logo(){
  return <Link to="/" className="flex items-center gap-3 shrink-0">
    <span className="brand-mark"><Mail size={19}/></span>
    <span className="font-display font-bold tracking-tight text-lg">PN <span className="text-gradient-primary">TEMP MAIL</span></span>
  </Link>
}

function SiteHeader({theme,onTheme}:{theme:string,onTheme:()=>void}){
  const [open,setOpen]=useState(false);
  return <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-2xl">
    <div className="max-w-6xl mx-auto h-16 px-4 flex items-center justify-between gap-3">
      <Logo/>
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map(n=><Link key={n.to} to={n.to} className="nav-link">{n.label}</Link>)}
      </nav>
      <div className="flex items-center gap-2">
        <button className="icon-btn" onClick={onTheme} aria-label="Toggle theme">{theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}</button>
        <Link to="/" className="hidden sm:flex primary-btn !py-2.5"><Plus size={16}/> New inbox</Link>
        <button className="icon-btn md:hidden" onClick={()=>setOpen(!open)} aria-label="Menu">{open?<X/>:<Menu/>}</button>
      </div>
    </div>
    <AnimatePresence>{open&&<motion.nav initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="md:hidden overflow-hidden border-t border-border">
      <div className="p-3 grid gap-1">{navItems.map(n=><Link onClick={()=>setOpen(false)} key={n.to} to={n.to} className="mobile-nav">{n.label}<ChevronRight size={16}/></Link>)}</div>
    </motion.nav>}</AnimatePresence>
  </header>
}

function BottomNav({active,onChange}:{active:Tab,onChange:(x:Tab)=>void}){
  const items:[Tab,string,any][]=[["inbox","Inbox",Inbox],["generate","Generate",Plus],["domains","Domains",Archive],["settings","Settings",ShieldCheck]];
  return <div className="fixed md:hidden bottom-0 inset-x-0 z-40 px-3 pb-safe">
    <div className="bottom-nav">{items.map(([id,label,Icon])=><button key={id} onClick={()=>onChange(id)} className={active===id?"bottom-item active":"bottom-item"}><Icon size={19}/><span>{label}</span></button>)}</div>
  </div>
}

function Loader3D(){
  return <motion.div className="loader-overlay" initial={{opacity:1}} exit={{opacity:0}} transition={{duration:.35}}>
    <div className="loader-orb"><div className="loader-cube"><Mail size={30}/></div><i/><i/><i/></div>
    <div className="text-center mt-7"><div className="text-2xl font-bold font-display">PN <span className="text-gradient-primary">TEMP MAIL</span></div><p className="text-xs uppercase tracking-[.28em] text-muted-foreground mt-2">Securing your inbox</p></div>
    <div className="loader-dots"><b/><b/><b/></div>
  </motion.div>
}

function AddressCard({email,onCopy,onQR,onNew}:{email:string,onCopy:()=>void,onQR:()=>void,onNew:()=>void}){
  return <motion.section initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} className="address-card">
    <div className="flex items-center justify-between gap-3 mb-5"><div><p className="eyebrow">YOUR TEMPORARY ADDRESS</p><h1 className="text-2xl md:text-3xl font-bold font-display mt-1">Private inbox, ready now.</h1></div><span className="live-pill"><i/>LIVE</span></div>
    <div className="email-box"><Mail className="text-primary shrink-0" size={21}/><span className="font-mono text-sm md:text-base truncate">{email}</span><button onClick={onCopy} className="copy-btn" title="Copy email"><Copy size={17}/></button></div>
    <div className="flex flex-wrap gap-2 mt-3"><button onClick={onNew} className="soft-btn"><RefreshCw size={15}/> New address</button><button onClick={onQR} className="soft-btn"><QrCode size={15}/> QR code</button><span className="secure-label"><ShieldCheck size={15}/> No signup</span></div>
  </motion.section>
}

function InboxPanel({messages,refreshing,onRefresh,onOpen}:{messages:EmailMessage[],refreshing:boolean,onRefresh:()=>void,onOpen:(id:string)=>void}){
  const [q,setQ]=useState("");
  const filtered=useMemo(()=>messages.filter(m=>`${m.from_name} ${m.from_address} ${m.subject} ${m.preview}`.toLowerCase().includes(q.toLowerCase())),[messages,q]);
  return <section className="panel overflow-hidden">
    <div className="panel-head"><div><p className="eyebrow">INBOX</p><h2 className="section-title">{messages.length} message{messages.length!==1?"s":""}</h2></div><button className="icon-btn" onClick={onRefresh} disabled={refreshing}>{refreshing?<Loader2 className="animate-spin"/>:<RefreshCw size={17}/>}</button></div>
    <div className="px-4 pb-3"><div className="search-box"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search messages..."/>{q&&<button onClick={()=>setQ("")}><X size={15}/></button>}</div></div>
    {filtered.length===0?<div className="empty-state"><span className="empty-icon"><Inbox size={26}/></span><h3>{q?"No matching messages":"Waiting for incoming mail"}</h3><p>{q?"Try a different search.":"Keep this page open. New messages appear automatically."}</p><div className="pulse-line"><i/></div></div>:
    <div className="divide-y divide-border/70">{filtered.map(m=><button key={m.id} onClick={()=>onOpen(m.id)} className="message-row">
      <span className={m.is_read?"avatar":"avatar unread"}>{(m.from_name||m.from_address||"?").charAt(0).toUpperCase()}</span>
      <span className="min-w-0 flex-1 text-left"><span className="flex items-center gap-2"><b className="truncate text-sm">{m.from_name||m.from_address}</b>{!m.is_read&&<i className="unread-dot"/>}</span><strong className="block truncate text-sm mt-0.5">{m.subject||"(No subject)"}</strong><small className="block truncate">{m.preview||"No preview"}</small></span>
      <span className="text-muted-foreground"><ChevronRight size={17}/></span>
    </button>)}</div>}
  </section>
}

function GeneratePanel({onGenerate,onCustom}:{onGenerate:(mode:"random"|"natural")=>void,onCustom:(u:string,d:string)=>void}){
  const [mode,setMode]=useState<"random"|"natural">("natural"),[u,setU]=useState(""),[d,setD]=useState(DOMAINS[0]);
  return <section className="panel p-5"><p className="eyebrow">ADDRESS LAB</p><h2 className="section-title mt-1">Create a fresh inbox</h2><p className="muted mt-1">Generate an instant disposable address or choose your own username.</p>
    <div className="mode-grid mt-5"><button className={mode==="natural"?"mode active":"mode"} onClick={()=>setMode("natural")}><Sparkles size={18}/><b>Natural</b><small>name + digits</small></button><button className={mode==="random"?"mode active":"mode"} onClick={()=>setMode("random")}><Zap size={18}/><b>Random</b><small>high-entropy ID</small></button></div>
    <button className="primary-btn w-full mt-4 justify-center" onClick={()=>onGenerate(mode)}><Sparkles size={17}/> Generate address</button>
    <div className="custom-grid mt-5"><input className="field" value={u} onChange={e=>setU(e.target.value.replace(/[^a-zA-Z0-9._-]/g,""))} placeholder="username"/><select className="field" value={d} onChange={e=>setD(e.target.value)}>{DOMAINS.map(x=><option key={x}>{x}</option>)}</select></div>
    <button disabled={!u.trim()} className="soft-btn w-full justify-center mt-2" onClick={()=>onCustom(u.trim(),d)}><Plus size={16}/> Use custom address</button>
  </section>
}

function DomainPanel(){
 return <section className="panel p-5"><div className="flex justify-between items-center"><div><p className="eyebrow">AVAILABLE DOMAINS</p><h2 className="section-title mt-1">Pick your inbox namespace</h2></div><span className="count-badge">{DOMAINS.length}</span></div><div className="domain-grid mt-5">{DOMAINS.map(d=><div className="domain-chip" key={d}><span><Mail size={15}/>{d}</span><Check size={15}/></div>)}</div></section>
}

function SettingsPanel({theme,onTheme,onDelete}:{theme:string,onTheme:()=>void,onDelete:()=>void}){
 return <section className="panel p-5"><p className="eyebrow">CONTROL CENTER</p><h2 className="section-title mt-1">Settings</h2><div className="settings-list mt-5"><button className="setting-row" onClick={onTheme}><span><span className="setting-icon">{theme==="dark"?<Sun/>:<Moon/>}</span><span><b>Appearance</b><small>{theme==="dark"?"Dark mode":"Light mode"}</small></span></span><ChevronRight size={17}/></button><button className="setting-row danger" onClick={onDelete}><span><span className="setting-icon"><Trash2/></span><span><b>Reset inbox</b><small>Delete the current address locally and remotely</small></span></span><ChevronRight size={17}/></button></div></section>
}

function QRModal({email,onClose}:{email:string,onClose:()=>void}){
 const [src,setSrc]=useState(""); useEffect(()=>{QRCode.toDataURL(email,{width:260,margin:2}).then(setSrc)},[email]);
 return <div className="modal-backdrop" onClick={onClose}><motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}} onClick={e=>e.stopPropagation()} className="modal-card"><button className="modal-close" onClick={onClose}><X/></button><div className="modal-icon"><QrCode/></div><h3 className="text-xl font-bold">Share inbox</h3><p className="muted mt-1">Scan this QR code to share the address.</p>{src&&<img src={src} className="qr-img" alt="Temporary email QR code"/>}<code className="share-code">{email}</code></motion.div></div>
}

export default function Index(){
 const {theme,toggleTheme}=useTheme(); const [tab,setTab]=useState<Tab>("inbox"),[email,setEmail]=useState<TempEmail|null>(null),[messages,setMessages]=useState<EmailMessage[]>([]),[selected,setSelected]=useState<EmailMessage|null>(null),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[qr,setQr]=useState(false);
 const interval=useRef<ReturnType<typeof setInterval>|null>(null); const location=useLocation();
 useSEO("PN Temp Mail — Free Temporary Email & Disposable Inbox","PN Temp Mail is a free temporary email service with instant disposable inboxes, no signup, automatic refresh, privacy-first email receiving, multiple domains and a clean mobile-friendly experience.");
 const setNew=(e:TempEmail)=>{setEmail(e);setMessages([]);setSelected(null);saveEmailToStorage(e,"natural");};
 const generate=useCallback(async(mode:"random"|"natural")=>{setNew(mode==="natural"?await generateNaturalEmail():generateTempEmail());setTab("inbox")},[]);
 const refresh=useCallback(async()=>{if(!email)return;setRefreshing(true);try{setMessages(await fetchMessages(email.address))}finally{setRefreshing(false)}},[email]);
 useEffect(()=>{const saved=loadEmailFromStorage(); if(saved)setEmail(saved.email); else void generate("natural"); const t=setTimeout(()=>setLoading(false),1200); return()=>clearTimeout(t)},[]);
 useEffect(()=>{if(!email)return;void refresh();interval.current=setInterval(refresh,10000);return()=>{if(interval.current)clearInterval(interval.current)}},[email,refresh]);
 useEffect(()=>{if(location.pathname!=="/")return;},[location.pathname]);
 const custom=(u:string,d:string)=>{setNew(generateCustomEmail(u,d));setTab("inbox")};
 const reset=async()=>{if(email)await deleteEmail(email.address);clearEmailStorage();await generate("natural");toast.success("Inbox reset and a new address was created.")};
 const open=(id:string)=>{if(!email)return;fetchMessage(email.address,id).then(m=>{if(m){setSelected(m);setMessages(x=>x.map(v=>v.id===id?{...v,is_read:true}:v))}})};
 if(location.pathname!=="/") return <RoutesFallback theme={theme} toggleTheme={toggleTheme}/>;
 return <><AnimatePresence>{loading&&<Loader3D/>}</AnimatePresence><div className="min-h-screen bg-background pb-24 md:pb-0"><SiteHeader theme={theme} onTheme={toggleTheme}/><main className="max-w-6xl mx-auto px-4 py-7 md:py-10">
   <div className="hero-row"><div><div className="kicker"><span/>PRIVATE • FAST • NO SIGNUP</div><h1 className="hero-title">Your inbox.<br/><span className="text-gradient-primary">Temporary by design.</span></h1><p className="hero-copy">Create a disposable email address in one tap. Receive messages instantly without exposing your personal inbox.</p></div><div className="hero-stat"><span className="stat-number">24/7</span><span>inbox monitoring</span></div></div>
   <div className="desktop-tabs">{(["inbox","generate","domains","settings"] as Tab[]).map(x=><button onClick={()=>setTab(x)} className={tab===x?"tab active":"tab"} key={x}>{x==="inbox"?<Inbox/>:x==="generate"?<Plus/>:x==="domains"?<Archive/>:<ShieldCheck/>}{x[0].toUpperCase()+x.slice(1)}</button>)}</div>
   <div className="grid lg:grid-cols-[1.35fr_.65fr] gap-5 items-start">
    <div className="space-y-5">{selected&&tab==="inbox"?<EmailViewer message={selected} onBack={()=>setSelected(null)}/>:<><AddressCard email={email?.address||"Creating inbox…"} onCopy={()=>email&&navigator.clipboard.writeText(email.address).then(()=>toast.success("Email copied"))} onQR={()=>setQr(true)} onNew={()=>generate("natural")}/><InboxPanel messages={messages} refreshing={refreshing} onRefresh={refresh} onOpen={open}/></>}</div>
    <aside className="space-y-5"><AnimatePresence mode="wait">{tab==="generate"&&<GeneratePanel onGenerate={generate} onCustom={custom}/>} {tab==="domains"&&<DomainPanel/>}{tab==="settings"&&<SettingsPanel theme={theme} onTheme={toggleTheme} onDelete={reset}/>} {tab==="inbox"&&<QuickInfo/>}</AnimatePresence></aside>
   </div>
 </main><BottomNav active={tab} onChange={setTab}/>{qr&&email&&<QRModal email={email.address} onClose={()=>setQr(false)}/>}</div>
}

function QuickInfo(){return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="info-stack"><div className="mini-card"><ShieldCheck/><div><b>Privacy-first</b><p>No registration or personal profile required.</p></div></div><div className="mini-card"><RefreshCw/><div><b>Auto-refresh</b><p>Your inbox checks for new messages every 10 seconds.</p></div></div><div className="mini-card"><Paperclip/><div><b>Attachments</b><p>Open supported email attachments directly from the inbox.</p></div></div><Link className="learn-link" to="/how-it-works">Learn how PN Temp Mail works <ChevronRight size={16}/></Link></div>}

function RoutesFallback({theme,toggleTheme}:{theme:string,toggleTheme:()=>void}){
 const loc=useLocation(); const path=loc.pathname;
 return <div className="min-h-screen bg-background"><SiteHeader theme={theme} onTheme={toggleTheme}/><div className="max-w-4xl mx-auto px-4 py-10"><Link to="/" className="back-link"><ArrowLeft size={16}/> Back to inbox</Link>{path==="/features"?<InfoContent title="Everything you need for disposable email" eyebrow="FEATURES"><FeatureGrid/></InfoContent>:path==="/how-it-works"?<InfoContent title="Simple, fast and privacy-focused" eyebrow="HOW IT WORKS"><Steps/></InfoContent>:path==="/faq"?<InfoContent title="Frequently asked questions" eyebrow="FAQ"><Faq/></InfoContent>:path==="/privacy"?<InfoContent title="Privacy at a glance" eyebrow="PRIVACY"><Privacy/></InfoContent>:<InfoContent title="About PN Temp Mail" eyebrow="ABOUT"><About/></InfoContent>}</div></div>
}
function InfoContent({title,eyebrow,children}:{title:string,eyebrow:string,children:any}){return <article><p className="eyebrow">{eyebrow}</p><h1 className="page-title">{title}</h1><div className="article-body">{children}</div></article>}
function FeatureGrid(){const a=[["⚡","Instant addresses","Generate a disposable mailbox in seconds."],["🔄","Live inbox","Automatically refreshes for incoming messages."],["🛡️","No signup","Start without creating an account."],["📎","Attachments","View supported attachments received by your inbox."],["📱","Mobile ready","Designed for phones, tablets and desktops."],["🔗","Shareable","Use the QR code to share an address quickly."]];return <div className="feature-grid">{a.map(x=><div className="feature-card" key={x[1]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></div>)}</div>}
function Steps(){return <div className="steps">{["Generate an address","Keep the inbox open","Receive and read mail","Reset when finished"].map((x,i)=><div className="step" key={x}><b>{String(i+1).padStart(2,"0")}</b><div><h3>{x}</h3><p>{["Choose a natural or random address, or enter a custom username.","PN Temp Mail checks the active inbox automatically.","Open a message to read its available content and attachments.","Delete the current inbox and create a fresh address whenever you want."][i]}</p></div></div>)}</div>}
function Faq(){return <div className="faq-list">{[["What is PN Temp Mail?","It is a disposable email interface for receiving email without using your primary inbox."],["Do I need an account?","No account is required for the core inbox experience."],["How often does the inbox refresh?","The web app polls the configured backend every 10 seconds while the inbox is open."],["Can I choose a domain?","Yes. Available domains configured by the backend are shown in the Domains section."],["Are messages permanent?","Temporary-mail systems are designed for short-lived use. Do not use a disposable inbox for important records or account recovery." ]].map(([q,a])=><details key={q}><summary>{q}<ChevronRight/></summary><p>{a}</p></details>)}</div>}
function Privacy(){return <div className="prose"><p>PN Temp Mail is designed to minimize the information needed to use a temporary inbox. The frontend does not require registration for the core experience.</p><h3>Use responsibly</h3><p>Do not use temporary email for unlawful activity, harassment, fraud, or to bypass a service's rules. Avoid placing sensitive personal information in disposable mailboxes.</p><h3>Local storage</h3><p>The current inbox address and selected mode are stored locally in your browser so the app can restore the active inbox.</p></div>}
function About(){return <div className="prose"><p><strong>PN Temp Mail</strong> is a privacy-focused disposable email interface built for a fast, clean web experience.</p><p>The project combines a React/Vite frontend with its configured email backend and Cloudflare deployment stack.</p><div className="about-box"><ShieldCheck/><div><b>Built for speed.</b><p>Minimal setup, responsive UI, and a dedicated temporary inbox.</p></div></div></div>}
