import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Compass, Sun, Archive, BookOpen, Footprints, Flame, Dumbbell, Brain, Code2, Languages, Settings, ArrowUpRight, Plus, Check, X, ChevronLeft, ChevronRight, Download, Upload, Moon, Monitor, WifiOff, FileText, ArrowRight, CircleHelp } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-ext-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-ext-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-ext-600.css';
import '@fontsource/newsreader/latin-400.css';
import '@fontsource/newsreader/latin-ext-400.css';
import '@fontsource/newsreader/latin-400-italic.css';
import '@fontsource/newsreader/latin-ext-400-italic.css';
import * as D from './domain';
import { loadState, persistState } from './db';
import { isAndroidApp, sendAndroidMessage } from './android';
import './style.css';

const icons = { calories:Flame,steps:Footprints,training:Dumbbell,book:BookOpen,mind:Brain,web:Code2,english:Languages };
const hints: Record<D.Activity,string> = {calories:'Günün toplamı · Yazio',steps:'Günün adım sayısı',training:'Hareket ettiğin bir gün · Freeletics',book:'Bir kitap seç',mind:'Bu haftanın konusunu seç',web:'Bir araştırma dönemi başlat',english:'Pratiğe dokunduğun bir gün'};
const fmt=(n:number|null)=>n===null?'—':new Intl.NumberFormat('tr-TR',{maximumFractionDigits:0}).format(n);
type InstallEvent=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
let askInstall: InstallEvent|null=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();askInstall=e as InstallEvent;window.dispatchEvent(new Event('install-ready'));});
let updateSW: (reload?:boolean)=>Promise<void> = async()=>{};
let swReady=isAndroidApp,swUpdate=false;
if(!isAndroidApp){
  updateSW=registerSW({onOfflineReady(){swReady=true;window.dispatchEvent(new Event('sw-state'));},onNeedRefresh(){swUpdate=true;window.dispatchEvent(new Event('sw-state'));},onRegisterError(){window.dispatchEvent(new Event('sw-state'));}});
  if('serviceWorker' in navigator) navigator.serviceWorker.ready.then(()=>{swReady=true;window.dispatchEvent(new Event('sw-state'));});
}

