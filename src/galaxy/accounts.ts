import type { SessionStore } from '../persistence.ts';

export type Account={id:string;login:string;name:string;salt:string;hash:string;example:boolean};
const KEY='astra-accounts-v1',SESSION='astra-account-session-v1';
const normalize=(s:string)=>s.trim().toLowerCase();
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
async function passwordHash(password:string,salt:string){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:210000},key,256));
}
export function createAccounts(storage:SessionStore,session:SessionStore){
  function all():Account[]{const raw=storage.getItem(KEY);if(!raw)return [];const rows=JSON.parse(raw);if(!Array.isArray(rows)||rows.some(a=>!a||typeof a.id!=='string'||typeof a.login!=='string'||typeof a.hash!=='string'||typeof a.salt!=='string'||typeof a.name!=='string'))throw new Error('Не удалось прочитать аккаунты. Сохранённые данные не изменены.');return rows;}
  function current(){try{const id=session.getItem(SESSION);return all().find(a=>a.id===id)??null;}catch{return null;}}
  async function add(login:string,password:string,name:string,example=false){
    login=normalize(login);name=name.trim();
    if(!/^[\p{L}\p{N}_.@-]{1,40}$/u.test(login))throw new Error('Логин: 1–40 букв, цифр, точек, дефисов или знаков _.');
    if(!name||name.length>60)throw new Error('Укажи имя до 60 символов.');
    if(!example&&(password.length<8||password.length>128))throw new Error('Пароль должен содержать от 8 до 128 символов.');
    if(all().some(a=>a.login===login))throw new Error('Этот логин уже занят.');
    const salt=crypto.randomUUID(),hash=await passwordHash(password,salt);
    const rows=all();if(rows.some(a=>a.login===login))throw new Error('Этот логин уже занят.');
    const account:Account={id:crypto.randomUUID(),login,name,salt,hash,example};
    storage.setItem(KEY,JSON.stringify([...rows,account]));return account;
  }
  return {current,
    async register(login:string,password:string,name:string){if(normalize(login)==='1')throw new Error('Логин 1 занят тестовым профилем. Выбери другой.');return add(login,password,name);},
    async login(login:string,password:string){
      login=normalize(login);let account=all().find(a=>a.login===login);
      if(!account&&login==='1'&&password==='1')account=await add('1','1','Александр · пример',true);
      if(!account||password.length>128||await passwordHash(password,account.salt)!==account.hash)throw new Error('Неверный логин или пароль.');
      return account;
    },
    activate(account:Account){session.setItem(SESSION,account.id);},
    logout(){session.removeItem(SESSION);},
  };
}
export function accountStore(storage:SessionStore,id:string):SessionStore{
  const prefix='astra-account:'+id+':';return {getItem:k=>storage.getItem(prefix+k),setItem:(k,v)=>storage.setItem(prefix+k,v),removeItem:k=>storage.removeItem(prefix+k)};
}
