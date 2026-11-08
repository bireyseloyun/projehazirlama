import { openDB, type IDBPDatabase } from 'idb';
import { emptyState, validateState, type State } from './domain';
const stores=['DailyEntries','Books','WeeklyVideoSelections','Programs','ResearchSessions','AppSettings'] as const;
const keys=['entries','books','videos','programs','sessions','settings'] as const;
let dbPromise: Promise<IDBPDatabase> | undefined;
export function database(){return dbPromise??=openDB('eylem-pusulasi',1,{
  upgrade(db){for(const name of stores) if(!db.objectStoreNames.contains(name)) db.createObjectStore(name,{keyPath:'id'});},
  blocking(){dbPromise?.then(db=>db.close());dbPromise=undefined;}
});}
export async function loadState(): Promise<State> { const db=await database(),tx=db.transaction([...stores],'readonly');const values=await Promise.all(stores.map(n=>tx.objectStore(n).getAll()));await tx.done;if(!values[5].length)return emptyState();return validateState(Object.fromEntries(keys.map((k,i)=>[k,i===5?values[i][0]:values[i]]))); }
export async function persistState(s: State) { const valid=validateState(s),db=await database(),tx=db.transaction([...stores],'readwrite');for(let i=0;i<stores.length;i++){const store=tx.objectStore(stores[i]);await store.clear();const items=i===5?[valid.settings]:valid[keys[i]] as {id:string}[];for(const item of items)await store.put(item);}await tx.done; }
export async function closeDatabase(){if(dbPromise)(await dbPromise).close();dbPromise=undefined;}