function App(){
  const [s,setS]=useState<D.State|null>(null),[day,setDay]=useState(D.today()),[tab,setTab]=useState<'today'|'reports'|'history'>('today');
  const [error,setError]=useState(''),[toast,setToast]=useState(''),[busy,setBusy]=useState(false),[settings,setSettings]=useState(false);
  const [edit,setEdit]=useState<{activity:D.Activity;date:string}|null>(null),[clockBack,setClockBack]=useState(false);
  const [online,setOnline]=useState(navigator.onLine),[offlineReady,setOfflineReady]=useState(swReady),[update,setUpdate]=useState(swUpdate),[install,setInstall]=useState(!!askInstall);
  const [restore,setRestore]=useState<D.State|null>(null),[reportDate,setReportDate]=useState(D.today()),[period,setPeriod]=useState<'week'|'month'>('week');
  const [history,setHistory]=useState<'days'|'books'|'videos'|'research'>('days');
  const pending=useRef(false),channel=useRef<BroadcastChannel|null>(null);
  const commit=useCallback(async(fn:(state:D.State)=>D.State)=>{
    if(pending.current) return false;pending.current=true;setBusy(true);setError('');
    try{
      const work=async()=>{const latest=await loadState(),actual=D.today(),current=actual<latest.settings.lastSeen?latest.settings.lastSeen:actual;const next=fn(D.reconcile(latest,current));await persistState(next);setS(next);setDay(current);channel.current?.postMessage('changed');};
      if(navigator.locks) await navigator.locks.request('eylem-pusulasi-write',work);else await work();
      return true;
    }catch(e){setError(e instanceof Error?e.message:'Kayıt saklanamadı. Lütfen tekrar deneyin.');return false;}finally{pending.current=false;setBusy(false);}
  },[]);
  useEffect(()=>{
    let alive=true;
    const refresh=async()=>{try{const state=await loadState(),actual=D.today(),current=actual<state.settings.lastSeen?state.settings.lastSeen:actual;if(!alive)return;setClockBack(actual<state.settings.lastSeen);setDay(current);const next=D.reconcile(state,current);if(JSON.stringify(next)!==JSON.stringify(state)){await commit(x=>D.reconcile(x,current));}else setS(next);}catch{setError('Yerel veritabanı açılamadı. Tarayıcı depolama iznini kontrol edip yeniden açın.');}};
    refresh();const timer=window.setInterval(()=>{if(D.today()!==day)refresh();},1000);
    const visible=()=>{if(document.visibilityState==='visible')refresh();};document.addEventListener('visibilitychange',visible);
    channel.current=new BroadcastChannel('eylem-pusulasi');channel.current.onmessage=()=>refresh();
    return()=>{alive=false;clearInterval(timer);document.removeEventListener('visibilitychange',visible);channel.current?.close();};
  },[commit,day]);
  useEffect(()=>{if(!s)return;const mq=matchMedia('(prefers-color-scheme: dark)');const apply=()=>{document.documentElement.dataset.theme=s.settings.theme==='system'?(mq.matches?'dark':'light'):s.settings.theme;};apply();mq.addEventListener('change',apply);return()=>mq.removeEventListener('change',apply);},[s?.settings.theme]);
  useEffect(()=>{const net=()=>setOnline(navigator.onLine),sw=()=>{setOfflineReady(swReady);setUpdate(swUpdate);},inst=()=>setInstall(!!askInstall);window.addEventListener('online',net);window.addEventListener('offline',net);window.addEventListener('sw-state',sw);window.addEventListener('install-ready',inst);return()=>{window.removeEventListener('online',net);window.removeEventListener('offline',net);window.removeEventListener('sw-state',sw);window.removeEventListener('install-ready',inst);};},[]);
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),2800);return()=>clearTimeout(t);}},[toast]);
  useEffect(()=>{
    if(!isAndroidApp)return;
    const result=(event:Event)=>{
      const detail=(event as CustomEvent<{status:string}>).detail;
      if(detail.status==='saved')setToast('Yedek dosyası kaydedildi');
      if(detail.status==='error')setError('Yedek dosyası yazılamadı. Mevcut kayıtlarınız korundu.');
    };
    window.addEventListener('android-export-result',result);
    return()=>window.removeEventListener('android-export-result',result);
  },[]);
  useEffect(()=>{
    if(!isAndroidApp)return;
    const back=()=>{if(restore)setRestore(null);else if(edit)setEdit(null);else if(settings)setSettings(false);else if(tab!=='today')setTab('today');else sendAndroidMessage('minimize');};
    window.addEventListener('android-back',back);
    return()=>window.removeEventListener('android-back',back);
  },[restore,edit,settings,tab]);
  useEffect(()=>{if(edit&&edit.date!==day&&!s?.entries.some(e=>e.date===edit.date&&e.activity===edit.activity))setEdit(null);},[day,edit,s]);
  const save=async(fn:(state:D.State)=>D.State,message='Kayıt saklandı')=>{const ok=await commit(fn);if(ok)setToast(message);return ok;};
  function exportData(){try{const data=D.makeBackup(s!),filename=`eylem-pusulasi-${day}.json`;if(isAndroidApp){sendAndroidMessage('export',data,filename);return;}const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setToast('Yedek indirildi');}catch(e){setError(e instanceof Error?e.message:'Yedek oluşturulamadı.');}}
  async function importFile(file?:File){if(!file)return;try{if(file.size>25000000)throw new Error();setRestore(D.parseBackup(await file.text()));}catch{setError('Bu dosya geçerli bir Eylem Pusulası yedeği değil. Mevcut kayıtlarınız korundu.');}}
  if(!s)return <div className="loading"><Compass size={44}/><h1>Eylem Pusulası</h1><p>{error||'Defter açılıyor…'}</p></div>;
  const book=D.activeBook(s),video=D.activeVideo(s,day),research=D.activeSession(s);
  const context=(a:D.Activity)=>{
    if(a==='book')return book?.title||hints.book;
    if(a==='mind')return video?.title||hints.mind;
    if(a==='web'&&research){const status=D.researchStatus(research,day);return `${s.programs.find(p=>p.id===research.programId)?.name} · ${status.needsDecision?'Devam kararı bekliyor':status.day+'. gün'}`;}
    return hints[a];
  };
  const openEntry=(a:D.Activity,d=day)=>{setError('');setEdit({activity:a,date:d});};
  const quick=async(a:D.Activity)=>{
    if(s.entries.some(e=>e.date===day&&e.activity===a)){openEntry(a);return;}
    const refId=a==='book'?book?.id:a==='mind'?video?.id:a==='web'?research?.id:undefined;
    if(a==='calories'||a==='steps'||(['book','mind','web'].includes(a)&&!refId)||(a==='web'&&research&&!D.researchStatus(research,day).canLog)){openEntry(a);return;}
    await save(x=>D.saveEntry(x,day,a,{refId},D.today()<x.settings.lastSeen?x.settings.lastSeen:D.today()));
  };
  return <div className="app-shell">
    <header className="topbar"><button className="brand" onClick={()=>setTab('today')} aria-label="Eylem Pusulası ana ekran"><Compass strokeWidth={1.3}/><span>Eylem <b>Pusulası</b></span></button><div className="header-right"><span className="local-label"><i/> YALNIZCA BU CİHAZDA</span><button className="icon-button" aria-label="Ayarlar ve yedekleme" onClick={()=>{setError('');setSettings(true);}}><Settings size={20}/></button></div></header>
    <main>
      {clockBack&&<div className="notice">Cihaz tarihi son kaydınızdan geride. Kayıtlarınızı korumak için {D.pretty(day)} günü açık tutuluyor. Telefon tarihini kontrol edin.</div>}
      {!online&&!isAndroidApp&&<div className="network-note"><WifiOff size={14}/> Çevrimdışı · kayıtlar bu cihazda saklanıyor</div>}
      {error&&<div role="alert" className="error app-error">{error}<button aria-label="Uyarıyı kapat" onClick={()=>setError('')}><X size={16}/></button></div>}
      {tab==='today'&&<>
        <section className="page-heading"><div><p className="eyebrow">KİŞİSEL SAHA DEFTERİ <span> / 01</span></p><h1>Bugünün yönleri<span>.</span></h1><p className="heading-note">Eylem sabit, sonuç serbest.</p></div><div className="date-stamp"><span>{D.pretty(day,{weekday:'long'})}</span><strong>{D.pretty(day,{day:'2-digit',month:'long'})}</strong><span>{day.slice(0,4)}</span></div></section>
        <div className="list-label"><span>GÜNLÜK FAALİYETLER</span><span>{D.pretty(day,{day:'2-digit',month:'2-digit'})} <span className="label-dash">—</span> İSTANBUL</span></div>
        <section className="activity-list" aria-label="Bugünün yedi faaliyeti">{D.activities.map((a,i)=>{
          const e=s.entries.find(e=>e.date===day&&e.activity===a),Icon=icons[a];
          return <article className={`activity-row ${e?'recorded':''}`} key={a}>
            <span className="row-number">0{i+1}</span><div className="activity-icon"><Icon size={22} strokeWidth={1.35}/></div>
            <button className="activity-main" onClick={()=>openEntry(a)}><span className="activity-name">{D.labels[a]}</span><span className="activity-context">{e&&['book','mind','web'].includes(a)?D.entryContext(s,e):e?.note||context(a)}</span></button>
            <button className={`entry-value ${e?'has-value':''}`} onClick={()=>openEntry(a)} aria-label={`${D.labels[a]} kaydını ${e?'düzenle':'aç'}`}>{e?.value!==undefined?<>{fmt(e.value)} <small>{a==='calories'?'kcal':'adım'}</small></>:e?<span>Kaydedildi</span>:<span className="entry-placeholder">Kayıt ekle <ArrowUpRight size={13}/></span>}</button>
            <button className={`mark ${e?'is-checked':''}`} onClick={()=>quick(a)} disabled={busy} aria-label={`${D.labels[a]} ${e?'kaydını düzenle':'yapıldı olarak kaydet'}`}>{e?<Check size={18} strokeWidth={1.8}/>:<Plus size={18} strokeWidth={1.3}/>}</button>
          </article>;
        })}</section>
        <footer className="today-footer"><span className="small-compass"><Compass size={18} strokeWidth={1.2}/></span><p>Her gün yeniden.<br/><span>Dünden kalan bir borç yok.</span></p><span className="footer-caption">KAYIT TUT. YÖNÜNÜ HATIRLA.</span></footer>
      </>}
      {tab==='reports'&&<>
        <section className="page-heading"><div><p className="eyebrow">DEFTERE UZAKTAN BAKIŞ <span>/ 02</span></p><h1>Yaşamın izleri<span>.</span></h1><p className="heading-note">Bir değerlendirme değil, yaşananların kaydı.</p></div><FileText className="heading-symbol" size={44} strokeWidth={1}/></section>
        <div className="report-controls"><div className="segmented"><button className={period==='week'?'selected':''} onClick={()=>setPeriod('week')}>Haftalık</button><button className={period==='month'?'selected':''} onClick={()=>setPeriod('month')}>Aylık</button></div><input aria-label="Rapor tarihi" type={period==='week'?'date':'month'} max={period==='week'?day:day.slice(0,7)} value={period==='week'?reportDate:reportDate.slice(0,7)} onChange={e=>e.target.value&&setReportDate(period==='week'?e.target.value:e.target.value+'-01')}/></div>
        <div className="period-heading"><button className="icon-button" aria-label="Önceki dönem" onClick={()=>setReportDate(period==='week'?D.addDays(reportDate,-7):D.shiftMonth(reportDate,-1))}><ChevronLeft/></button><h2>{period==='week'?`${D.pretty(D.weekStart(reportDate))} — ${D.pretty(D.addDays(D.weekStart(reportDate),6))}`:D.pretty(reportDate,{month:'long',year:'numeric'})}</h2><button className="icon-button" aria-label="Sonraki dönem" disabled={period==='week'?D.addDays(D.weekStart(reportDate),7)>day:D.shiftMonth(reportDate,1)>day} onClick={()=>setReportDate(period==='week'?D.addDays(reportDate,7):D.shiftMonth(reportDate,1))}><ChevronRight/></button></div>
        {period==='week'?<Weekly s={s} start={D.weekStart(reportDate)} day={day}/>:<Monthly s={s} date={reportDate}/>}
      </>}
      {tab==='history'&&<>
        <section className="page-heading"><div><p className="eyebrow">SAKLANAN SAYFALAR <span>/ 03</span></p><h1>Geride kalanlar<span>.</span></h1><p className="heading-note">Her kaydın kendi zamanı, kendi bağlamı var.</p></div><Archive className="heading-symbol" size={44} strokeWidth={1}/></section>
        <div className="history-tabs">{([['days','Günler'],['books','Kitaplar'],['videos','Videolar'],['research','Araştırmalar']] as const).map(([key,name])=><button className={history===key?'selected':''} key={key} onClick={()=>setHistory(key)}>{name}</button>)}</div>
        {history==='days'&&<><p className="muted help-copy">Geçmişteki mevcut kayıtları düzeltebilirsiniz. Boş güne veya boş faaliyete yeni kayıt eklenmez.</p>{[...new Set(s.entries.map(e=>e.date))].sort().reverse().map(d=><section key={d} className="history-day"><div className="section-title"><h2>{D.pretty(d,{day:'numeric',month:'long',year:'numeric'})}</h2><button className="text-button" onClick={()=>{setReportDate(d);setPeriod('week');setTab('reports');}}>Haftayı aç <ArrowUpRight size={14}/></button></div>{s.entries.filter(e=>e.date===d).sort((a,b)=>D.activities.indexOf(a.activity)-D.activities.indexOf(b.activity)).map(e=><button className="history-entry" key={e.id} onClick={()=>openEntry(e.activity,e.date)}><span>{D.labels[e.activity]}</span><span>{e.value!==undefined?`${fmt(e.value)} ${e.activity==='calories'?'kcal':'adım'}`:D.entryContext(s,e)||'Kaydedildi'}</span><ArrowUpRight size={15}/></button>)}</section>)}{!s.entries.length&&<Empty text="İlk kaydınızla bu defterin geçmişi oluşacak."/>}</>}
        {history==='books'&&<>{[...s.books].reverse().map(b=><div className="archive-item" key={b.id}><BookOpen size={20}/><div><h3>{b.title}</h3><p>{D.pretty(b.startedOn)} — {b.finishedOn?D.pretty(b.finishedOn,{day:'numeric',month:'long',year:'numeric'}):'Okumaya devam'}</p></div><span className="status-label">{b.finishedOn?'Bitti':'Açık kitap'}</span></div>)}{!s.books.length&&<Empty text="Seçtiğiniz kitaplar ve bitiş tarihleri burada saklanır."/>}</>}
        {history==='videos'&&<>{[...s.videos].reverse().map(v=><div className="archive-item" key={v.id}><Brain size={20}/><div><h3>{v.title}</h3><p>{D.pretty(v.week)} haftası · Seçim: {D.pretty(v.selectedOn)}{v.finishedOn?` · Bitiş: ${D.pretty(v.finishedOn)}`:''}</p></div><span className="status-label">{v.finishedOn?'Bitti':v.week===D.weekStart(day)?'Bu hafta':'Hafta kapandı'}</span></div>)}{!s.videos.length&&<Empty text="Haftanın konuları burada birikir. Her hafta pazar başlar."/>}</>}
        {history==='research'&&<>{[...s.sessions].reverse().map(r=><div className="archive-item" key={r.id}><Code2 size={20}/><div><h3>{s.programs.find(p=>p.id===r.programId)?.name}</h3><p>{D.pretty(r.startedOn,{day:'numeric',month:'long',year:'numeric'})} — {r.endedOn?D.pretty(r.endedOn,{day:'numeric',month:'long',year:'numeric'}):'Açık'} · {D.daysBetween(r.startedOn,r.endedOn??day)+1} takvim günü</p><p className="archive-note">{r.note||'Not yok.'}</p></div><span className="status-label">{r.endedOn?'Kapandı':D.researchStatus(r,day).needsDecision?'Karar bekliyor':'Açık'}</span></div>)}{!s.sessions.length&&<Empty text="Her araştırma dönemi, aynı programa dönseniz de ayrı saklanır."/>}</>}
      </>}
      <div className="page-end"><span>EYLEM PUSULASI</span><span>Hayatını yönetmez. Yönünü hatırlatır.</span></div>
    </main>
    <nav className="bottom-nav" aria-label="Ana gezinme">{([['today','Bugün',Sun],['reports','Raporlar',FileText],['history','Geçmiş',Archive]] as const).map(([key,label,Icon])=><button key={key} className={tab===key?'active':''} aria-current={tab===key?'page':undefined} onClick={()=>setTab(key)}><Icon size={19} strokeWidth={1.5}/><span>{label}</span>{tab===key&&<i/>}</button>)}</nav>
    {toast&&<div className="toast" role="status"><Check size={16}/>{toast}</div>}
    {edit&&<EntryEditor key={edit.activity+edit.date} s={s} day={day} edit={edit} busy={busy} save={save} close={()=>setEdit(null)}/>}
    {settings&&!restore&&<Modal title="Defterin ayarları" subtitle="Sade, yerel, size ait." close={()=>setSettings(false)}>
      <h3 className="field-label">GÖRÜNÜM</h3><div className="theme-options">{([['light','Açık',Sun],['dark','Koyu',Moon],['system','Sistem',Monitor]] as const).map(([value,name,Icon])=><button disabled={busy} className={s.settings.theme===value?'selected':''} key={value} onClick={()=>commit(x=>({...x,settings:{...x.settings,theme:value}}))}><Icon size={18}/>{name}</button>)}</div>
      <h3 className="field-label spaced">YEDEKLEME</h3><p className="muted">{isAndroidApp?'Kayıtlarınız yalnızca bu uygulamanın cihazdaki alanında saklanır. Uygulamayı kaldırmak veya uygulama verilerini temizlemek kayıtlarınızı siler. JSON yedeğini uygulama dışında saklayın.':'Kayıtlarınız yalnızca bu tarayıcıda saklanır. Tarayıcı verilerini silmek veya uygulamayı farklı bir adresten açmak kayıtlarınıza erişimi kaybettirebilir. Düzenli yedek alın.'}</p>
      <button className="action-line" onClick={exportData}><Download size={20}/><span>JSON yedeğini indir<small>Bütün kayıtlar ve ayarlar</small></span><ArrowUpRight size={17}/></button>
      <label className="action-line file-label"><Upload size={20}/><span>Yedekten geri yükle<small>Dosya önce kontrol edilir</small></span><ArrowUpRight size={17}/><input type="file" accept="application/json,.json" aria-label="JSON yedeği seç" onChange={e=>{importFile(e.target.files?.[0]);e.target.value='';}}/></label>
      <h3 className="field-label spaced">TELEFONDA KULLANIM</h3><p className="muted">{isAndroidApp?'Uygulamanın bütün dosyaları telefonunuzda. İlk açılış dahil internet, üyelik veya sunucu bağlantısı gerekmez. Güncelleme için yeni APK dosyasını mevcut uygulamanın üzerine kurun.':<>{offlineReady?'Çevrimdışı kullanım hazır.':'İlk yükleme tamamlandığında çevrimdışı kullanım hazırlanır.'} Android Chrome menüsünden “Ana ekrana ekle” veya “Uygulamayı yükle” seçeneğini kullanın.</>}</p>
      {!isAndroidApp&&install&&<button className="primary" onClick={async()=>{if(askInstall){await askInstall.prompt();await askInstall.userChoice;askInstall=null;setInstall(false);}}}>Telefona kur <ArrowUpRight size={17}/></button>}
      {!isAndroidApp&&update&&<button className="primary" disabled={busy} onClick={()=>updateSW(true)}>Yeni sürümü aç · kayıtlar korunur</button>}
      {!isAndroidApp&&<button className="text-button spaced" onClick={async()=>{const granted=await navigator.storage?.persist?.();setToast(granted?'Kalıcı depolama izni alındı':'Tarayıcı mevcut depolama politikasını kullanıyor');}}>Kalıcı depolama izni iste <CircleHelp size={15}/></button>}
      <p className="settings-foot">Sürüm {isAndroidApp?'1.1 · Android':'1.0'} · Europe/Istanbul<br/>Hesap, bulut veritabanı ve izleme yok.</p>
    </Modal>}
    {restore&&<Modal title="Yedeği geri yükle" subtitle="Dosya kontrol edildi." close={()=>setRestore(null)}><p>{restore.entries.length} günlük faaliyet, {restore.books.length} kitap, {restore.videos.length} video ve {restore.sessions.length} araştırma dönemi.</p><p className="muted">Bu cihazdaki mevcut defterin tamamı, seçtiğiniz yedekle değiştirilecek. Önce mevcut defterinizi indirebilirsiniz.</p><button className="secondary" onClick={exportData}><Download size={17}/> Mevcut defteri yedekle</button><button className="primary spaced" disabled={busy} onClick={async()=>{const restored=D.reconcile(restore,day);if(await save(()=>restored,'Yedek geri yüklendi')){setRestore(null);setSettings(false);setEdit(null);}}}>Onaylıyorum, geri yükle</button></Modal>}
  </div>;
}

