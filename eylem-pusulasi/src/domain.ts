import { z } from 'zod';

export const activities = ['calories', 'steps', 'training', 'book', 'mind', 'web', 'english'] as const;
export type Activity = typeof activities[number];
export const labels: Record<Activity, string> = { calories: 'Kalori', steps: 'Adım', training: 'Antrenman', book: 'Kitap', mind: 'Zihin Kodlama', web: 'Web2 / Hackle', english: 'İngilizce' };
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v, 'Geçersiz tarih');
const id = z.string().min(1).max(100);
const title = z.string().trim().min(1).max(200);
const note = z.string().max(500);
export const entrySchema = z.object({ id, date, activity: z.enum(activities), value: z.number().int().nonnegative().max(10000000).optional(), note: note.optional(), refId: id.optional(), updatedAt: z.string().datetime() }).strict();
const bookSchema = z.object({ id, title, startedOn: date, finishedOn: date.optional() }).strict();
const videoSchema = z.object({ id, title, week: date, selectedOn: date, finishedOn: date.optional() }).strict();
const programSchema = z.object({ id, name: title }).strict();
const sessionSchema = z.object({ id, programId: id, startedOn: date, extended: z.boolean(), endedOn: date.optional(), note: note.optional(), reason: z.enum(['early','declined','expired','changed']).optional() }).strict();
export const stateSchema = z.object({
  entries: z.array(entrySchema).max(250000), books: z.array(bookSchema).max(50000), videos: z.array(videoSchema).max(50000), programs: z.array(programSchema).max(50000), sessions: z.array(sessionSchema).max(50000),
  settings: z.object({ id: z.literal('app'), theme: z.enum(['light', 'dark', 'system']), lastSeen: date, schemaVersion: z.literal(1) }).strict()
}).strict();
export type State = z.infer<typeof stateSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type Book = State['books'][number];
export type Video = State['videos'][number];
export type Session = State['sessions'][number];
export const uid = () => crypto.randomUUID();
export function today(now = new Date()): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return `${p.find(x=>x.type==='year')!.value}-${p.find(x=>x.type==='month')!.value}-${p.find(x=>x.type==='day')!.value}`;
}
export const addDays = (d: string, n: number) => new Date(Date.parse(d+'T12:00:00Z') + n*86400000).toISOString().slice(0,10);
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b)-Date.parse(a))/86400000);
export const weekStart = (d: string) => addDays(d, -new Date(d+'T12:00:00Z').getUTCDay());
export const monthStart = (d: string) => d.slice(0,7)+'-01';
export const monthEnd = (d: string) => new Date(Date.UTC(Number(d.slice(0,4)),Number(d.slice(5,7)),0)).toISOString().slice(0,10);
export const shiftMonth = (d: string, n: number) => new Date(Date.UTC(Number(d.slice(0,4)), Number(d.slice(5,7))-1+n, 1)).toISOString().slice(0,10);
export const range = (start: string, end: string) => Array.from({length: Math.max(0,daysBetween(start,end)+1)},(_,i)=>addDays(start,i));
export function pretty(d: string, options: Intl.DateTimeFormatOptions = { day:'numeric', month:'long' }) { return new Intl.DateTimeFormat('tr-TR',{...options,timeZone:'Europe/Istanbul'}).format(new Date(d+'T12:00:00Z')); }
export const emptyState = (day = today()): State => ({ entries: [], books: [], videos: [], programs: [], sessions: [], settings: { id:'app', theme:'system', lastSeen:day, schemaVersion:1 } });
export const activeBook = (s: State) => s.books.find(b=>!b.finishedOn);
export const activeVideo = (s: State, d: string) => s.videos.find(v=>v.week===weekStart(d) && !v.finishedOn);
export const activeSession = (s: State) => s.sessions.find(x=>!x.endedOn);
export function reconcile(input: State, day: string): State {
  const s = structuredClone(input);
  // Calendar deadlines are inclusive. Missing the decision does not extend a session.
  for(const r of s.sessions) if(!r.endedOn && day > addDays(r.startedOn,13)) { r.endedOn=addDays(r.startedOn,r.extended?13:6); r.reason='expired'; }
  s.settings.lastSeen = day > s.settings.lastSeen ? day : s.settings.lastSeen;
  return s;
}
export function researchStatus(r: Session, d: string) {
  const day = daysBetween(r.startedOn,d)+1;
  return { day, needsDecision: !r.endedOn && !r.extended && day>=8 && day<=14, canLog: !r.endedOn && day>=1 && day<=(r.extended?14:7) };
}
export function saveEntry(input: State, day: string, activity: Activity, data: Pick<Entry,'value'|'note'|'refId'>, current = today()): State {
  const s=structuredClone(input), existing=s.entries.find(e=>e.date===day && e.activity===activity);
  if(day>current || (day<current && !existing)) throw new Error('Geçmiş güne yeni faaliyet eklenemez.');
  if((activity==='calories'||activity==='steps') && (data.value===undefined || !Number.isSafeInteger(data.value)||data.value<0 || data.value>10000000)) throw new Error('Geçerli bir tam sayı girin.');
  if(activity==='book' && !s.books.some(b=>b.id===(existing?.refId??data.refId))) throw new Error('Önce bir kitap seçin.');
  if(activity==='mind' && !s.videos.some(v=>v.id===(existing?.refId??data.refId))) throw new Error('Önce haftanın konusunu seçin.');
  if(activity==='web' && !existing) { const r=s.sessions.find(r=>r.id===data.refId); if(!r||!researchStatus(r,current).canLog) throw new Error('Önce açık bir araştırma dönemi seçin.'); }
  const entry: Entry={ id:existing?.id??uid(), date:day, activity,...data, refId:existing?.refId??data.refId,updatedAt:new Date().toISOString() };
  if(existing) s.entries[s.entries.indexOf(existing)]=entry; else s.entries.push(entry);
  return s;
}
export function removeEntry(input: State, entry: Entry): State { const s=structuredClone(input); s.entries=s.entries.filter(e=>e.id!==entry.id); return s; }
export function selectBook(input: State, title: string, d: string): State { if(activeBook(input)) throw new Error('Önce mevcut kitabı bitirin.'); const s=structuredClone(input); s.books.push({id:uid(),title:title.trim(),startedOn:d}); return s; }
export function finishBook(input: State,d: string): State { const s=structuredClone(input),b=activeBook(s); if(b)b.finishedOn=d; return s; }
export function selectVideo(input: State,title: string,d: string): State { if(activeVideo(input,d)) throw new Error('Önce mevcut videoyu bitirin.'); const s=structuredClone(input); s.videos.push({id:uid(),title:title.trim(),week:weekStart(d),selectedOn:d});return s; }
export function finishVideo(input: State,d: string): State { const s=structuredClone(input),v=activeVideo(s,d);if(v)v.finishedOn=d;return s; }
export function startResearch(input: State,name: string,d: string): State {
  if(activeSession(input)) throw new Error('Önce açık dönemi kapatın.');
  const s=structuredClone(input); let p=s.programs.find(p=>p.name.toLocaleLowerCase('tr')===name.trim().toLocaleLowerCase('tr'));
  if(!p){p={id:uid(),name:name.trim()};s.programs.push(p);} s.sessions.push({id:uid(),programId:p.id,startedOn:d,extended:false});return s;
}
export function closeResearch(input: State,d: string,note='',reason: Session['reason']='early'): State { const s=structuredClone(input),r=activeSession(s); if(r){r.endedOn=d;r.note=note.trim();r.reason=reason;}return s; }
export function decideResearch(input: State,d: string,extend: boolean,note=''): State {
  const s=structuredClone(input),r=activeSession(s); if(!r||!researchStatus(r,d).needsDecision) throw new Error('Bu dönem için devam kararı beklenmiyor.');
  if(extend) r.extended=true;else{r.endedOn=addDays(r.startedOn,6);r.note=note;r.reason='declined';}return s;
}
export function entryContext(s: State,e: Entry) { if(e.activity==='book')return s.books.find(x=>x.id===e.refId)?.title??'';if(e.activity==='mind')return s.videos.find(x=>x.id===e.refId)?.title??'';if(e.activity==='web'){const r=s.sessions.find(x=>x.id===e.refId);return s.programs.find(x=>x.id===r?.programId)?.name??'';}return e.note??''; }
export function report(s: State,start: string,end: string) {
  const entries=s.entries.filter(e=>e.date>=start&&e.date<=end);
  const numbers=(a:Activity)=>{const v=entries.filter(e=>e.activity===a&&e.value!==undefined).map(e=>e.value!);return {count:v.length,total:v.reduce((a,b)=>a+b,0),average:v.length?v.reduce((a,b)=>a+b,0)/v.length:null};};
  return {entries,calories:numbers('calories'),steps:numbers('steps'),count:(a:Activity)=>entries.filter(e=>e.activity===a).length};
}
export function monthlyWeeks(s: State,d: string) { const start=monthStart(d),end=monthEnd(d); const weeks=[];for(let w=weekStart(start);w<=end;w=addDays(w,7)){const from=w<start?start:w,to=addDays(w,6)>end?end:addDays(w,6);weeks.push({start:from,end:to,...report(s,from,to)});}return weeks; }
export function validateState(value: unknown): State {
  const s=stateSchema.parse(value);
  for(const collection of [s.entries,s.books,s.videos,s.programs,s.sessions]) if(new Set(collection.map(x=>x.id)).size!==collection.length)throw new Error('Tekrarlanan kimlik.');
  if(new Set(s.entries.map(e=>e.date+e.activity)).size!==s.entries.length)throw new Error('Tekrarlanan günlük kayıt.');
  if(s.books.filter(b=>!b.finishedOn).length>1||s.sessions.filter(r=>!r.endedOn).length>1)throw new Error('Birden fazla açık dönem.');
  const videoWeeks=s.videos.filter(v=>!v.finishedOn).map(v=>v.week);if(new Set(videoWeeks).size!==videoWeeks.length)throw new Error('Haftada birden fazla aktif video.');
  for(const b of s.books)if(b.finishedOn&&b.finishedOn<b.startedOn)throw new Error('Kitap tarihleri tutarsız.');
  for(const v of s.videos)if(weekStart(v.selectedOn)!==v.week||(v.finishedOn&&v.finishedOn<v.selectedOn))throw new Error('Video tarihleri tutarsız.');
  for(const r of s.sessions)if(!s.programs.some(p=>p.id===r.programId)||(r.endedOn&&(r.endedOn<r.startedOn||r.endedOn>addDays(r.startedOn,r.extended?13:6))))throw new Error('Araştırma ilişkisi veya tarihleri tutarsız.');
  for(const e of s.entries){
    if((e.activity==='calories'||e.activity==='steps')&&e.value===undefined)throw new Error('Sayısal değer eksik.');
    if(e.activity==='book'){const b=s.books.find(b=>b.id===e.refId);if(!b||e.date<b.startedOn||(b.finishedOn&&e.date>b.finishedOn))throw new Error('Kitap ilişkisi tutarsız.');}
    if(e.activity==='mind'){const v=s.videos.find(v=>v.id===e.refId);if(!v||e.date<v.selectedOn||weekStart(e.date)!==v.week||(v.finishedOn&&e.date>v.finishedOn))throw new Error('Video ilişkisi tutarsız.');}
    if(e.activity==='web'){const r=s.sessions.find(r=>r.id===e.refId);if(!r||e.date<r.startedOn||e.date>(r.endedOn??addDays(r.startedOn,r.extended?13:6)))throw new Error('Araştırma ilişkisi tutarsız.');}
  }return s;
}
export function makeBackup(s: State) { return JSON.stringify({format:'eylem-pusulasi',version:1,exportedAt:new Date().toISOString(),data:validateState(s)},null,2); }
export function parseBackup(text: string): State { if(text.length>25000000)throw new Error('Yedek çok büyük.');const b=z.object({format:z.literal('eylem-pusulasi'),version:z.literal(1),exportedAt:z.string().datetime(),data:z.unknown()}).strict().parse(JSON.parse(text));return validateState(b.data); }
