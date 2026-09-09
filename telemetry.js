import { firebaseConfig, firebaseConfigured } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, doc, setDoc, updateDoc, addDoc, collection, getDoc,
  onSnapshot, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const api = {
  ready:false, uid:null, displayId:null, playerName:null, db:null, qa:null,
  spinStart(){},
  spinEnd(){},
  consumeForceJackpot(){}
};
window.BuffaloTelemetry = api;

if (!firebaseConfigured) {
  console.info("Buffalo V8: Firebase chưa cấu hình. Game vẫn chơi bình thường, realtime dashboard đang tắt.");
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  api.db = db;

  const sessionId = sessionStorage.getItem("buffaloSessionId") ||
    (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+"-"+Math.random().toString(36).slice(2));
  sessionStorage.setItem("buffaloSessionId", sessionId);

  let lastForceNonce = sessionStorage.getItem("buffaloForceNonce") || "";
  let lastCreditGrantNonce = localStorage.getItem("buffaloCreditGrantNonce") || "";
  let lastAdminMessageNonce = sessionStorage.getItem("buffaloAdminMessageNonce") || "";
  let currentQa = null;

  const safeNum = (v,d=0)=>Number.isFinite(Number(v))?Number(v):d;

  async function heartbeat() {
    if (!api.uid) return;
    try {
      await setDoc(doc(db,"players",api.uid),{
        uid:api.uid,
        displayId:api.displayId,
        playerName:api.playerName,
        sessionId,
        online:true,
        lastSeen:serverTimestamp(),
        balance:safeNum(document.querySelector("#balance")?.textContent?.replace(/\D/g,""),0)
      },{merge:true});
    } catch(e) { console.warn("presence write failed",e); }
  }

  async function processCreditGrant(data) {
    const nonce=String(data?.creditGrantNonce||"");
    const amount=Math.max(0,Math.floor(Number(data?.creditAmount)||0));
    if(!nonce||!amount||nonce===lastCreditGrantNonce)return;

    lastCreditGrantNonce=nonce;
    localStorage.setItem("buffaloCreditGrantNonce",nonce);
    document.dispatchEvent(new CustomEvent("buffalo-credit-grant",{detail:{amount,nonce}}));

    if(api.uid){
      updateDoc(doc(db,"players",api.uid),{
        lastCreditGrantNonce:nonce,
        lastCreditAmount:amount,
        lastCreditAt:serverTimestamp()
      }).catch(()=>{});
    }
  }

  function processRealtimeControls(data){
    document.dispatchEvent(new CustomEvent("buffalo-player-pause",{detail:{paused:!!data?.paused,pauseMessage:String(data?.pauseMessage||"DEV đang tạm dừng phiên chơi này.")}}));
    const nonce=String(data?.messageNonce||"");
    const text=String(data?.messageText||"").trim();
    if(nonce&&text&&nonce!==lastAdminMessageNonce){
      lastAdminMessageNonce=nonce;sessionStorage.setItem("buffaloAdminMessageNonce",nonce);
      document.dispatchEvent(new CustomEvent("buffalo-admin-message",{detail:{text,nonce}}));
    }
  }

  function applyQa(data) {
    processCreditGrant(data).catch(e=>console.warn("credit grant",e));
    processRealtimeControls(data);

    if (!data || !data.enabled) {
      currentQa=null; api.qa=null;
      document.dispatchEvent(new CustomEvent("buffalo-qa-override",{detail:null}));
      return;
    }
    const d={...data};
    if (d.forceJackpotNonce && d.forceJackpotNonce !== lastForceNonce) {
      d.forceJackpotNext=true;
    } else {
      d.forceJackpotNext=false;
    }
    currentQa=d; api.qa=d;
    document.dispatchEvent(new CustomEvent("buffalo-qa-override",{detail:d}));
  }

  api.consumeForceJackpot = () => {
    if (currentQa?.forceJackpotNonce) {
      lastForceNonce=currentQa.forceJackpotNonce;
      sessionStorage.setItem("buffaloForceNonce",lastForceNonce);
      currentQa={...currentQa,forceJackpotNext:false};
      api.qa=currentQa;
      document.dispatchEvent(new CustomEvent("buffalo-qa-override",{detail:currentQa}));
    }
  };

  api.spinStart = async ({bet=0,balance=0,isFree=false}={}) => {
    if (!api.uid) return;
    try {
      await setDoc(doc(db,"players",api.uid),{
        uid:api.uid,displayId:api.displayId,playerName:api.playerName,sessionId,online:true,lastSeen:serverTimestamp(),
        balance:safeNum(balance),lastBet:safeNum(bet),lastSpinFree:!!isFree
      },{merge:true});
    } catch(e) { console.warn(e); }
  };

  api.spinEnd = async ({bet=0,win=0,jackpot=false,balance=0,isFree=false,scatters=0}={}) => {
    if (!api.uid) return;
    bet=safeNum(bet); win=safeNum(win); balance=safeNum(balance);
    try {
      await updateDoc(doc(db,"players",api.uid),{
        online:true,lastSeen:serverTimestamp(),balance,lastWin:win,lastJackpot:!!jackpot,
        spins:increment(1),totalBet:increment(isFree?0:bet),totalWon:increment(win),
        sessionWon:increment(win),sessionBet:increment(isFree?0:bet)
      });
      await addDoc(collection(db,"events"),{
        uid:api.uid,displayId:api.displayId,playerName:api.playerName,sessionId,bet,win,jackpot:!!jackpot,
        isFree:!!isFree,scatters:safeNum(scatters),balance,ts:serverTimestamp()
      });
    } catch(e) { console.warn("spin telemetry failed",e); }
  };

  onAuthStateChanged(auth, async user => {
    if (!user) return;

    const waitForPlayerName = async () => {
      const current=String(window.BUFFALO_PLAYER_NAME||sessionStorage.getItem("buffaloPlayerName")||"").trim();
      if(current) return current;
      return await new Promise(resolve=>{
        const handler=e=>{
          document.removeEventListener("buffalo-player-name-ready",handler);
          resolve(String(e.detail?.name||"").trim());
        };
        document.addEventListener("buffalo-player-name-ready",handler);
      });
    };

    const playerName=await waitForPlayerName();
    if(!playerName) return;

    api.uid=user.uid;
    api.displayId="P-"+user.uid.slice(-6).toUpperCase();
    api.playerName=playerName;
    api.ready=true;

    try{
      const existingPlayer=await getDoc(doc(db,"players",user.uid));
      const n=String(existingPlayer.data()?.lastCreditGrantNonce||"");
      if(n){
        lastCreditGrantNonce=n;
        localStorage.setItem("buffaloCreditGrantNonce",n);
      }
    }catch(_){}

    await setDoc(doc(db,"players",user.uid),{
      uid:user.uid,
      displayId:api.displayId,
      playerName:api.playerName,
      sessionId,
      online:true,
      joinedAt:serverTimestamp(),
      lastSeen:serverTimestamp(),
      spins:0,totalBet:0,totalWon:0,sessionBet:0,sessionWon:0
    },{merge:true});

    onSnapshot(doc(db,"settings","global"),snap=>{
      if(snap.exists()){
        document.dispatchEvent(new CustomEvent("buffalo-global-settings",{detail:snap.data()}));
      }
    },e=>console.warn("settings snapshot",e));

    onSnapshot(doc(db,"qaOverrides",user.uid),snap=>{
      applyQa(snap.exists()?snap.data():null);
    },e=>console.warn("qa snapshot",e));

    heartbeat();
    setInterval(heartbeat,15000);
  });

  signInAnonymously(auth).catch(e=>console.warn("Anonymous auth failed",e));

  addEventListener("pagehide",()=>{
    if(api.uid) updateDoc(doc(db,"players",api.uid),{online:false,lastSeen:serverTimestamp()}).catch(()=>{});
  });
}