type Save=(fn:(s:D.State)=>D.State,message?:string)=>Promise<boolean>;
function EntryEditor({s,day,edit,busy,save,close}:{s:D.State;day:string;edit:{activity:D.Activity;date:string};busy:boolean;save:Save;close:()=>void}){
  const {activity:a,date}=edit,e=s.entries.find(e=>e.date===date&&e.activity===a),past=date<day;
  const [value,setValue]=useState(e?.value?.toString()??''),[note,setNote]=useState(e?.note??''),[title,setTitle]=useState(''),[mode,setMode]=useState<'entry'|'book'|'video'|'program'|'close'>('entry'),[localError,setLocalError]=useState('');
  const b=D.activeBook(s),v=D.activeVideo(s,day),r=D.activeSession(s),status=r?D.researchStatus(r,day):null;
  const needContext=!e&&((a==='book'&&!b)||(a==='mind'&&!v)||(a==='web'&&!r));
  const effectiveMode=mode==='entry'&&needContext?(a==='book'?'book':a==='mind'?'video':'program'):mode;
  const refId=e?.refId??(a==='book'?b?.id:a==='mind'?v?.id:a==='web'?r?.id:undefined);
  const handleSave=async(ev:React.FormEvent)=>{ev.preventDefault();setLocalError('');if(past&&!e){setLocalError('Geçmiş güne yeni faaliyet eklenemez.');return;}const current=D.today()<s.settings.lastSeen?s.settings.lastSeen:D.today();if(date!==current&&!e){setLocalError('Gün değişti. Bugünün ekranından yeni kayıt açın.');return;}
    if(await save(x=>D.saveEntry(x,date,a,{value:a==='calories'||a==='steps'?Number(value):undefined,note:note.trim()||undefined,refId},current)))close();};
  const addContext=async(ev:React.FormEvent)=>{ev.preventDefault();const t=title.trim();if(!t)return;const ok=await save(x=>effectiveMode==='book'?D.selectBook(x,t,day):effectiveMode==='video'?D.selectVideo(x,t,day):D.startResearch(x,t,day),'Seçim saklandı');if(ok){setTitle('');setMode('entry');}};
  return <Modal title={D.labels[a]} subtitle={`${D.pretty(date,{day:'numeric',month:'long',year:'numeric'})}${past?' · Geçmiş kaydı düzelt':''}`} close={close}>
    {localError&&<p role="alert" className="error">{localError}</p>}
    {past&&e&&<p className="context-box">{D.entryContext(s,e)||'Mevcut kayıt'}<small>Bu düzeltme yeni bir faaliyet oluşturmaz; kaydın tarihi ve ilişkisi korunur.</small></p>}
    {['book','video','program'].includes(effectiveMode)&&!past?<form onSubmit={addContext}><p className="muted">{effectiveMode==='book'?'Kitabın adı her gün satırınızda kalır. Okuma kaydı ayrıca işaretlenir.':effectiveMode==='video'?'Konu, pazar başlayan bu hafta boyunca görünür. Günlük kayıt ayrıca işaretlenir.':'İlk gün bugün. İlk dönem 7 takvim günü, devam ederseniz en fazla 14 gün.'}</p><label className="field-label">{effectiveMode==='book'?'KİTAP ADI':effectiveMode==='video'?'VİDEO VEYA KONU':'PROGRAM ADI'}<input autoFocus required maxLength={200} list={effectiveMode==='program'?'programs':undefined} value={title} onChange={e=>setTitle(e.target.value)} placeholder={effectiveMode==='book'?'Örn. Sapiens':effectiveMode==='video'?'Örn. Özgüvenin Psikolojisi':'Örn. Lightspeed'}/></label>{effectiveMode==='program'&&<datalist id="programs">{s.programs.map(p=><option key={p.id} value={p.name}/>)}</datalist>}<button disabled={busy} className="primary" type="submit">{effectiveMode==='program'?'Dönemi başlat':'Seçimi kaydet'} <ArrowRight size={17}/></button><button type="button" className="text-button later" onClick={close}>Daha sonra seçerim</button></form>:
    effectiveMode==='close'&&r?<form onSubmit={async ev=>{ev.preventDefault();if(await save(x=>status?.needsDecision?D.decideResearch(x,day,false,note):D.closeResearch(x,day,note),'Araştırma dönemi kapandı')){setMode('program');setTitle('');setNote('');}}}><p className="muted">Bulgusuz çıkmak da serbest. Bu dönem geçmişte saklanır; günlük kayıtlar korunur.</p><label className="field-label">KISA NOT · İSTEĞE BAĞLI<textarea autoFocus maxLength={500} value={note} onChange={e=>setNote(e.target.value)} placeholder="Bu dönemden kalan bir cümle…"/></label><button disabled={busy} className="primary" type="submit">Dönemi kapat</button><button className="text-button later" type="button" onClick={()=>setMode('entry')}>Geri dön</button></form>:
    <>
      {!past&&a==='web'&&status?.needsDecision?<div className="decision"><h3>Yedi günlük dönem tamamlandı.</h3><p>{s.programs.find(p=>p.id===r?.programId)?.name} için ikinci yedi güne devam etmek ister misiniz? Üst sınır {D.pretty(D.addDays(r!.startedOn,13))}.</p><button className="primary" disabled={busy} onClick={()=>save(x=>D.decideResearch(x,day,true),'İkinci dönem açıldı')}>İkinci yedi güne devam et</button><button className="secondary" onClick={()=>{setMode('close');setNote('');}}>Dönemi kapat</button></div>:<form onSubmit={handleSave}>
        {!past&&['book','mind','web'].includes(a)&&<p className="context-box">{e?D.entryContext(s,e):a==='book'?b?.title:a==='mind'?v?.title:s.programs.find(p=>p.id===r?.programId)?.name}<small>{e?'Bugünkü kaydın bağlamı':a==='book'?'Açık kitabınız':a==='mind'?`${D.pretty(D.weekStart(day))} haftasının konusu`:`${status?.day}. gün · ${r?.extended?'İkinci':'İlk'} yedi günlük dönem`}</small></p>}
        {(a==='calories'||a==='steps')?<label className="field-label">{a==='calories'?'GÜNLÜK TOPLAM · KCAL':'GÜNLÜK TOPLAM · ADIM'}<input type="number" inputMode="numeric" min="0" max="10000000" step="1" autoFocus required value={value} onChange={e=>setValue(e.target.value)} placeholder={a==='calories'?'2350':'8642'}/></label>:a==='training'?<><label className="field-label">KISA AÇIKLAMA · İSTEĞE BAĞLI<textarea autoFocus maxLength={500} value={note} onChange={e=>setNote(e.target.value)} placeholder="Bugün nasıl hareket ettin?"/></label><div className="chips">{['Güç','Mobilite','Kondisyon'].map(t=><button type="button" key={t} className={note===t?'selected':''} onClick={()=>setNote(t)}>{t}</button>)}</div></>:<p className="muted">{a==='english'?'İzlemek, konuşmak, okumak… Pratiğe dokunduğun günü kaydet.':a==='book'?'Sayfa ve dakika hesabı yok. Bugün okuduğunu kaydet.':a==='mind'?'İzleme, tartışma, araştırma veya ödev. Konuya dokunduğun günü kaydet.':'Bugün bu programa çalıştığını kaydet.'}</p>}
        <button type="submit" disabled={busy||(!e&&past)} className="primary"><Check size={17}/>{e?'Düzeltmeyi kaydet':'Bugüne kaydet'}</button>
      </form>}
      {e&&<button disabled={busy} className="text-button remove-entry" onClick={async()=>{if(confirm('Bu mevcut günlük kaydı kaldırmak istiyor musunuz?')&&await save(x=>D.removeEntry(x,e),'Kayıt kaldırıldı'))close();}}>Bu kaydı kaldır</button>}
      {!past&&((a==='book'&&!b)||(a==='mind'&&!v)||(a==='web'&&!r))&&<div className="lifecycle"><button className="action-line" onClick={()=>{setMode(a==='book'?'book':a==='mind'?'video':'program');setTitle('');}}><Plus size={18}/><span>{a==='book'?'Yeni kitap seç':a==='mind'?'Yeni video veya konu seç':'Yeni araştırma dönemi başlat'}<small>Mevcut günlük kaydın ilişkisi korunur</small></span><ArrowUpRight size={16}/></button></div>}
      {!past&&a==='book'&&b&&<div className="lifecycle"><span>KİTABIN YAŞAM DÖNGÜSÜ</span><button className="action-line" disabled={busy} onClick={async()=>{if(await save(x=>D.finishBook(x,day),'Kitabın bitiş tarihi saklandı')){setMode('book');setTitle('');}}}><BookOpen size={18}/><span>Kitabı bitirdim<small>Günlük okuma kaydından bağımsız</small></span><ArrowUpRight size={16}/></button></div>}
      {!past&&a==='mind'&&v&&<div className="lifecycle"><span>BU HAFTANIN KONUSU</span><button className="action-line" disabled={busy} onClick={async()=>{if(await save(x=>D.finishVideo(x,day),'Video bitişi saklandı')){setMode('video');setTitle('');}}}><Brain size={18}/><span>Videoyu bitirdim<small>Bu hafta yeni bir konu seçebilirsin</small></span><ArrowUpRight size={16}/></button></div>}
      {!past&&a==='web'&&r&&!status?.needsDecision&&<div className="lifecycle"><span>ARAŞTIRMA DÖNEMİ</span><button className="action-line" onClick={()=>{setMode('close');setNote('');}}><Code2 size={18}/><span>Dönemi kapat / program değiştir<small>Bir cümlelik not bırakabilirsin</small></span><ArrowUpRight size={16}/></button></div>}
    </>}
  </Modal>;
}

