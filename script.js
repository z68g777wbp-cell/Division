(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const els = {
    startScreen: $("startScreen"), gameScreen: $("gameScreen"), resultScreen: $("resultScreen"),
    studentId: $("studentId"), startButton: $("startButton"), leaveButton: $("leaveButton"),
    levelLabel: $("levelLabel"), taskCounter: $("taskCounter"), progressBar: $("progressBar"),
    instruction: $("instruction"), dividendText: $("dividendText"), divisorText: $("divisorText"),
    answerInput: $("answerInput"), restInput: $("restInput"), restLabel: $("restLabel"),
    dotsArea: $("dotsArea"), level3Work: $("level3Work"), productInput: $("productInput"),
    factorYLabel: $("factorYLabel"), modeButtons: $("modeButtons"), shareButton: $("shareButton"),
    measureButton: $("measureButton"), feedback: $("feedback"), helpText: $("helpText"),
    keypad: $("keypad"), repeatButton: $("repeatButton"), hintButton: $("hintButton"),
    doneCount: $("doneCount"), timer: $("timer"), correctCount: $("correctCount"),
    resultScore: $("resultScore"), resultTime: $("resultTime"), resultMessage: $("resultMessage"),
    resultCorrect: $("resultCorrect"), resultWrong: $("resultWrong"), resultTotal: $("resultTotal"),
    celebration: $("celebration"), downloadButton: $("downloadButton"), againButton: $("againButton"),
    level4Work: $("level4Work"), level4Dividend: $("level4Dividend"), level4Divisor: $("level4Divisor"),
    level4QuotientGhost: $("level4QuotientGhost"), level4RestGhost: $("level4RestGhost"),
    level4Y: $("level4Y"), level4ProductInput: $("level4ProductInput")
  };

  const COLORS = ["group-a", "group-b", "group-c", "group-d", "group-e"];
  const state = {
    level: 1, studentId: "", startedAt: 0, timerHandle: null, task: null,
    queue: [], currentQueueIndex: 0, assessed: 0, correct: 0, wrong: 0,
    records: [], inputTarget: "answer", mode: null, stage: "chooseMode",
    retryQueue: [], sessionId: "", finished: false, firstTry: true,
    stepTimer: null, hintTimer: null, inputTimer: null, helpUsed: false
  };

  const safeSpeech = (text) => {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "de-AT";
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
    } catch (_) { /* speech is an optional enhancement */ }
  };

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }
  function elapsedSeconds() { return (Date.now() - state.startedAt) / 1000; }
  function clearTimers() {
    ["stepTimer", "hintTimer", "inputTimer"].forEach((key) => {
      if (state[key]) clearTimeout(state[key]);
      state[key] = null;
    });
  }
  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function makeTask(level) {
    let divisor, quotient, remainder, dividend;
    if (level === 1) {
      divisor = randomInt(2, 9);
      quotient = randomInt(1, Math.min(9, Math.floor(30 / divisor)));
      remainder = randomInt(0, Math.min(divisor - 1, 30 - divisor * quotient));
      dividend = divisor * quotient + remainder;
      while (dividend < 10 || dividend > 30 || quotient > 9) {
        divisor = randomInt(2, 9); quotient = randomInt(1, Math.min(9, Math.floor(30 / divisor)));
        remainder = randomInt(0, Math.min(divisor - 1, 30 - divisor * quotient));
        dividend = divisor * quotient + remainder;
      }
    } else {
      divisor = randomInt(5, 9);
      quotient = randomInt(1, 9);
      remainder = randomInt(0, divisor - 1);
      dividend = divisor * quotient + remainder;
      while (dividend < 10 || dividend > 99) {
        divisor = randomInt(5, 9); quotient = randomInt(1, 9);
        remainder = randomInt(0, divisor - 1);
        dividend = divisor * quotient + remainder;
      }
    }
    return { dividend, divisor, quotient, remainder, product: divisor * quotient, level, id: cryptoId(), attempts: 0, startedAt: Date.now(), endedAt: null, assessed: false, helpUsed: false, mode: null, retry: false };
  }
  function cryptoId() {
    try { return crypto.randomUUID(); } catch (_) { return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  }
  function buildQueue() {
    state.queue = Array.from({ length: 20 }, () => makeTask(state.level));
    // Prevent duplicate calculations in a round where practical.
    const seen = new Set();
    for (let i = 0; i < state.queue.length; i++) {
      let key = `${state.queue[i].dividend}/${state.queue[i].divisor}`, guard = 0;
      while (seen.has(key) && guard++ < 30) {
        state.queue[i] = makeTask(state.level);
        key = `${state.queue[i].dividend}/${state.queue[i].divisor}`;
      }
      seen.add(key);
    }
    state.currentQueueIndex = 0;
    state.retryQueue = [];
  }

  function startGame() {
    clearTimers();
    state.level = Number(document.querySelector(".level-choice.selected")?.dataset.level || 1);
    state.studentId = els.studentId ? els.studentId.value.trim().slice(0, 40) : "";
    state.startedAt = Date.now();
    state.sessionId = cryptoId();
    state.assessed = 0; state.correct = 0; state.wrong = 0; state.records = [];
    state.finished = false; state.retryQueue = []; state.mode = null; state.stage = "active";
    buildQueue();
    els.startScreen.classList.add("hidden");
    els.resultScreen.classList.add("hidden");
    els.gameScreen.classList.remove("hidden");
    els.levelLabel.textContent = `LEVEL ${state.level}`;
    els.doneCount.textContent = "0"; els.correctCount.textContent = "0";
    updateTimer(); state.timerHandle = setInterval(updateTimer, 250);
    showTask(state.queue[0]);
  }
  function updateTimer() { els.timer.textContent = formatTime(elapsedSeconds()); }

  function activeTask() { return state.task; }
  function showTask(task) {
    clearTimers();
    if (state.finished) return;
    state.task = task;
    task.startedAt = Date.now();
    task.helpUsed = false;
    task.supportedAfterWrong = false;
    state.firstTry = true; state.mode = null;
    state.stage = state.level <= 2 ? "chooseMode" : "findProduct";
    state.inputTarget = state.level === 4 ? "product" : "answer";
    els.feedback.textContent = ""; els.feedback.className = "feedback";
    els.helpText.classList.add("hidden"); els.helpText.textContent = "";
    els.answerInput.value = ""; els.restInput.value = ""; els.productInput.value = ""; els.level4ProductInput.value = "";
    [els.answerInput, els.restInput, els.productInput, els.level4ProductInput].forEach((input) => input.classList.remove("correct", "incorrect", "blink"));
    els.restInput.classList.add("hidden"); els.restLabel.classList.add("hidden");
    els.level3Work.classList.toggle("hidden", state.level !== 3);
    els.level4Work.classList.toggle("hidden", state.level !== 4);
    els.modeButtons.classList.toggle("hidden", state.level > 2);
    els.answerInput.disabled = false;
    els.dividendText.textContent = task.dividend; els.divisorText.textContent = task.divisor;
    els.factorYLabel.textContent = task.divisor;
    els.level4Dividend.textContent = task.dividend; els.level4Divisor.textContent = task.divisor; els.level4Y.textContent = task.divisor;
    els.level4QuotientGhost.textContent = "?"; els.level4RestGhost.textContent = "?";
    els.taskCounter.textContent = `Aufgabe ${Math.min(state.assessed + 1, 20)} von 20`;
    els.progressBar.style.width = `${state.assessed / 20 * 100}%`;
    renderDots(task);
    if (state.level === 1) {
      els.instruction.textContent = "";
      els.answerInput.disabled = true;
    } else if (state.level === 2) {
      els.instruction.textContent = "";
      els.answerInput.disabled = true;
    } else if (state.level === 3) {
      els.instruction.textContent = "";
      safeSpeech(`Suche das nächstkleinere Malergebnis in der ${task.divisor}er-Reihe.`);
      els.answerInput.disabled = true;
      state.hintTimer = setTimeout(() => {
        if (state.task === task && !els.productInput.value) {
          const matching = [...els.dotsArea.children].slice(0, task.product);
          matching.forEach((dot) => dot.classList.add("highlight"));
          setTimeout(() => matching.forEach((dot) => dot.classList.remove("highlight")), 1000);
        }
      }, 5000);
    } else {
      els.instruction.textContent = "";
      safeSpeech(`Suche das nächstkleinere Malergebnis in der ${task.divisor}er-Reihe.`);
      els.answerInput.disabled = true;
      els.level4ProductInput.disabled = false;
    }
    updateStats();
  }

  function renderDots(task) {
    els.dotsArea.innerHTML = ""; els.dotsArea.className = "dots-area";
    for (let i=0;i<task.dividend;i++) {
      const dot=document.createElement("button"); dot.type="button"; dot.className="dot"; dot.dataset.index=String(i);
      dot.setAttribute("aria-label",`Punkt ${i+1}`); dot.draggable=state.level===1;
      dot.addEventListener("dragstart",e=>{if(state.level!==1||state.mode!=="share"){e.preventDefault();return;}e.dataTransfer.setData("text/plain",dot.dataset.index);});
      dot.addEventListener("click",()=>{if(state.level===1&&state.mode==="measure"&&state.paintColor){dot.style.backgroundColor=state.paintColor;dot.style.borderColor="#17344a";dot.dataset.painted=state.paintColor;}});
      els.dotsArea.appendChild(dot);
    }
    if(state.level===1){
      const cones=document.createElement("div");cones.className="cone-zone";cones.setAttribute("aria-label","Kegel");
      for(let i=0;i<task.divisor;i++){const cone=document.createElement("button");cone.type="button";cone.className="cone-drop";cone.textContent="♟";
        cone.addEventListener("dragover",e=>e.preventDefault());cone.addEventListener("drop",e=>{e.preventDefault();const idx=e.dataTransfer.getData("text/plain");const dot=els.dotsArea.querySelector(`.dot[data-index="${idx}"]`);if(dot){cone.appendChild(dot);dot.classList.add("placed-dot");}});cones.appendChild(cone);}
      els.dotsArea.appendChild(cones);
    }
    if(state.level===1&&state.mode==="measure")showPaintPalette();
  }
  function showPaintPalette(){
    let palette=document.getElementById("paintPalette");if(!palette){palette=document.createElement("div");palette.id="paintPalette";palette.className="paint-palette";els.dotsArea.parentNode.insertBefore(palette,els.dotsArea.nextSibling);}
    palette.innerHTML="";const colors=["#ed7437","#a02b96","#fff000","#42cf61","#67c9ed","#e92727","#0ca95b","#8b65cf","#f3a5bd"];
    colors.forEach((color,i)=>{const b=document.createElement("button");b.type="button";b.className="paint-brush";b.style.backgroundColor=color;b.setAttribute("aria-label",`Pinsel ${i+1}`);b.addEventListener("click",()=>{state.paintColor=color;palette.querySelectorAll(".paint-brush").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");});palette.appendChild(b);});
  }

  function chooseMode(mode) {
    if (state.finished || state.level > 2 || state.stage !== "chooseMode") return;
    state.mode = mode; state.task.mode = mode; state.stage = "answer";
    els.modeButtons.classList.add("hidden");
    els.answerInput.disabled = false;
    els.answerInput.classList.add("blink");
    els.instruction.textContent = "";
    safeSpeech(mode === "share" ? "Teile die Punkte gleichmäßig auf." : `Tippe immer ${state.task.divisor} Punkte an!`);
    if (state.level === 1) {
      renderDots(state.task);
      if (mode === "share") safeSpeech("Teile die Punkte gleichmäßig auf.");
      else { showPaintPalette(); safeSpeech(`Tippe immer ${state.task.divisor} Punkte an!`); }
    } else {
      if (mode === "share") animateShare(); else animateMeasure();
    }
    state.inputTarget = "answer";
    els.restInput.classList.remove("hidden"); els.restLabel.classList.remove("hidden");
    if (mode === "measure" && state.level !== 1) els.dotsArea.classList.add("measure-mode");
  }

  function animateShare() {
    const dots = [...els.dotsArea.children], task = state.task;
    dots.forEach((dot) => dot.classList.remove(...COLORS, "circled", "leftover", "remnant"));
    const groupCount = task.quotient;
    dots.forEach((dot, index) => {
      if (index >= groupCount * task.divisor) {
        dot.classList.add("leftover");
      } else {
        const group = Math.floor(index / task.divisor) % COLORS.length;
        dot.classList.add(COLORS[group], "circled");
      }
    });
    els.helpText.textContent = ""; els.helpText.classList.add("hidden");
  }

  function animateMeasure() {
    const dots = [...els.dotsArea.children], task = state.task;
    dots.forEach((dot, index) => {
      dot.classList.remove(...COLORS, "circled", "leftover", "remnant");
      if (index < task.quotient * task.divisor) dot.classList.add(COLORS[Math.floor(index / task.divisor) % COLORS.length], "circled");
      else dot.classList.add("leftover");
    });
    els.helpText.textContent = ""; els.helpText.classList.add("hidden");
  }

  function setInputValue(input, digit) {
    if (!input || input.disabled || input.classList.contains("hidden")) return;
    input.value = String(digit);
    input.classList.remove("correct", "incorrect");
    if (state.inputTimer) clearTimeout(state.inputTimer);
    state.inputTimer = setTimeout(() => checkInput(input), 250);
  }

  function handleDigit(digit) {
    if (state.finished) return;
    if (state.level === 3 && state.stage === "findProduct") return setInputValue(els.productInput, digit);
    if (state.level === 4 && state.stage === "findProduct") return setInputValue(els.level4ProductInput, digit);
    if (state.stage === "answer") {
      if (state.inputTarget === "rest") return setInputValue(els.restInput, digit);
      return setInputValue(els.answerInput, digit);
    }
  }

  function checkInput(input) {
    if (state.finished || !state.task || !input.value) return;
    const value = Number(input.value), task = state.task;
    if (state.level === 3) {
      if (input === els.productInput) {
        if (value === task.product) {
          markCorrect(input); state.stage = "findQuotient"; els.answerInput.disabled = false;
          els.instruction.textContent = "";
          safeSpeech(`Wie viel mal ${task.divisor} ist ${task.product}?`);
          state.inputTarget = "answer";
        } else markWrong(input, value < task.product ? "Noch zu klein. Suche das nächstkleinere Malergebnis." : "Das ist zu groß. Suche das nächstkleinere Malergebnis.");
        return;
      }
      if (input === els.answerInput && state.stage === "findQuotient") {
        if (value === task.quotient) {
          markCorrect(input); els.dividendText.textContent = task.dividend;
          els.instruction.textContent = "";
          safeSpeech(`${task.dividend} geteilt durch ${task.divisor} ist ${task.quotient}, weil ${task.quotient} mal ${task.divisor} gleich ${task.product} ist.`);
          animateModeAfterProduct();
          els.restInput.classList.remove("hidden"); els.restLabel.classList.remove("hidden");
          state.stage = "findRemainder"; state.inputTarget = "rest";
        } else markWrong(input, "Versuche es noch einmal.");
        return;
      }
    }
    if (state.level === 4) {
      if (input === els.level4ProductInput) {
        if (value === task.product) {
          markCorrect(input); state.stage = "findQuotient";
          els.level4QuotientGhost.textContent = "?"; els.answerInput.disabled = false;
          els.instruction.textContent = "";
          safeSpeech(`Wie viel mal ${task.divisor} ist ${task.product}?`);
          state.inputTarget = "answer";
        } else {
          const msg = value > task.dividend ? "Zu groß!" : value > task.product ? "Zu groß – suche das nächstkleinere Malergebnis." : (value % task.divisor !== 0 ? "Das ist nicht in dieser Reihe." : "Zu klein!");
          markWrong(input, msg); safeSpeech(msg);
        }
        return;
      }
      if (input === els.answerInput && state.stage === "findQuotient") {
        if (value === task.quotient) {
          markCorrect(input); els.level4QuotientGhost.textContent = String(task.quotient);
          state.stage = "findRemainder"; state.inputTarget = "rest";
          els.restInput.classList.remove("hidden"); els.restLabel.classList.remove("hidden"); els.restInput.disabled = false;
          els.instruction.textContent = "";
          safeSpeech(`Wie viel fehlt von ${task.product} auf ${task.dividend}?`);
        } else markWrong(input, "Versuche es noch einmal.");
        return;
      }
    }
    if (input === els.answerInput && (state.level <= 2 || state.stage === "answer")) {
      if (value === task.quotient) {
        markCorrect(input);
        state.stage = "findRemainder"; state.inputTarget = "rest";
        els.restInput.disabled = false; els.restInput.classList.remove("hidden"); els.restLabel.classList.remove("hidden");
        els.instruction.textContent = "";
        safeSpeech("Wie viele Punkte bleiben übrig? Trage den Rest ein.");
        return;
      }
      markWrong(input, "Das stimmt noch nicht. Schau dir die Punkte an und probiere es noch einmal.");
      return;
    }
    if (input === els.restInput && state.stage === "findRemainder") {
      if (value === task.remainder) {
        markCorrect(input);
        assessTask(true);
      } else markWrong(input, "Zähle die übrigen Punkte noch einmal.");
    }
  }

  function markCorrect(input) {
    input.classList.remove("incorrect", "blink"); input.classList.add("correct");
    els.feedback.textContent = ""; els.feedback.className = "feedback good";
    if (state.level <= 2 && input === els.answerInput) {
      // The first correct quotient is not the end: remainder is a separate part of the same task.
      return;
    }
    if (state.level === 3 && input === els.productInput) return;
    if (state.level === 3 && input === els.answerInput && state.stage === "findQuotient") return;
    if (state.level === 4 && input === els.level4ProductInput) return;
    if (state.level === 4 && input === els.answerInput && state.stage === "findQuotient") return;
  }
  function markWrong(input, message) {
    input.classList.remove("correct"); input.classList.add("incorrect");
    els.feedback.textContent = ""; els.feedback.className = "feedback bad";
    if (state.firstTry && !state.task.assessed) {
      state.task.attempts += 1;
      state.firstTry = false;
      state.task.firstAttemptWrong = true;
    }
    state.task.helpUsed = true; state.helpUsed = true;
    if (state.level === 4) safeSpeech(message);
    input.value = "";
    // A wrong first attempt is assessed immediately as wrong, but the child can finish with support.
    if (!state.task.assessed) assessTask(false, true);
    else {
      // During a scheduled retry, keep the original score but allow supported correction.
      state.task.supportedAfterWrong = true;
      els.helpText.textContent = "Diese Aufgabe wurde bereits bewertet. Du kannst sie mit Hilfe fertig lösen.";
      els.helpText.classList.remove("hidden");
    }
  }

  function assessTask(isCorrect, keepCurrent = false) {
    const task = state.task;
    if (!task || task.assessed) {
      if (!keepCurrent) nextTask();
      return;
    }
    task.assessed = true;
    task.endedAt = Date.now();
    task.durationSeconds = Math.max(0, (task.endedAt - task.startedAt) / 1000);
    task.firstTryCorrect = !!isCorrect && !task.firstAttemptWrong;
    task.outcome = task.firstTryCorrect ? "correct" : "wrong";
    state.assessed++;
    if (task.firstTryCorrect) state.correct++; else state.wrong++;
    state.records.push({
      taskId: task.id, level: task.level, dividend: task.dividend, divisor: task.divisor,
      expectedQuotient: task.quotient, expectedRemainder: task.remainder,
      firstAttemptCorrect: task.firstTryCorrect, outcome: task.outcome,
      attempts: task.attempts + (isCorrect ? 1 : 0), helpUsed: task.helpUsed,
      mode: task.mode, durationSeconds: Number(task.durationSeconds.toFixed(2)),
      startedAt: new Date(task.startedAt).toISOString(), endedAt: new Date(task.endedAt).toISOString(),
      retry: task.retry
    });
    if (!task.firstTryCorrect && !task.retry && !task.retryScheduled) {
      task.retryScheduled = true;
      state.retryQueue.push({ task, dueAfter: state.assessed + 2 });
    }
    updateStats();
    if (keepCurrent) {
      els.answerInput.classList.remove("blink");
      els.helpText.textContent = "Diese Aufgabe zählt bereits als falsch. Du darfst sie mit Hilfe fertig lösen.";
      els.helpText.classList.remove("hidden");
      // Keep the activity usable; do not advance until child finishes the supported correction.
      task.assessed = true;
      task.supportedAfterWrong = true;
      state.stage = state.level <= 2 ? "answer" : state.stage;
      return;
    }
    nextTask();
  }

  function updateStats() {
    els.doneCount.textContent = String(state.assessed);
    els.correctCount.textContent = String(state.correct);
    els.taskCounter.textContent = `Aufgabe ${Math.min(state.assessed + 1, 20)} von 20`;
    els.progressBar.style.width = `${Math.min(100, state.assessed / 20 * 100)}%`;
  }

  function nextTask() {
    if (state.finished) return;
    clearTimers();
    if (state.assessed >= 20) return finishGame();
    // Retry a missed task after two further assessed first attempts; retry never changes score.
    if (state.retryQueue.length && state.assessed >= state.retryQueue[0].dueAfter) {
      const scheduled = state.retryQueue.shift();
      const retry = scheduled.task;
      retry.retry = true; retry.assessed = true;
      showTask(retry);
      return;
    }
    state.currentQueueIndex++;
    if (state.currentQueueIndex < state.queue.length) {
      const next = state.queue[state.currentQueueIndex];
      if (state.records.some((r) => r.taskId === next.id && !next.retry)) {
        // Queue is generated in advance; skip already presented entries defensively.
      }
      showTask(next);
    } else if (state.assessed < 20) {
      state.queue.push(makeTask(state.level));
      state.currentQueueIndex = state.queue.length - 1;
      showTask(state.queue[state.currentQueueIndex]);
    }
  }

  function showHelp() {
    if (!state.task) return;
    state.task.helpUsed = true;
    const t = state.task;
    let text = `Denke an die Malreihe von ${t.divisor}: ${t.divisor}, ${2*t.divisor}, ${3*t.divisor} … Das größte passende Ergebnis ist ${t.product}.`;
    if (state.level <= 2) text = `Lege oder zähle immer ${t.divisor} Punkte in einer Gruppe. ${t.quotient} Gruppen ergeben ${t.product} Punkte. ${t.remainder} Punkt(e) bleiben übrig.`;
    els.helpText.textContent = ""; els.helpText.classList.add("hidden");
    safeSpeech(text);
  }

  function finishGame() {
    state.finished = true; clearTimers();
    if (state.timerHandle) clearInterval(state.timerHandle);
    state.timerHandle = null;
    const totalSeconds = Math.round(elapsedSeconds());
    const result = {
      schemaVersion: "1.0", gameId: "teilen-mit-rest", sessionId: state.sessionId,
      studentId: state.studentId || null, level: state.level,
      startedAt: new Date(state.startedAt).toISOString(), endedAt: new Date().toISOString(),
      totalDurationSeconds: Number(elapsedSeconds().toFixed(2)), assessedTasks: state.assessed,
      correctFirstAttempts: state.correct, wrongFirstAttempts: state.wrong,
      scoreText: `${state.correct} von ${state.assessed} Aufgaben richtig.`,
      tasks: state.records
    };
    state.lastResult = result;
    els.gameScreen.classList.add("hidden"); els.resultScreen.classList.remove("hidden");
    els.resultScore.textContent = `${state.correct} von ${state.assessed} Aufgaben richtig.`;
    els.resultTime.textContent = `Zeit: ${formatTime(totalSeconds)}`;
    els.resultCorrect.textContent = String(state.correct); els.resultWrong.textContent = String(state.wrong);
    els.resultTotal.textContent = String(state.assessed);
    els.celebration.classList.add("hidden"); els.resultMessage.textContent = "";
    if (state.correct >= 19) {
      els.celebration.classList.remove("hidden");
      els.resultMessage.textContent = "🌟 Großartig! Du hast sehr genau gearbeitet!";
      safeSpeech("Großartig! Du hast sehr genau gearbeitet!");
    } else if (state.correct >= 17) {
      els.resultMessage.textContent = "👍 Gut gemacht! Du bist auf einem guten Weg.";
    }
    try {
      const key = "teilenMitRestResults";
      const previous = JSON.parse(localStorage.getItem(key) || "[]");
      previous.push(result);
      localStorage.setItem(key, JSON.stringify(previous.slice(-200)));
    } catch (_) { /* local storage may be disabled */ }
  }

  function leaveGame() {
    if (!state.startedAt || state.finished || els.gameScreen.classList.contains("hidden")) {
      if (!els.startScreen.classList.contains("hidden")) return;
      return;
    }
    // Leaving early ends the round and reports only tasks with a recorded first assessment.
    finishGame();
  }

  function downloadResult() {
    if (!state.lastResult) return;
    const blob = new Blob([JSON.stringify(state.lastResult, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `teilen-mit-rest-${state.lastResult.studentId || "ohne-code"}-${state.lastResult.sessionId.slice(0, 8)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function wireEvents() {
    document.querySelectorAll(".level-choice").forEach((button) => button.addEventListener("click", () => {
      document.querySelectorAll(".level-choice").forEach((b) => b.classList.remove("selected"));
      button.classList.add("selected");
    }));
    els.startButton.addEventListener("click", startGame);
    els.leaveButton.addEventListener("click", leaveGame);
    els.shareButton.addEventListener("click", () => chooseMode("share"));
    els.measureButton.addEventListener("click", () => chooseMode("measure"));
    els.hintButton.addEventListener("click", showHelp);
    els.repeatButton.addEventListener("click", () => {
      if (state.task && state.task.assessed) {
        state.retryQueue.push(state.task);
        nextTask();
      }
    });
    els.keypad.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.digit !== undefined) handleDigit(button.dataset.digit);
      if (button.dataset.action === "clear") {
        const target = state.level === 3 && state.stage === "findProduct" ? els.productInput :
          state.level === 4 && state.stage === "findProduct" ? els.level4ProductInput :
          state.inputTarget === "rest" ? els.restInput : els.answerInput;
        target.value = ""; target.classList.remove("correct", "incorrect");
      }
      if (button.dataset.action === "next") {
        const target = state.level === 3 && state.stage === "findProduct" ? els.productInput :
          state.level === 4 && state.stage === "findProduct" ? els.level4ProductInput :
          state.inputTarget === "rest" ? els.restInput : els.answerInput;
        checkInput(target);
      }
    });
    els.dotsArea.addEventListener("click", (event) => {
      const dot = event.target.closest(".dot");
      if (!dot || !els.dotsArea.classList.contains("measure-mode")) return;
      dot.classList.toggle("circled");
    });
    els.downloadButton.addEventListener("click", downloadResult);
    els.againButton.addEventListener("click", () => {
      els.resultScreen.classList.add("hidden"); els.startScreen.classList.remove("hidden");
      state.startedAt = 0; state.finished = false;
    });
  }

  // A wrong first answer is counted immediately. The child can then correct it with support;
  // supported correction never changes the recorded first-attempt result.
  const originalCheckInput = checkInput;
  checkInput = function(input) {
    if (state.task?.assessed && state.task.supportedAfterWrong) {
      const t = state.task, value = Number(input.value);
      let expected = input === els.restInput ? t.remainder :
        input === els.productInput || input === els.level4ProductInput ? t.product : t.quotient;
      if (value === expected) {
        input.classList.remove("incorrect"); input.classList.add("correct");
        els.feedback.textContent = ""; els.feedback.className = "feedback good";
        if (input === els.answerInput && (state.level <= 2 || state.stage === "findQuotient")) {
          state.inputTarget = "rest"; state.stage = "findRemainder";
          els.restInput.classList.remove("hidden"); els.restLabel.classList.remove("hidden");
          els.instruction.textContent = "Jetzt den Rest eintragen.";
        } else if (input === els.restInput) {
          t.supportedAfterWrong = false;
          nextTask();
        } else if (input === els.productInput || input === els.level4ProductInput) {
          state.stage = "findQuotient"; state.inputTarget = "answer";
          els.instruction.textContent = `Wie viel mal ${t.divisor} ist ${t.product}?`;
        }
      } else {
        input.classList.remove("correct"); input.classList.add("incorrect"); input.value = "";
        els.feedback.textContent = ""; els.feedback.className = "feedback bad";
      }
      return;
    }
    originalCheckInput(input);
  };

  wireEvents();
  // Testable public interface for smoke tests and future platform integration.
  window.DivisionLearningGame = {
    getSession: () => ({ level: state.level, assessed: state.assessed, correct: state.correct, wrong: state.wrong, finished: state.finished }),
    exportCurrentResult: () => state.lastResult || null,
    start: startGame,
    finish: finishGame
  };
})();