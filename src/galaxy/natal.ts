import { Body,GeoVector,Ecliptic,MakeTime,Vector,RotateVector,Rotation_EQD_ECT,Rotation_ECT_EQD,SiderealTime } from 'astronomy-engine';
import type { Birth } from './research.ts';
const rad=Math.PI/180;
export const norm=(x:number)=>(x%360+360)%360;
export const SIGNS=['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
const BODIES:[[Body,string],...[Body,string][]]=[[Body.Sun,'Солнце'],[Body.Moon,'Луна'],[Body.Mercury,'Меркурий'],[Body.Venus,'Венера'],[Body.Mars,'Марс'],[Body.Jupiter,'Юпитер'],[Body.Saturn,'Сатурн'],[Body.Uranus,'Уран'],[Body.Neptune,'Нептун'],[Body.Pluto,'Плутон']];
export function zodiac(longitude:number){const n=norm(longitude);return `${SIGNS[Math.floor(n/30)]} ${(n%30).toFixed(2)}°`;}
export function calculateNatal(utc:string,latitude:number,longitude:number){
 const date=new Date(utc);if(!Number.isFinite(date.getTime())||!Number.isFinite(latitude)||Math.abs(latitude)>=66||!Number.isFinite(longitude)||Math.abs(longitude)>180)throw new Error('Нужны корректные дата и координаты; полярные широты пока не поддерживаются.');
 const time=MakeTime(date),lst=(SiderealTime(time)*15+longitude)*rad,lat=latitude*rad;
 const zenith=RotateVector(Rotation_EQD_ECT(time),new Vector(Math.cos(lat)*Math.cos(lst),Math.cos(lat)*Math.sin(lst),Math.sin(lat),time));
 let asc=norm(Math.atan2(zenith.x,-zenith.y)/rad);
 const test=RotateVector(Rotation_ECT_EQD(time),new Vector(Math.cos(asc*rad),Math.sin(asc*rad),0,time));
 if(-Math.sin(lst)*test.x+Math.cos(lst)*test.y<0)asc=norm(asc+180);
 const planets=BODIES.map(([body,name])=>{const lon=Ecliptic(GeoVector(body,date,true)).elon;return {name,longitude:lon,house:Math.floor(norm(lon-asc)/30)+1,retrograde:norm(Ecliptic(GeoVector(body,new Date(+date+3600000),true)).elon-lon+180)-180<0};});
 const aspects:{a:string;b:string;name:string;orb:number}[]=[];
 for(let i=0;i<planets.length;i++)for(let j=i+1;j<planets.length;j++){
  const delta=Math.abs(norm(planets[i].longitude-planets[j].longitude+180)-180);
  for(const [angle,name] of [[0,'Соединение'],[60,'Секстиль'],[90,'Квадрат'],[120,'Тригон'],[180,'Оппозиция']] as const)if(Math.abs(delta-angle)<=6)aspects.push({a:planets[i].name,b:planets[j].name,name,orb:Math.abs(delta-angle)});
 }
 return {utc:date.toISOString(),latitude,longitude,asc,planets,aspects,houses:Array.from({length:12},(_,i)=>norm(asc+i*30))};
}
// Explicit, reviewed fixture location/time: no guessing location from arbitrary text.
export function exampleNatal(b:Birth|null){
 if(!b||b.date!=='1992-05-14'||b.time!=='09:30'||b.accuracy!=='exact'||b.place!=='Казань, Республика Татарстан, Россия')return null;
 const utc='1992-05-14T05:30:00Z';
 const wall=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(utc));
 if(wall!=='09:30')throw new Error('Не удалось подтвердить исторический часовой пояс.');
 return calculateNatal(utc,55.7961,49.1064);
}