function Modal({title,subtitle,children,close}:{title:string;subtitle:string;children:React.ReactNode;close:()=>void}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';const el=ref.current;const first=el?.querySelector<HTMLElement>('input:not([type=file]),textarea')??el?.querySelector<HTMLElement>('button');first?.focus();const onKey=(ev:KeyboardEvent)=>{if(ev.key==='Escape'){ev.preventDefault();close();}if(ev.key==='Tab'){const items=Array.from(el?.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,select,[tabindex="0"]')??[]).filter(x=>x.getClientRects().length);const first=items[0],last=items[items.length-1];if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last?.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first?.focus();}}};document.addEventListener('keydown',onKey);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',onKey);previous?.focus();};},[]);
  return <div className="modal-backdrop" onMouseDown={ev=>{if(ev.target===ev.currentTarget)close();}}><div className="sheet" ref={ref} role="dialog" aria-modal="true" aria-label={title}><div className="sheet-grip"/><div className="sheet-top"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" aria-label="Pencereyi kapat" onClick={close}><X size={22}/></button></div>{children}</div></div>;
}
function Empty({text}:{text:string}){return <div className="empty"><Compass size={30} strokeWidth={1}/><p>{text}</p></div>;}
function Weekly({s,start,day}:{s:D.State;start:string;day:string}){
  const end=D.addDays(start,6),r=D.report(s,start,end);
  return <><div className="report-stats"><div><span>ORTALAMA KALORİ</span><strong>{fmt(r.calories.average)} <small>kcal</small></strong><p>{r.calories.count} kayıt üzerinden</p></div><div><span>ORTALAMA ADIM</span><strong>{fmt(r.steps.average)}</strong><p>{r.steps.count} kayıt üzerinden · toplam {fmt(r.steps.count?r.steps.total:null)}</p></div></div>
    <p className="report-explainer">Pazar–cumartesi. Eksik kayıtlar ortalamaya katılmaz. “—” kayıt yok demektir.{day>=start&&day<end?' Bu hafta henüz devam ediyor.':''}</p>
    <h3 className="field-label spaced">GÜN GÜN FAALİYETLER</h3><div className="table-scroll"><table className="matrix"><thead><tr><th>Faaliyet</th>{D.range(start,end).map(d=><th key={d}>{D.pretty(d,{weekday:'short'})}<small>{D.pretty(d,{day:'2-digit',month:'2-digit'})}</small></th>)}</tr></thead><tbody>{D.activities.map(a=><tr key={a}><th>{D.labels[a]}</th>{D.range(start,end).map(d=>{const e=r.entries.find(e=>e.date===d&&e.activity===a);return <td key={d} className={d>day?'future':''}>{e?.value!==undefined?fmt(e.value):e?<Check size={15} aria-label="Kaydedildi"/>:'—'}</td>;})}</tr>)}</tbody></table></div>
    <div className="report-details">{D.activities.filter(a=>a!=='calories'&&a!=='steps').map(a=><section key={a}><div className="section-title"><h3>{D.labels[a]}</h3><span>{r.count(a)} gün</span></div>{r.entries.filter(e=>e.activity===a).sort((a,b)=>a.date.localeCompare(b.date)).map(e=><p key={e.id}><time>{D.pretty(e.date,{weekday:'short',day:'numeric'})}</time><span>{D.entryContext(s,e)||'Kaydedildi'}</span></p>)}{!r.count(a)&&<p className="muted">Bu hafta kayıt yok.</p>}</section>)}</div>
  </>;
}
function Monthly({s,date}:{s:D.State;date:string}){
  const weeks=D.monthlyWeeks(s,date),start=D.monthStart(date),end=D.monthEnd(date),books=s.books.filter(b=>b.finishedOn&&b.finishedOn>=start&&b.finishedOn<=end),sessions=s.sessions.filter(r=>r.startedOn<=end&&(!r.endedOn||r.endedOn>=start));
  return <><p className="report-explainer">Haftalar pazar başlar. Ay sınırındaki haftalarda yalnızca bu aya ait günler hesaplanır. Kayıt olmayan günler sıfır sayılmaz.</p><div className="table-scroll"><table><thead><tr><th>Bu aydaki günler</th><th>Kalori ort.</th><th>Adım ort.</th>{D.activities.slice(2).map(a=><th key={a}>{D.labels[a]}</th>)}</tr></thead><tbody>{weeks.map(w=><tr key={w.start}><th>{D.pretty(w.start)}<small>{D.pretty(w.end)} tarihine kadar</small></th><td>{fmt(w.calories.average)}<small>{w.calories.count} kayıt</small></td><td>{fmt(w.steps.average)}<small>{w.steps.count} kayıt</small></td>{D.activities.slice(2).map(a=><td key={a}>{w.count(a)} gün</td>)}</tr>)}</tbody></table></div><div className="report-details"><section><h3>Bitirilen kitaplar</h3>{books.map(b=><p key={b.id}><time>{D.pretty(b.finishedOn!)}</time><span>{b.title}</span></p>)}{!books.length&&<p className="muted">Bu ay bitirilen kitap yok.</p>}</section><section><h3>Araştırılan programlar</h3>{sessions.map(r=><div className="monthly-session" key={r.id}><strong>{s.programs.find(p=>p.id===r.programId)?.name}</strong><p>{D.pretty(r.startedOn)} — {r.endedOn?D.pretty(r.endedOn):'Açık'}</p>{r.endedOn&&r.endedOn>=start&&r.endedOn<=end&&<p className="muted">{r.note||'Not yok.'}</p>}</div>)}{!sessions.length&&<p className="muted">Bu ay araştırma dönemi yok.</p>}</section></div></>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
