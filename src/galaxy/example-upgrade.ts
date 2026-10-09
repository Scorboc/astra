import type { SessionStore } from '../persistence.ts';
import { EXPEDITION_KEY,saveExpedition,loadExpedition } from './expedition-storage.ts';
import { exampleAccountSnapshot } from './example-account.ts';
export const MONTH_FIXTURE='astra-example-month-v1';
export const MONTH_BACKUP='astra-before-example-month-v1';
export function ensureExampleMonth(store:SessionStore,day?:string){
  if(store.getItem(MONTH_FIXTURE)==='ready')return;
  const old=store.getItem(EXPEDITION_KEY);
  if(old&&!store.getItem(MONTH_BACKUP))store.setItem(MONTH_BACKUP,old);
  const snapshot=exampleAccountSnapshot(day);
  if(saveExpedition(store,snapshot,true)!=='saved'||!loadExpedition(store).snapshot)throw new Error('Не удалось сохранить пример за месяц. Предыдущая копия сохранена отдельно.');
  store.setItem(MONTH_FIXTURE,'ready');
}
