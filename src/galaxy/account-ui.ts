import { createAccounts,accountStore } from './accounts';
import { ensureExampleMonth } from './example-upgrade';
import type { SessionStore } from '../persistence';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const local:SessionStore={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v),removeItem:k=>localStorage.removeItem(k)};
const session:SessionStore={getItem:k=>sessionStorage.getItem(k),setItem:(k,v)=>sessionStorage.setItem(k,v),removeItem:k=>sessionStorage.removeItem(k)};
export const accounts=createAccounts(local,session);
export const activeAccount=accounts.current();
const returnKey='astra.auth-return';
export function rememberAccountRoute(route:string){try{sessionStorage.setItem(returnKey,route);}catch{/* Sign-in still works without session storage. */}}
function accountReturn(){try{const route=sessionStorage.getItem(returnKey);sessionStorage.removeItem(returnKey);return route&&/^(today|astrology|forecast|astro-checks|results|journal|plan|profile|birth|birth-review|wishes|wishes-review|rhythm|review|memories|research(?:\/\d{4}-\d{2}-\d{2})?|planet\/(?:origin|aurora|velir|nereya|solis))$/.test(route)?route:'today';}catch{return 'today';}}
export const profileStore=activeAccount?accountStore(local,activeAccount.id):local;
export let exampleUpgradeError='';
if(activeAccount?.example&&activeAccount.login==='1')try{ensureExampleMonth(profileStore);}catch(e){exampleUpgradeError=e instanceof Error?e.message:'Не удалось подготовить пример.';}

export function accountSummary(){return activeAccount?`<section class="account-summary"><strong>${esc(activeAccount.name)}</strong><p>Логин: ${esc(activeAccount.login)}${activeAccount.example?' · тестовый профиль':''}</p><button class="text-button" data-account-logout>Выйти из аккаунта</button></section>`:'<p>Войди, чтобы открыть свой профиль.</p><a class="primary" href="#login">Войти</a><a class="text-button" href="#register">Создать аккаунт</a>';}
export function mountAccountUI(root:HTMLElement,panel:(t:string,k:string,b:string)=>void){
  root.addEventListener('click',e=>{if(!(e.target as Element).closest('[data-account-logout]'))return;e.preventDefault();e.stopImmediatePropagation();accounts.logout();location.replace(location.pathname+'#login');location.reload();},true);
  root.addEventListener('submit',async e=>{
    const form=e.target as HTMLFormElement;if(form.id!=='account-form')return;e.preventDefault();e.stopImmediatePropagation();
    const button=form.querySelector<HTMLButtonElement>('[type=submit]')!;if(button.disabled)return;button.disabled=true;
    const error=form.querySelector<HTMLElement>('[role=alert]')!,f=new FormData(form);error.textContent='';
    try{
      const password=String(f.get('password')??''),register=form.dataset.mode==='register';
      if(register&&password!==f.get('confirmation'))throw new Error('Пароли не совпадают.');
      const account=register?await accounts.register(String(f.get('login')),password,String(f.get('name'))):await accounts.login(String(f.get('login')),password);
      const store=accountStore(local,account.id);
      if(account.example&&account.login==='1')ensureExampleMonth(store);
      accounts.activate(account);location.replace(location.pathname+'#'+(register?'welcome':accountReturn()));location.reload();
    }catch(reason){error.textContent=reason instanceof Error?reason.message:'Не удалось войти. Повтори попытку.';error.focus();button.disabled=false;}
  },true);
  return {render(route:string){
    if(route!=='login'&&route!=='register')return false;
    const register=route==='register';
    panel(register?'Создать аккаунт':'С возвращением','ТВОЯ ЛИЧНАЯ ГАЛАКТИКА',`<p>${register?'Создай аккаунт, затем заполни данные и начни знакомство.':'Войди, чтобы продолжить с того места, где остановился.'}</p><form id="account-form" data-mode="${route}">${register?'<label>Имя<input name="name" maxlength="60" autocomplete="name" required></label>':''}<label>Логин<input name="login" maxlength="40" autocomplete="username" autocapitalize="none" spellcheck="false" required></label><label>Пароль<input type="password" name="password" maxlength="128" ${register?'minlength="8"':''} autocomplete="${register?'new-password':'current-password'}" required></label>${register?'<p class="small-note">Не менее 8 символов.</p><label>Повтори пароль<input type="password" name="confirmation" autocomplete="new-password" required></label>':''}<p role="alert" tabindex="-1"></p><button class="primary wide" type="submit">${register?'Зарегистрироваться':'Войти'}</button></form><p><a class="text-button" href="#${register?'login':'register'}">${register?'Уже есть аккаунт? Войти':'Нет аккаунта? Зарегистрироваться'}</a></p>${register?'':'<details><summary>Открыть заполненный пример</summary><p>Логин <strong>1</strong>, пароль <strong>1</strong>. Профиль, ответы и наблюдения вымышлены.</p></details>'}`);return true;
  }};
}
