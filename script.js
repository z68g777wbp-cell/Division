(() => {
"use strict";
const $ = id => document.getElementById(id);
const ui = {
  game:$("game"), result:$("result"), levels:[...document.querySelectorAll(".level")],
  dividend:$("dividend"), divisor:$("divisor"), quotient:$("quotient"), remainder:$("remainder"),
  restLabel:$("restLabel"), dots:$("dots"), modeButtons:$("modeButtons"), share:$("share"), measure:$("measure"),
  palette:$("palette"), keypad:$("keypad"), productRow:$("productRow"), zLabel:$("zLabel"), yLabel:$("yLabel"), product:$("product"), factor:$("factor"),
  leave:$("leave"), score:$("score"), time:$("time"), celebration:$("celebration"), export:$("export"), again:$("again")
};
const COLORS=["#ed7437","#a02b96","#fff000","#42cf61","#67c9ed","#e92727","#0ca95b","#8b65cf","#f3a5bd"];
const state={level:1,task:null,queue:[],index:0,assessed:0,correct:0,wrong:0,records:[],retryQueue:[],sessionId:"",startedAt:0,taskStartedAt:0,mode:null,stage:"chooseMode",target:"quotient",firstTry:true,taskHadError:false,helpUsed:false,finished:false,paintColor:null,inputTimer:null,clearTimer:null,hintTimer:null,timerHandle:null,lastResult:null,roundSeen:new Set()};
function uid(){try{return crypto.randomUUID()}catch{return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`}}
function speak(text){if(!("speechSynthesis"in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="de-AT";u.rate=.92;speechSynthesis.speak(u)}catch{}}
function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function makeTask(level){
 const minDividend=level===1?10:10;
 const maxDividend=level===1?30:99;
 const candidates=[];
 for(let d=2;d<=9;d++){
  for(let q=1;q<=9;q++){
   for(let r=0;r<d;r++){
    const n=d*q+r;
    if(n>=minDividend&&n<=maxDividend)candidates.push({dividend:n,divisor:d,quotient:q,remainder:r,product:d*q});
   }
  }
 }
 const available=candidates.filter(t=>!state.roundSeen.has(`${t.dividend}/${t.divisor}`));
 const pool=available.length?available:candidates;
 const picked=pool[Math.floor(Math.random()*pool.length)];
 state.roundSeen.add(`${picked.dividend}/${picked.divisor}`);
 return {...picked,id:uid(),level,mode:null,assessed:false,retry:false,firstWrong:false,helpUsed:false,attempts:0,startedAt:Date.now(),endedAt:null};
}
function buildQueue(){state.roundSeen=new Set();state.queue=[];while(state.queue.length<20)state.queue.push(makeTask(state.level));state.index=0;state.retryQueue=[]}
function stopTimers(){if(state.inputTimer)clearTimeout(state.inputTimer);if(state.clearTimer)clearTimeout(state.clearTimer);if(state.hintTimer)clearTimeout(state.hintTimer);state.inputTimer=state.clearTimer=state.hintTimer=null}
function startGame(){
 stopTimers();if(state.timerHandle)clearInterval(state.timerHandle);
 state.level=Number(document.querySelector(".level.selected")?.dataset.level||1);ui.game.classList.remove("level-1","level-2","level-3","level-4");ui.game.classList.add(`level-${state.level}`);
 state.sessionId=uid();state.startedAt=Date.now();state.assessed=0;state.correct=0;state.wrong=0;state.records=[];state.finished=false;state.mode=null;state.stage="chooseMode";state.target="quotient";state.lastResult=null;
 buildQueue();ui.result.classList.add("hidden");ui.game.classList.remove("hidden");
 ui.levels.forEach(b=>b.classList.toggle("selected",Number(b.dataset.level)===state.level));
 showTask(state.queue[0]);
}
function showTask(task){
 stopTimers();if(state.finished)return;
 state.task=task;state.taskStartedAt=Date.now();task.startedAt=state.taskStartedAt;state.mode=null;state.firstTry=true;state.taskHadError=!!task.firstWrong;state.helpUsed=false;
 state.stage=state.level<=2?"chooseMode":"findProduct";state.target=state.level>=3?"product":"quotient";
 ui.dividend.textContent=task.dividend;ui.divisor.textContent=task.divisor;
 ui.quotient.value="";ui.remainder.value="";ui.product.value="";
 [ui.quotient,ui.remainder,ui.product,ui.factor].forEach(i=>{if(i)i.classList.remove("correct","incorrect","blink")}); if(ui.factor){ui.factor.value="";ui.factor.disabled=true;ui.factor.classList.add("disabled-look")}
 ui.remainder.classList.add("hidden");ui.restLabel.classList.add("hidden");
 if(state.level===4){ui.quotient.disabled=true;ui.remainder.disabled=true;ui.remainder.classList.remove("hidden");ui.restLabel.classList.remove("hidden");ui.quotient.classList.add("disabled-look");ui.remainder.classList.add("disabled-look");ui.product.disabled=false;ui.product.classList.remove("disabled-look"); if(ui.factor){ui.factor.disabled=true;ui.factor.classList.add("disabled-look");}}
 else {ui.quotient.disabled=state.level===3;ui.remainder.disabled=false;ui.quotient.classList.toggle("disabled-look",state.level===3);ui.remainder.classList.remove("disabled-look");ui.product.disabled=false;ui.product.classList.remove("disabled-look"); if(ui.factor){ui.factor.disabled=true;ui.factor.classList.add("disabled-look");}}
 ui.productRow.classList.toggle("hidden",state.level!==3&&state.level!==4);
 ui.zLabel.textContent="z";ui.yLabel.textContent=task.divisor;
 ui.modeButtons.classList.toggle("hidden",state.level>2);
 ui.share.disabled=false;ui.measure.disabled=false;
 ui.palette.classList.add("hidden");ui.palette.innerHTML="";ui.dots.classList.remove("measure-mode");
 renderDots(task,false);
 if(state.level===3){speak(`Suche das nächstkleinere Malergebnis in der ${task.divisor}er-Reihe.`);state.hintTimer=setTimeout(()=>{if(state.task===task&&state.stage==="findProduct"){const dots=[...ui.dots.querySelectorAll(".dot")];dots.slice(0,task.product).forEach(d=>d.style.backgroundColor="#42cf61");setTimeout(()=>{if(state.task===task&&state.stage==="findProduct")dots.forEach(d=>d.style.backgroundColor="")},1000)}},5000)}
 if(state.level===4)speak(`Suche das nächstkleinere Malergebnis in der ${task.divisor}er-Reihe.`);
}
function renderDots(task,cones){
 ui.dots.innerHTML="";
 for(let i=0;i<task.dividend;i++){
  const dot=document.createElement("button");dot.type="button";dot.className="dot";dot.dataset.index=String(i);dot.setAttribute("aria-label",`Punkt ${i+1}`);dot.draggable=false;
  dot.addEventListener("click",()=>{if(state.level===1&&state.mode==="measure"&&state.paintColor){dot.style.backgroundColor=state.paintColor;dot.dataset.painted=state.paintColor}});
  ui.dots.appendChild(dot);
 }
 if(cones){
  const zone=document.createElement("div");zone.className="cone-zone";zone.style.setProperty("--cone-count",String(task.divisor));zone.setAttribute("aria-label","Kegel");
  for(let i=0;i<task.divisor;i++){
   const column=document.createElement("div");column.className="cone-column";
   const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 50 50");svg.setAttribute("aria-hidden","true");svg.innerHTML='<path d="M25 3 5 43h40z" fill="#111"/><rect x="3" y="43" width="44" height="5" rx="2" fill="#111"/>';
   const drop=document.createElement("div");drop.className="cone-drop";drop.dataset.cone=String(i);
   column.appendChild(svg);column.appendChild(drop);zone.appendChild(column);
  }
  ui.dots.appendChild(zone);
 }
}
function setupPalette(){
 ui.palette.innerHTML="";COLORS.forEach((color,i)=>{const b=document.createElement("button");b.type="button";b.className="paint-brush";b.style.backgroundColor=color;b.setAttribute("aria-label",`Farbe ${i+1}`);b.addEventListener("click",()=>{state.paintColor=color;ui.palette.querySelectorAll("button").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});ui.palette.appendChild(b)});ui.palette.classList.remove("hidden");
}
function chooseMode(mode){
 if(state.finished||state.stage!=="chooseMode")return;
 state.mode=mode;state.task.mode=mode;state.stage="answer";state.target="quotient";ui.modeButtons.classList.add("hidden");ui.quotient.disabled=false;ui.quotient.classList.remove("disabled-look");ui.quotient.classList.add("blink");ui.remainder.disabled=false;ui.remainder.classList.remove("disabled-look");ui.remainder.classList.remove("hidden");ui.restLabel.classList.remove("hidden");
 if(state.level===1){
  renderDots(state.task,mode==="share");
  if(mode==="share")speak("Teile die Punkte gleichmäßig auf.");
  else {setupPalette();ui.dots.classList.add("measure-mode");ui.dots.querySelectorAll(":scope > .dot").forEach(dot=>{dot.style.backgroundColor="#fff";delete dot.dataset.painted});speak(`Tippe immer ${state.task.divisor} Punkte an!`)}
 }else{
  if(state.level===2){
   if(mode==="measure")speak(`Tippe immer ${state.task.divisor} Punkte an!`);
   animateLevelTwo(mode);
  } else {
   animateGroups(mode);
   speak(mode==="share"?"Teile die Punkte gleichmäßig auf.":`Tippe immer ${state.task.divisor} Punkte an!`);
  }
 }
 state.target="quotient";
}
function animateGroups(mode){
 const t=state.task,dots=[...ui.dots.querySelectorAll(".dot")];
 dots.forEach((dot,i)=>{if(i<t.quotient*t.divisor){dot.style.backgroundColor=COLORS[Math.floor(i/t.divisor)%COLORS.length];dot.classList.add("grouped")}else{dot.style.backgroundColor="#fff";dot.classList.add("leftover")}});
}
function animateLevelTwo(mode){
 const t=state.task;
 if(mode==="share"){
  renderDots(t,true);
  const dots=[...ui.dots.querySelectorAll(":scope > .dot")];
  const cones=[...ui.dots.querySelectorAll(".cone-drop")];
  dots.forEach(dot=>{dot.style.backgroundColor="#176483";dot.classList.remove("grouped","leftover")});
  let step=0;
  for(let round=0;round<t.quotient;round++)for(let c=0;c<t.divisor;c++){
   const dot=dots[step++]; if(!dot)continue;
   setTimeout(()=>{if(state.task===t&&cones[c])cones[c].appendChild(dot)},step*75);
  }
  dots.slice(t.quotient*t.divisor).forEach((dot,i)=>dot.classList.add("leftover"));
 } else {
  const dots=[...ui.dots.querySelectorAll(".dot")];
  dots.forEach(dot=>{dot.style.backgroundColor="#fff";dot.classList.remove("grouped","leftover")});
  dots.forEach((dot,i)=>setTimeout(()=>{if(state.task!==t)return;
   if(i<t.quotient*t.divisor){dot.style.backgroundColor=COLORS[Math.floor(i/t.divisor)%COLORS.length];dot.classList.add("grouped")}
   else {dot.style.backgroundColor="#fff";dot.classList.add("leftover")}
  },i*140));
 }
}
function validateManualWork(){
 const t=state.task;
 if(state.level!==1||!t)return true;
 if(state.mode==="share"){
  const cones=[...ui.dots.querySelectorAll(".cone-drop")];
  if(cones.length!==t.divisor)return false;
  const counts=cones.map(c=>c.querySelectorAll(".dot").length);
  if(counts.some(n=>n!==t.quotient)){speak("Alle gleich viel - zähl nach!");return false}
  const leftovers=ui.dots.querySelectorAll(":scope > .dot").length;
  if(leftovers!==t.remainder){speak("Alle gleich viel - zähl nach!");return false}
  return true;
 }
 if(state.mode==="measure"){
  const colors=[...new Set([...ui.dots.querySelectorAll(".dot")].map(d=>d.dataset.painted).filter(Boolean))];
  let valid=true;
  for(const color of colors){
   const painted=[...ui.dots.querySelectorAll(".dot")].filter(d=>d.dataset.painted===color);
   if(painted.length!==t.divisor){painted.forEach(d=>{d.style.backgroundColor="#fff";delete d.dataset.painted});valid=false}
  }
  const white=[...ui.dots.querySelectorAll(".dot")].filter(d=>!d.dataset.painted).length;
  if(white!==t.remainder){speak(`Immer ${t.divisor} - zähl nach!`);valid=false}
  return valid;
 }
 return true;
}
function inputForTarget(){return state.target==="product"?ui.product:state.target==="factor"?ui.factor:state.target==="remainder"?ui.remainder:ui.quotient}
function requiredLength(target){return target==="product"?String(state.task.product).length:1}
function distributionComplete(){
 if(state.level!==1||state.mode!=="share"||!state.task)return true;
 const cones=[...ui.dots.querySelectorAll(".cone-drop")];
 return cones.length===state.task.divisor&&cones.every(cone=>cone.querySelectorAll(".dot").length===state.task.quotient);
}
function enterDigit(digit){
 if(state.finished||state.stage==="chooseMode")return;
 if(state.clearTimer){clearTimeout(state.clearTimer);state.clearTimer=null;}
 const input=inputForTarget();if(!input||input.disabled)return;
 const needed=requiredLength(state.target);
 if(input.value.length>=needed)input.value="";
 input.value+=digit;input.classList.remove("correct","incorrect");
 if(state.inputTimer)clearTimeout(state.inputTimer);
 if(input.value.length===needed)state.inputTimer=setTimeout(()=>checkInput(input),250);
}
function clearInput(){const input=inputForTarget();if(input){input.value="";input.classList.remove("correct","incorrect")};if(state.inputTimer)clearTimeout(state.inputTimer)}
function wrong(input,message){
 input.classList.remove("correct");input.classList.add("incorrect");
 const t=state.task;t.attempts++;state.taskHadError=true;t.firstWrong=true;t.helpUsed=true;state.firstTry=false;
 if(!t.retry&&!t.assessmentRecorded)recordAssessment(t,false);
 if(state.level===4&&state.target==="product")speak(message);
 if(state.clearTimer)clearTimeout(state.clearTimer);
 state.clearTimer=setTimeout(()=>{if(input.isConnected&&state.task&&!state.finished){input.value="";input.classList.remove("incorrect")}state.clearTimer=null},250);
}
function recordAssessment(t,isCorrect){
 if(t.assessmentRecorded)return;
 t.assessmentRecorded=true;t.assessed=true;t.firstTryCorrect=!!isCorrect;
 state.assessed++;if(isCorrect)state.correct++;else state.wrong++;
 const now=Date.now();
 const record={taskId:t.id,level:t.level,dividend:t.dividend,divisor:t.divisor,expectedQuotient:t.quotient,expectedRemainder:t.remainder,firstAttemptCorrect:!!isCorrect,outcome:isCorrect?"correct":"wrong",attempts:isCorrect?1:t.attempts,helpUsed:t.helpUsed,mode:t.mode,durationSeconds:Number(((now-t.startedAt)/1000).toFixed(2)),startedAt:new Date(t.startedAt).toISOString(),endedAt:new Date(now).toISOString(),retry:false};
 state.records.push(record);t.recordRef=record;
 if(!isCorrect&&!t.retryScheduled){t.retryScheduled=true;state.retryQueue.push({task:t,dueAfter:state.assessed+2})}
}
function right(input){input.classList.remove("incorrect","blink");input.classList.add("correct")}
function checkInput(input){
 if(state.finished||!state.task||!input.value)return;
 const t=state.task,v=Number(input.value),target=state.target;
 if(target==="quotient"&&state.level===1&&!validateManualWork()){input.value="";return;}
 let expected=target==="product"?t.product:target==="factor"?t.quotient:target==="remainder"?t.remainder:t.quotient;
 if(v!==expected){
  let msg="Versuche es noch einmal.";
  if(state.level===4&&target==="product")msg=v>t.product?"Zu groß":(v%t.divisor!==0?"Nicht in dieser Reihe":"Zu klein");
  if(state.level===3&&target==="product")msg=v>t.product?"Zu groß":"Zu klein";
  wrong(input,msg);return;
 }
 right(input);
 if(target==="factor"){
  ui.quotient.value=String(t.quotient);ui.quotient.classList.add("correct");
  state.stage="findRemainder";state.target="remainder";
  speak(`Wie viel fehlt von ${t.product} bis ${t.dividend}?`);
  ui.remainder.classList.remove("hidden");ui.restLabel.classList.remove("hidden");ui.remainder.disabled=false;ui.remainder.classList.remove("disabled-look");
  return;
 }
 if(target==="product"){
  stopTimers();
  if(state.level===4){ui.quotient.disabled=false;ui.quotient.classList.remove("disabled-look");}
  if(state.level===3){state.stage="findFactor";state.target="factor";ui.factor.disabled=false;ui.factor.classList.remove("disabled-look");ui.factor.classList.add("blink");speak(`Wie viel mal ${t.divisor} ist ${t.product}?`)}
  else {state.stage="findQuotient";state.target="quotient";speak(state.level===4?`Wie viel mal ${t.divisor} ist ${t.product}?`:`Wie viel mal ${t.divisor} ist ${t.product}?`)}
  return;
 }
 if(target==="quotient"){
  ui.quotient.value=String(t.quotient);
  if(state.level===3){speak(`${t.dividend} geteilt durch ${t.divisor} ist ${t.quotient}.`);animateGroups(t.mode||"share")}
  if(state.level===4){speak(`Wie viel fehlt von ${t.product} auf ${t.dividend}?`)}
  else if(state.level<=2)speak("Wie viele Punkte bleiben übrig?");
  ui.remainder.classList.remove("hidden");ui.restLabel.classList.remove("hidden");ui.remainder.disabled=false;ui.remainder.classList.remove("disabled-look");state.target="remainder";state.stage="findRemainder";return;
 }
 if(target==="remainder"){completeTask()}
}
function completeTask(){
 const t=state.task;
 if(!t.retry){
  if(!t.assessmentRecorded)recordAssessment(t,!state.taskHadError);
  else if(t.recordRef){
   t.recordRef.endedAt=new Date().toISOString();
   t.recordRef.durationSeconds=Number(((Date.now()-t.startedAt)/1000).toFixed(2));
   t.recordRef.attempts=t.attempts+1;t.recordRef.helpUsed=t.helpUsed;t.recordRef.mode=t.mode;
  }
 }else{t.retryCompleted=true}
 nextTask();
}
function nextTask(){
 stopTimers();if(state.assessed>=20){finishGame();return}
 const due=state.retryQueue.findIndex(r=>r.dueAfter<=state.assessed);
 if(due>=0){const retry=state.retryQueue.splice(due,1)[0].task;retry.retry=true;retry.firstWrong=true;showTask(retry);return}
 state.index++;
 if(state.index<state.queue.length)showTask(state.queue[state.index]);
 else {const t=makeTask(state.level);state.queue.push(t);state.index=state.queue.length-1;showTask(t)}
}
function elapsed(){return Math.max(0,Math.floor((Date.now()-state.startedAt)/1000))}
function fmtTime(s){return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`}
function finishGame(){
 if(state.finished)return;
 if(state.task&&!state.task.retry&&state.task.assessmentRecorded&&state.task.recordRef){
  state.task.recordRef.endedAt=new Date().toISOString();
  state.task.recordRef.durationSeconds=Number(((Date.now()-state.task.startedAt)/1000).toFixed(2));
 }
 state.finished=true;stopTimers();if(state.timerHandle)clearInterval(state.timerHandle);
 const result={schemaVersion:"1.0",gameId:"teilen-mit-rest",sessionId:state.sessionId,studentId:null,level:state.level,startedAt:new Date(state.startedAt).toISOString(),endedAt:new Date().toISOString(),totalDurationSeconds:Number(((Date.now()-state.startedAt)/1000).toFixed(2)),assessedTasks:state.assessed,correctFirstAttempts:state.correct,wrongFirstAttempts:state.wrong,tasks:state.records};
 state.lastResult=result;
 try{const key="teilenMitRestResults",prev=JSON.parse(localStorage.getItem(key)||"[]");prev.push(result);localStorage.setItem(key,JSON.stringify(prev.slice(-200)))}catch{}
 ui.game.classList.add("hidden");ui.result.classList.remove("hidden");
 ui.score.textContent=`${state.correct} von ${state.assessed} Aufgaben richtig.`;ui.time.textContent=`Zeit: ${fmtTime(elapsed())}`;
 ui.celebration.classList.add("hidden");ui.export.classList.add("hidden");ui.again.classList.add("hidden");
 if(state.correct>=19){ui.celebration.classList.remove("hidden");setTimeout(()=>{ui.celebration.classList.add("hidden");ui.export.classList.remove("hidden");ui.again.classList.remove("hidden")},3000)}
 else if(state.correct>=17){const thumb=document.createElement("div");thumb.textContent="👍";thumb.style.fontSize="52px";thumb.id="thumb";ui.result.insertBefore(thumb,ui.export);setTimeout(()=>{thumb.remove();ui.export.classList.remove("hidden");ui.again.classList.remove("hidden")},3000)}
 else {ui.export.classList.remove("hidden");ui.again.classList.remove("hidden")}
}
function leave(){finishGame()}
function exportResult(){
 if(!state.lastResult)return;const blob=new Blob([JSON.stringify(state.lastResult,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`teilen-mit-rest-${state.lastResult.sessionId.slice(0,8)}.json`;a.click();URL.revokeObjectURL(url)
}
ui.levels.forEach(b=>b.addEventListener("click",()=>{ui.levels.forEach(x=>x.classList.remove("selected"));b.classList.add("selected");startGame()}));
ui.share.addEventListener("click",()=>chooseMode("share"));ui.measure.addEventListener("click",()=>chooseMode("measure"));
ui.keypad.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.digit!==undefined)enterDigit(b.dataset.digit);else if(b.dataset.action==="clear")clearInput();else if(b.dataset.action==="next"){const input=inputForTarget();if(input&&input.value.length>=requiredLength(state.target))checkInput(input)}});
ui.leave.addEventListener("click",leave);ui.export.addEventListener("click",exportResult);ui.again.addEventListener("click",startGame);
let drag=null,dragStart=null,dragOrigin=null;
ui.dots.addEventListener("pointerdown",e=>{
 const dot=e.target.closest(".dot");if(!dot||state.level!==1||state.mode!=="share")return;
 dot.setPointerCapture?.(e.pointerId);
 drag=dot;dragStart={parent:dot.parentElement,next:dot.nextSibling};dragOrigin=dot.parentElement.closest(".cone-drop")?"cone":"dots";
 dot.style.opacity=".65";dot.style.zIndex="1000";dot.style.position="relative";
});
ui.dots.addEventListener("pointermove",e=>{
 if(!drag)return;
 drag.style.position="fixed";drag.style.zIndex="1000";drag.style.left=`${e.clientX-drag.offsetWidth/2}px`;drag.style.top=`${e.clientY-drag.offsetHeight/2}px`;drag.style.pointerEvents="none";
});
document.addEventListener("pointerup",e=>{
 if(!drag)return;
 const dot=drag;dot.style.position="";dot.style.zIndex="";dot.style.left="";dot.style.top="";dot.style.opacity="";dot.style.pointerEvents="";
 const target=document.elementFromPoint(e.clientX,e.clientY);
 const cone=target?.closest(".cone-drop");
 const pointArea=target?.closest("#dots")&&!cone;
 if(cone){
  const assigned=cone.querySelectorAll(".dot").length;
  // Every cone receives exactly the quotient number of points; extra points stay available above.
  if(assigned<state.task.quotient)cone.appendChild(dot);
  else if(dragStart?.parent?.isConnected)dragStart.parent.insertBefore(dot,dragStart.next?.isConnected?dragStart.next:null);
 }else if(pointArea&&dragOrigin==="cone"){
  const zone=ui.dots.querySelector(".cone-zone");
  if(zone)ui.dots.insertBefore(dot,zone);
 }else if(dragStart?.parent?.isConnected){
  dragStart.parent.insertBefore(dot,dragStart.next?.isConnected?dragStart.next:null);
 }
 drag=null;dragStart=null;dragOrigin=null;
});
window.DivisionLearningGame={start:startGame,finish:finishGame,getSession:()=>({level:state.level,assessed:state.assessed,correct:state.correct,wrong:state.wrong,finished:state.finished,stage:state.stage}),getCurrentTask:()=>state.task?({dividend:state.task.dividend,divisor:state.task.divisor,quotient:state.task.quotient,remainder:state.task.remainder,product:state.task.product}):null,getQueuedTasks:()=>state.queue.map(t=>({dividend:t.dividend,divisor:t.divisor})),exportCurrentResult:()=>state.lastResult};
startGame();
})();