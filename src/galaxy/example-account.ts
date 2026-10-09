import { newJourney } from './journey.ts';
import { newExpedition,localDay,addDays } from './expedition.ts';
import { newResearch,researchCard,saveResearchAnswer,commitMemories,previousMonthWeeks } from './research.ts';
import type { Snapshot } from './expedition-storage.ts';
import { MONTH_NOTES,MONTH_CHOICES } from './example-month.ts';

export function exampleAccountSnapshot(day=localDay()):Snapshot{
  const journey=newJourney(),expedition=newExpedition(addDays(day,-29));
  let research=newResearch();
  research={...research,step:4,complete:true,
    birth:{date:'1992-05-14',accuracy:'exact',time:'09:30',until:'',place:'Казань, Республика Татарстан, Россия',note:'Вымышленные данные для просмотра интерфейса.'},
    wishes:{original:'Хочу освоить фотографию и проверить идею небольшого проекта. Больше путешествовать.',confirmed:'Освоить фотографию\nПроверить идею небольшого проекта\nБольше путешествовать',preserve:'Работу, время с семьёй и спокойные выходные',avoid:'Кредитов, спешки и обязательного заработка на хобби'},
    rhythm:{kind:'fixed',windows:'Понедельник, среда и пятница: 19:00–19:20',resources:'Телефон с камерой, ноутбук, бесплатные материалы',limits:'До 20 минут за раз; без дополнительных расходов'}};
  research=commitMemories(research,previousMonthWeeks(day).map((week,i)=>({...week,note:['Пробовал снимать город на телефон.','Выбирал бесплатные уроки фотографии.','Обсудил идею проекта с другом.','Выбрал спокойный график занятий.'][i],certainty:'Примерно',source:'RETROSPECTIVE_USER_STATEMENT' as const})));
  for(let i=0;i<30;i++){
    const date=addDays(day,i-29);let card=researchCard(research,date);
    // Fixed interview transcript: keep its original question and response together.
    // This is not evidence that the live question scheduler generated this interview.
    if(card.kind==='question'){
      const preserve=i%4===0;
      card={...card,prompt:preserve?'Когда думаешь о своих желаниях, что особенно важно не потерять?':'Вспомни похожую ситуацию: что ты обычно делал, если первые результаты не радовали?',choices:preserve?['Стабильность','Время с близкими','Свободу в графике','Удовольствие от хобби','Свой вариант','Пока не знаю','Пропустить']:['Менял способ','Просил помощи','Возвращался позже','Терял интерес','По-разному','Не помню','Пропустить']};
      research={...research,answers:[...research.answers,{id:'research-'+date,day:date,kind:'question',prompt:card.prompt,options:[...card.choices],choices:[],note:'',source:'USER_STATEMENT',revision:0,recordedAt:date+'T18:00:00.000Z'}]};
    }
    if(card.kind==='trial')research={...research,trialAccepted:date};
    research=saveResearchAnswer(research,date,MONTH_CHOICES[i],MONTH_NOTES[i],date+'T18:00:00.000Z');
    research={...research,history:research.history.filter(a=>a.revision>0)};
  }
  const revisedDay=addDays(day,-13);
  research=saveResearchAnswer(research,revisedDay,['Стабильность'],MONTH_NOTES[16]+' Уточнение на следующий день: не хочу приравнивать безопасность к отказу от любых перемен.',addDays(revisedDay,1)+'T19:00:00.000Z');
  expedition.research=research;expedition.context={why:'Проверить интерес на практике',support:'Семья и друг',experiment:'Фотография и маленький проект',resources:'20 минут, телефон, ноутбук',barrier:'Нестабильный запас сил',retrospective:'Вымышленный профиль для проверки сайта'};
  return {version:1,journey,expedition};
}
