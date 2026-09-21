/* ===========================================================
   Number Quest 1-100
   Count, match and trace numbers from 1 to 100.
   Vanilla JS, no build step, no external data files.
   =========================================================== */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     Constants & state
  ---------------------------------------------------------- */
  const TOTAL_MISSIONS = 100;
  const STORAGE_KEY = "numberquest_progress_v1";
  const SOUND_KEY = "numberquest_sound_v1";
  const VOICE_KEY = "numberquest_voice_v1";

  const ICONS = ["⭐", "🍎", "🍀", "🐝", "🌸", "🦋", "🐠", "🍪", "🎈", "🐞", "🍉", "🚗"];

  const state = {
    progress: loadProgress(),
    soundOn: loadSoundPref(),
    activeMission: 1,
    isReplay: false,
    voices: [],
    chosenVoice: null,
    voiceRate: 0.92,
    voicePitch: 1.05,
    voiceName: null,
  };

  /* ----------------------------------------------------------
     Number → words (for clear, natural-sounding speech)
  ---------------------------------------------------------- */
  const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  function numberToWords(n) {
    if (n === 100) return "one hundred";
    if (n < 20) return ONES[n];
    const t = Math.floor(n / 10), o = n % 10;
    return TENS[t] + (o ? "-" + ONES[o] : "");
  }

  /* ----------------------------------------------------------
     Persistence helpers
  ---------------------------------------------------------- */
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.completed) && typeof parsed.current === "number") {
          return parsed;
        }
      }
    } catch (e) { /* ignore corrupt data */ }
    return { completed: [], current: 1, stars: 0 };
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
    } catch (e) { /* storage may be unavailable, fail silently */ }
  }

  function loadSoundPref() {
    try {
      const raw = localStorage.getItem(SOUND_KEY);
      if (raw === "off") return false;
    } catch (e) {}
    return true;
  }

  function saveSoundPref() {
    try { localStorage.setItem(SOUND_KEY, state.soundOn ? "on" : "off"); } catch (e) {}
  }

  function loadVoicePref() {
    try {
      const raw = localStorage.getItem(VOICE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (typeof parsed.rate === "number") state.voiceRate = parsed.rate;
          if (typeof parsed.pitch === "number") state.voicePitch = parsed.pitch;
          if (typeof parsed.name === "string") state.voiceName = parsed.name;
        }
      }
    } catch (e) {}
  }

  function saveVoicePref() {
    try {
      localStorage.setItem(VOICE_KEY, JSON.stringify({
        rate: state.voiceRate, pitch: state.voicePitch, name: state.voiceName
      }));
    } catch (e) {}
  }
  loadVoicePref();

  /* ----------------------------------------------------------
     Speech (English, Web Speech API)
  ---------------------------------------------------------- */
  const hasSpeech = "speechSynthesis" in window;

  // Approximate quality ranking: the actual sound quality of a browser voice
  // can't be known without playing it, but its name/lang usually hints at
  // whether it's a modern cloud/neural voice (great) or an old robotic
  // desktop one (flat). This is a best-effort default — the settings panel
  // lets a person override it by ear, which is the real fix.
  function scoreVoice(v) {
    let score = 0;
    if (/^en-US/i.test(v.lang)) score += 5;
    else if (/^en-GB/i.test(v.lang)) score += 4;
    else if (/^en/i.test(v.lang)) score += 3;
    else score -= 10;
    if (/google/i.test(v.name)) score += 6;
    if (/natural|neural|online|premium|enhanced|wavenet|studio/i.test(v.name)) score += 6;
    // Known pleasant-sounding voices across Chrome/Edge/Safari/iOS.
    if (/samantha|jenny|aria|zira|susan|karen|moira|tessa|fiona|ava|allison|nicky|zoe|libby|sonia|ryan|guy/i.test(v.name)) score += 3;
    if (v.localService === false) score += 1; // cloud voices tend to sound better
    if (/compact|espeak/i.test(v.name)) score -= 4; // known low-quality/robotic engines
    return score;
  }

  function englishVoices() {
    return state.voices.filter(v => /^en/i.test(v.lang));
  }

  function pickVoice() {
    if (!hasSpeech) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return;
    state.voices = voices;

    // Respect an explicit saved choice if it's still available.
    if (state.voiceName) {
      const saved = voices.find(v => v.name === state.voiceName);
      if (saved) { state.chosenVoice = saved; populateVoiceSelect(); return; }
    }
    const pool = englishVoices().length ? englishVoices() : voices;
    const best = pool.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
    state.chosenVoice = best || voices[0];
    populateVoiceSelect();
  }
  if (hasSpeech) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  // "style" gives each phrase a small, deliberate push away from a flat,
  // uniform rate/pitch — the biggest single reason canned TTS reads as
  // robotic is that every sentence is said identically. "excited" is used
  // for praise/celebration, "calm" for plain factual statements ("that is
  // number seven"), and no style is a friendly neutral default.
  function makeUtterance(text, style) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    let rate = state.voiceRate;
    let pitch = state.voicePitch;
    if (style === "excited") { rate *= 1.08; pitch += 0.12; }
    else if (style === "calm") { rate *= 0.95; pitch -= 0.03; }
    // Tiny random wobble on top so repeated phrases (e.g. "Great job!")
    // don't sound like the exact same recording every single time.
    pitch += (Math.random() * 0.06 - 0.03);
    rate += (Math.random() * 0.04 - 0.02);
    u.rate = Math.min(2, Math.max(0.1, rate));
    u.pitch = Math.min(2, Math.max(0, pitch));
    u.volume = 1;
    if (state.chosenVoice) u.voice = state.chosenVoice;
    return u;
  }

  function speak(text, style) {
    if (!hasSpeech || !state.soundOn) return;
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(makeUtterance(text, style));
    } catch (e) { /* ignore */ }
  }

  // Speaks several short phrases back-to-back with a natural pause between
  // them (queued utterances), instead of one long run-on sentence — this
  // alone makes the browser voice sound noticeably less flat/robotic.
  // Each part may be a plain string (neutral style) or {text, style}.
  function speakParts(parts) {
    if (!hasSpeech || !state.soundOn) return;
    try {
      window.speechSynthesis.cancel();
      parts.forEach(part => {
        const text = typeof part === "string" ? part : part.text;
        const style = typeof part === "string" ? undefined : part.style;
        window.speechSynthesis.speak(makeUtterance(text, style));
      });
    } catch (e) { /* ignore */ }
  }

  const PRAISE = [
    "Great job!", "Awesome!", "You did it!", "Fantastic!", "Wonderful!",
    "You're a star!", "Nice work!", "Amazing!", "Super job!", "Well done!"
  ];
  function randomPraise() {
    return PRAISE[Math.floor(Math.random() * PRAISE.length)];
  }

  /* ----------------------------------------------------------
     Screen navigation
  ---------------------------------------------------------- */
  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    // The one-time voice-settings hint only makes sense pointing at the
    // toolbar on the map screen — never let it linger into another screen
    // (e.g. sitting awkwardly over the mascot on the mission-complete card).
    if (id !== "screen-map") {
      const bubble = document.getElementById("voice-hint-bubble");
      if (bubble) bubble.remove();
    }
  }

  /* ----------------------------------------------------------
     Sound toggle button
  ---------------------------------------------------------- */
  const soundToggleBtn = document.getElementById("sound-toggle");
  const soundIcon = document.getElementById("sound-icon");
  function refreshSoundIcon() {
    soundIcon.textContent = state.soundOn ? "🔊" : "🔇";
  }
  refreshSoundIcon();
  soundToggleBtn.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    saveSoundPref();
    refreshSoundIcon();
    if (state.soundOn) speak("Sound on");
  });

  /* ----------------------------------------------------------
     Voice settings panel
  ---------------------------------------------------------- */
  const settingsToggleBtn = document.getElementById("settings-toggle");
  const settingsOverlay = document.getElementById("settings-overlay");
  const voiceSelectEl = document.getElementById("voice-select");
  const rateSliderEl = document.getElementById("rate-slider");
  const pitchSliderEl = document.getElementById("pitch-slider");

  function populateVoiceSelect() {
    if (!voiceSelectEl) return;
    const pool = englishVoices().length ? englishVoices() : state.voices;
    const sorted = pool.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a));
    voiceSelectEl.innerHTML = "";
    if (!sorted.length) {
      const opt = document.createElement("option");
      opt.textContent = "No voices found on this device";
      voiceSelectEl.appendChild(opt);
      return;
    }
    sorted.forEach((v, i) => {
      const opt = document.createElement("option");
      opt.value = v.name;
      opt.textContent = (i === 0 ? "⭐ " : "") + v.name + " (" + v.lang + ")" + (i === 0 ? " — recommended" : "");
      if (state.chosenVoice && v.name === state.chosenVoice.name) opt.selected = true;
      voiceSelectEl.appendChild(opt);
    });
  }

  rateSliderEl.value = state.voiceRate;
  pitchSliderEl.value = state.voicePitch;

  settingsToggleBtn.addEventListener("click", () => {
    populateVoiceSelect();
    settingsOverlay.classList.remove("hidden");
  });
  document.getElementById("btn-close-settings").addEventListener("click", () => {
    settingsOverlay.classList.add("hidden");
  });
  settingsOverlay.addEventListener("click", (e) => {
    if (e.target === settingsOverlay) settingsOverlay.classList.add("hidden");
  });
  voiceSelectEl.addEventListener("change", () => {
    const found = state.voices.find(v => v.name === voiceSelectEl.value);
    if (found) {
      state.chosenVoice = found;
      state.voiceName = found.name;
      saveVoicePref();
    }
  });
  rateSliderEl.addEventListener("input", () => {
    state.voiceRate = parseFloat(rateSliderEl.value);
    saveVoicePref();
  });
  pitchSliderEl.addEventListener("input", () => {
    state.voicePitch = parseFloat(pitchSliderEl.value);
    saveVoicePref();
  });
  document.getElementById("btn-test-voice").addEventListener("click", () => {
    const wasOn = state.soundOn;
    state.soundOn = true;
    speakParts([{ text: "Hi! I'm your counting buddy.", style: "excited" }, { text: "Let's trace some numbers together!" }]);
    state.soundOn = wasOn;
  });

  /* ----------------------------------------------------------
     Title screen
  ---------------------------------------------------------- */
  const btnStart = document.getElementById("btn-start");
  const btnContinue = document.getElementById("btn-continue");
  const btnReset = document.getElementById("btn-reset");
  const titleMascotBubble = document.getElementById("title-mascot-bubble");

  function refreshTitleButtons() {
    const hasProgress = state.progress.current > 1 || state.progress.completed.length > 0;
    btnStart.classList.toggle("hidden", hasProgress);
    btnContinue.classList.toggle("hidden", !hasProgress);
    if (titleMascotBubble) {
      titleMascotBubble.textContent = hasProgress ? "Let's keep going!" : "Let's count to 100!";
    }
  }
  refreshTitleButtons();

  btnStart.addEventListener("click", () => {
    openMap(1);
  });
  btnContinue.addEventListener("click", () => {
    openMap(state.progress.current);
  });
  btnReset.addEventListener("click", () => {
    if (confirm("Reset all progress and stars? This cannot be undone.")) {
      state.progress = { completed: [], current: 1, stars: 0 };
      saveProgress();
      refreshTitleButtons();
      speak("Progress reset");
    }
  });

  /* ----------------------------------------------------------
     Map screen
  ---------------------------------------------------------- */
  const mapNodesEl = document.getElementById("map-nodes");
  const mapPathEl = document.getElementById("map-path");
  const mapScrollEl = document.getElementById("map-scroll");
  const decadeTabsEl = document.getElementById("decade-tabs");
  const mapProgressFill = document.getElementById("map-progress-fill");
  const mapProgressLabel = document.getElementById("map-progress-label");
  const starsCountEl = document.getElementById("stars-count");

  const COLS = [12, 31, 50, 69, 88]; // percentage left positions
  const ROW_HEIGHT = 108; // px

  function nodePosition(n) {
    const idx = n - 1;
    const row = Math.floor(idx / COLS.length);
    let colIdx = idx % COLS.length;
    const rowIsReversed = row % 2 === 1;
    if (rowIsReversed) colIdx = COLS.length - 1 - colIdx;
    const leftPct = COLS[colIdx];
    const top = 50 + row * ROW_HEIGHT;
    return { leftPct, top, row };
  }

  function missionStatus(n) {
    if (state.progress.completed.includes(n)) return "done";
    if (n === state.progress.current) return "current";
    return "locked";
  }

  function buildMap() {
    mapNodesEl.innerHTML = "";
    const frag = document.createDocumentFragment();
    let maxRow = 0;

    for (let n = 1; n <= TOTAL_MISSIONS; n++) {
      const pos = nodePosition(n);
      maxRow = Math.max(maxRow, pos.row);
      const status = missionStatus(n);

      const node = document.createElement("button");
      node.className = "mission-node " + status;
      node.id = "node-" + n;
      node.style.left = pos.leftPct + "%";
      node.style.top = pos.top + "px";
      node.setAttribute("aria-label", "Mission " + n);
      node.innerHTML = status === "locked" ? "🔒" : String(n);
      if (status === "done") {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "⭐";
        node.appendChild(badge);
      }
      node.addEventListener("click", () => onNodeClick(n, status));
      frag.appendChild(node);
    }
    mapNodesEl.appendChild(frag);
    mapNodesEl.style.height = (50 + maxRow * ROW_HEIGHT + 80) + "px";

    requestAnimationFrame(drawMapPath);
  }

  // Smooths the node-to-node path into gentle curves using each node as the
  // control point for a quadratic curve to the midpoint of the next segment.
  function drawMapPath() {
    const containerRect = mapNodesEl.getBoundingClientRect();
    const w = containerRect.width;
    const h = mapNodesEl.offsetHeight;
    mapPathEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
    mapPathEl.setAttribute("width", w);
    mapPathEl.setAttribute("height", h);
    mapPathEl.innerHTML = "";

    const points = [];
    for (let n = 1; n <= TOTAL_MISSIONS; n++) {
      const pos = nodePosition(n);
      points.push({ x: (pos.leftPct / 100) * w, y: pos.top });
    }

    let d = `M ${points[0].x} ${points[0].y} `;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1], p1 = points[i];
      if (i < points.length - 1) {
        const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
        d += `Q ${p0.x} ${p0.y} ${mx} ${my} `;
      } else {
        d += `Q ${p0.x} ${p0.y} ${p1.x} ${p1.y} `;
      }
    }

    const ns = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(ns, "defs");
    const grad = document.createElementNS(ns, "linearGradient");
    grad.setAttribute("id", "quest-grad");
    grad.setAttribute("x1", "0%"); grad.setAttribute("y1", "0%");
    grad.setAttribute("x2", "0%"); grad.setAttribute("y2", "100%");
    const stop1 = document.createElementNS(ns, "stop");
    stop1.setAttribute("offset", "0%"); stop1.setAttribute("stop-color", "#1e88e5");
    const stop2 = document.createElementNS(ns, "stop");
    stop2.setAttribute("offset", "100%"); stop2.setAttribute("stop-color", "#22b06b");
    grad.appendChild(stop1); grad.appendChild(stop2);
    defs.appendChild(grad);

    const path = document.createElementNS(ns, "path");
    path.setAttribute("class", "quest-flow");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "url(#quest-grad)");
    path.setAttribute("stroke-width", "8");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-dasharray", "2 22");
    path.setAttribute("opacity", "0.6");

    mapPathEl.appendChild(defs);
    mapPathEl.appendChild(path);
  }

  function buildDecadeTabs() {
    decadeTabsEl.innerHTML = "";
    for (let d = 0; d < 10; d++) {
      const startN = d * 10 + 1;
      const endN = d * 10 + 10;
      const tab = document.createElement("button");
      tab.className = "decade-tab";
      tab.textContent = startN + "-" + endN;
      const locked = startN > state.progress.current;
      tab.classList.toggle("locked", locked);
      tab.addEventListener("click", () => {
        const target = document.getElementById("node-" + startN);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
        highlightDecadeTab(d);
      });
      tab.dataset.decade = d;
      decadeTabsEl.appendChild(tab);
    }
  }

  function highlightDecadeTab(idx) {
    decadeTabsEl.querySelectorAll(".decade-tab").forEach((t, i) => {
      t.classList.toggle("active", i === idx);
    });
  }

  function refreshMapMeta() {
    const doneCount = state.progress.completed.length;
    mapProgressFill.style.width = (doneCount / TOTAL_MISSIONS * 100) + "%";
    mapProgressLabel.textContent = doneCount + " / " + TOTAL_MISSIONS;
    starsCountEl.textContent = state.progress.stars;
  }

  let toastTimer = null;
  function showToast(msg) {
    let toast = document.getElementById("nq-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "nq-toast";
      toast.className = "nq-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    requestAnimationFrame(() => { toast.style.opacity = "1"; });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.opacity = "0"; }, 1800);
  }

  const VOICE_HINT_KEY = "numberquest_voice_hint_seen_v1";
  function maybeShowVoiceHint() {
    if (!hasSpeech) return;
    if (document.getElementById("voice-hint-bubble")) return;
    try { if (localStorage.getItem(VOICE_HINT_KEY)) return; } catch (e) {}
    const bubble = document.createElement("div");
    bubble.id = "voice-hint-bubble";
    bubble.className = "voice-hint-bubble";
    bubble.textContent = "🎤 Tap here to pick the best-sounding voice for this device";
    document.body.appendChild(bubble);
    requestAnimationFrame(() => bubble.classList.add("show"));
    const dismiss = () => {
      try { localStorage.setItem(VOICE_HINT_KEY, "1"); } catch (e) {}
      bubble.classList.remove("show");
      setTimeout(() => bubble.remove(), 300);
    };
    settingsToggleBtn.addEventListener("click", dismiss, { once: true });
    setTimeout(dismiss, 7000);
  }

  function onNodeClick(n, status) {
    if (status === "locked") {
      showToast("Finish the missions before this one first!");
      const el = document.getElementById("node-" + n);
      el.style.animation = "shake .4s ease";
      setTimeout(() => { el.style.animation = ""; }, 400);
      return;
    }
    state.isReplay = status === "done";
    startMission(n);
  }

  function openMap(scrollToMission) {
    buildDecadeTabs();
    buildMap();
    refreshMapMeta();
    showScreen("screen-map");
    const decadeIdx = Math.floor((scrollToMission - 1) / 10);
    highlightDecadeTab(decadeIdx);
    requestAnimationFrame(() => {
      const target = document.getElementById("node-" + scrollToMission);
      if (target) target.scrollIntoView({ behavior: "auto", block: "center" });
    });
    setTimeout(maybeShowVoiceHint, 900);
  }

  document.getElementById("btn-map-home").addEventListener("click", () => {
    refreshTitleButtons();
    showScreen("screen-title");
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (document.getElementById("screen-map").classList.contains("active")) {
        drawMapPath();
      }
      // Orientation changes (phone/tablet rotation) resize the tracing box —
      // re-fit the canvas so strokes aren't stretched or clipped. This
      // clears any in-progress trace, which is an acceptable trade-off for
      // a rare event (kids rarely rotate mid-trace).
      if (document.getElementById("screen-trace").classList.contains("active")) {
        resizeCanvasToDisplay();
        traceCtx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
      }
    }, 150);
  });

  /* ----------------------------------------------------------
     Mission: Count & Match
  ---------------------------------------------------------- */
  const countMissionNumEl = document.getElementById("count-mission-num");
  const quantityDisplayEl = document.getElementById("quantity-display");
  const choiceRowEl = document.getElementById("choice-row");
  const countFeedbackEl = document.getElementById("count-feedback");

  function iconForMission(n) {
    return ICONS[(n - 1) % ICONS.length];
  }

  function sizeClassForN(n) {
    if (n > 70) return "tiny";
    if (n > 30) return "small";
    return "";
  }

  // Renders the quantity as one or more ten-frames: a bordered 5x2 grid per
  // group of ten, filled cells holding the icon and empty cells dashed —
  // so kids can see "how many more to make ten" at a glance.
  function renderQuantity(n) {
    quantityDisplayEl.innerHTML = "";
    const icon = iconForMission(n);
    const sizeClass = sizeClassForN(n);
    let remaining = n;
    let groupIdx = 0;
    while (remaining > 0) {
      const count = Math.min(10, remaining);
      const frame = document.createElement("div");
      frame.className = "tenframe " + (groupIdx % 2 === 0 ? "group-blue" : "group-green");
      for (let i = 0; i < 10; i++) {
        const cell = document.createElement("div");
        if (i < count) {
          cell.className = "tf-cell filled " + sizeClass;
          cell.textContent = icon;
          cell.style.animationDelay = (i * 0.03) + "s";
        } else {
          cell.className = "tf-cell empty " + sizeClass;
        }
        frame.appendChild(cell);
      }
      quantityDisplayEl.appendChild(frame);
      remaining -= count;
      groupIdx++;
    }
  }

  function generateChoices(correct) {
    const choices = new Set([correct]);
    const spread = correct <= 10 ? 3 : (correct <= 30 ? 6 : 10);
    let guard = 0;
    while (choices.size < 3 && guard < 200) {
      guard++;
      const delta = Math.floor(Math.random() * spread * 2) - spread;
      const candidate = correct + delta;
      if (candidate >= 1 && candidate <= 100 && candidate !== correct) {
        choices.add(candidate);
      }
    }
    // fallback fill, extremely unlikely to be needed
    let fallback = 1;
    while (choices.size < 3 && fallback <= 100) {
      choices.add(fallback);
      fallback++;
    }
    return shuffle(Array.from(choices));
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function renderChoices(n) {
    choiceRowEl.innerHTML = "";
    countFeedbackEl.textContent = "";
    countFeedbackEl.className = "feedback-text";
    const options = generateChoices(n);
    options.forEach(val => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = String(val);
      btn.addEventListener("click", () => onChoiceClick(btn, val, n));
      choiceRowEl.appendChild(btn);
    });
  }

  function onChoiceClick(btn, val, correctN) {
    if (btn.classList.contains("correct")) return; // already solved
    if (val === correctN) {
      btn.classList.add("correct");
      choiceRowEl.querySelectorAll(".choice-btn").forEach(b => (b.disabled = true));
      countFeedbackEl.textContent = randomPraise() + " That's " + correctN + "!";
      countFeedbackEl.className = "feedback-text good";
      speakParts([
        { text: randomPraise(), style: "excited" },
        { text: "That is number " + numberToWords(correctN) + ".", style: "calm" }
      ]);
      setTimeout(() => startTrace(correctN), 1100);
    } else {
      btn.classList.add("wrong");
      countFeedbackEl.textContent = "Try again!";
      countFeedbackEl.className = "feedback-text bad";
      speak("Try again!", "calm");
      setTimeout(() => btn.classList.remove("wrong"), 420);
    }
  }

  function startMission(n) {
    state.activeMission = n;
    countMissionNumEl.textContent = n;
    renderQuantity(n);
    renderChoices(n);
    showScreen("screen-count");
    speak("How many do you see?");
  }

  document.getElementById("btn-count-back").addEventListener("click", () => {
    openMap(state.activeMission);
  });

  /* ----------------------------------------------------------
     Mission: Trace
  ---------------------------------------------------------- */
  const traceMissionNumEl = document.getElementById("trace-mission-num");
  const traceGuideEl = document.getElementById("trace-guide");
  const traceWrapEl = document.getElementById("trace-wrap");
  const traceCanvas = document.getElementById("trace-canvas");
  const traceCtx = traceCanvas.getContext("2d");

  function fontSizeForN(n) {
    const len = String(n).length;
    if (len === 1) return 260;
    if (len === 2) return 185;
    return 128; // "100"
  }

  function renderTraceGuide(n) {
    traceGuideEl.innerHTML = "";
    const size = fontSizeForN(n);
    const ns = "http://www.w3.org/2000/svg";

    const defs = document.createElementNS(ns, "defs");
    const grad = document.createElementNS(ns, "linearGradient");
    grad.setAttribute("id", "trace-grad");
    grad.setAttribute("x1", "0%"); grad.setAttribute("y1", "0%");
    grad.setAttribute("x2", "100%"); grad.setAttribute("y2", "100%");
    const st1 = document.createElementNS(ns, "stop");
    st1.setAttribute("offset", "0%"); st1.setAttribute("stop-color", "#8fd0ff");
    const st2 = document.createElementNS(ns, "stop");
    st2.setAttribute("offset", "100%"); st2.setAttribute("stop-color", "#a4eec2");
    grad.appendChild(st1); grad.appendChild(st2);
    defs.appendChild(grad);
    traceGuideEl.appendChild(defs);

    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", "200");
    text.setAttribute("y", "200");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-family", "'Baloo 2', 'Fredoka', system-ui, sans-serif");
    text.setAttribute("font-weight", "700");
    text.setAttribute("font-size", String(size));
    text.setAttribute("fill", "none");
    text.setAttribute("stroke", "url(#trace-grad)");
    text.setAttribute("stroke-width", "3.5");
    text.setAttribute("stroke-dasharray", "10 9");
    text.setAttribute("paint-order", "stroke");
    text.textContent = String(n);
    traceGuideEl.appendChild(text);
  }

  function resizeCanvasToDisplay() {
    const rect = traceCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    traceCanvas.width = rect.width * dpr;
    traceCanvas.height = rect.height * dpr;
    traceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    traceCtx.lineWidth = 16;
    traceCtx.lineCap = "round";
    traceCtx.lineJoin = "round";
  }

  let drawing = false;
  let strokeCount = 0;
  let sparkleCounter = 0;
  let traceAttempts = 0;
  const MAX_GENTLE_RETRIES = 2; // after this many soft corrections, accept any honest attempt
  const strokeColors = ["#1e88e5", "#22b06b", "#3aa0f0", "#3fc881"];

  function getPos(evt) {
    const rect = traceCanvas.getBoundingClientRect();
    const point = evt.touches ? evt.touches[0] : evt;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  }

  function spawnSparkle(x, y) {
    const s = document.createElement("div");
    s.className = "trace-sparkle";
    s.textContent = Math.random() < 0.5 ? "✨" : "⭐";
    s.style.left = x + "px";
    s.style.top = y + "px";
    s.style.color = Math.random() < 0.5 ? "#1e88e5" : "#22b06b";
    traceWrapEl.appendChild(s);
    setTimeout(() => s.remove(), 600);
  }

  function startDraw(evt) {
    evt.preventDefault();
    drawing = true;
    strokeCount++;
    traceCtx.strokeStyle = strokeColors[strokeCount % strokeColors.length];
    const pos = getPos(evt);
    traceCtx.beginPath();
    traceCtx.moveTo(pos.x, pos.y);
  }
  function moveDraw(evt) {
    if (!drawing) return;
    evt.preventDefault();
    const pos = getPos(evt);
    traceCtx.lineTo(pos.x, pos.y);
    traceCtx.stroke();
    sparkleCounter++;
    if (sparkleCounter % 4 === 0) spawnSparkle(pos.x, pos.y);
  }
  function endDraw(evt) {
    drawing = false;
  }

  traceCanvas.addEventListener("pointerdown", startDraw);
  traceCanvas.addEventListener("pointermove", moveDraw);
  window.addEventListener("pointerup", endDraw);
  traceCanvas.addEventListener("touchstart", startDraw, { passive: false });
  traceCanvas.addEventListener("touchmove", moveDraw, { passive: false });
  traceCanvas.addEventListener("touchend", endDraw);

  document.getElementById("btn-clear-trace").addEventListener("click", () => {
    traceCtx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
  });
  document.getElementById("btn-hear-number").addEventListener("click", () => {
    speak("Number " + numberToWords(state.activeMission));
  });
  document.getElementById("btn-trace-back").addEventListener("click", () => {
    openMap(state.activeMission);
  });

  // Checks whether the child's strokes actually followed the numeral's
  // shape — not just landed somewhere near it. Three signals, combined:
  //  - "precision": what fraction of their ink falls inside a fitted
  //    tolerance channel around the numeral (rejects ink that strays far
  //    off, or a scribble that fills the whole box)
  //  - "coverage": using a grid over the canvas, what fraction of the
  //    grid cells the numeral actually passes through also got traced —
  //    this catches a dense blob in the middle that never reaches the
  //    number's top/bottom/ends, which raw pixel-ratio coverage would miss
  //  - "span": their drawing's bounding box must stretch across roughly
  //    the same area as the numeral's, so a small scribble in one corner
  //    (that happens to sit inside a wide channel) still fails
  // This stays a forgiving check for a Pre-K/K hand, not a precision
  // grader — a wobbly but genuine attempt at the number's shape passes.
  function validateTrace(n) {
    const rect = traceCanvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));

    const mask = document.createElement("canvas");
    mask.width = w; mask.height = h;
    const mctx = mask.getContext("2d");
    // fontSizeForN() was tuned for the guide's fixed 400×400 SVG viewBox;
    // scale proportionally to this canvas's actual on-screen size.
    const fontSize = fontSizeForN(n) * (w / 400);
    mctx.font = "700 " + fontSize + "px 'Baloo 2', 'Fredoka', system-ui, sans-serif";
    mctx.textAlign = "center";
    mctx.textBaseline = "middle";
    mctx.lineJoin = "round";
    mctx.lineCap = "round";
    mctx.lineWidth = Math.max(18, w * 0.075); // fitted tolerance channel around the numeral
    mctx.strokeStyle = "#000";
    mctx.strokeText(String(n), w / 2, h / 2);
    mctx.fillStyle = "#000";
    mctx.fillText(String(n), w / 2, h / 2);
    const maskData = mctx.getImageData(0, 0, w, h).data;

    // Downsample the child's drawing to the same size for a pixel-aligned
    // comparison (drawImage handles any devicePixelRatio scaling for us).
    const sample = document.createElement("canvas");
    sample.width = w; sample.height = h;
    const sctx = sample.getContext("2d");
    sctx.drawImage(traceCanvas, 0, 0, w, h);
    const userData = sctx.getImageData(0, 0, w, h).data;

    const GRID_N = 10;
    const targetCells = new Set(), hitCells = new Set();
    let mMinX = w, mMinY = h, mMaxX = 0, mMaxY = 0;
    let uMinX = w, uMinY = h, uMaxX = 0, uMaxY = 0;

    const step = 2;
    let inkPixels = 0, inkOnTarget = 0, samples = 0;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        samples++;
        const idx = (y * w + x) * 4;
        const userInk = userData[idx + 3] > 40;
        const onNumber = maskData[idx + 3] > 40;
        const cellKey = onNumber || userInk ? ((x / w * GRID_N) | 0) + "," + ((y / h * GRID_N) | 0) : null;

        if (onNumber) {
          if (x < mMinX) mMinX = x; if (x > mMaxX) mMaxX = x;
          if (y < mMinY) mMinY = y; if (y > mMaxY) mMaxY = y;
          targetCells.add(cellKey);
          if (userInk) hitCells.add(cellKey);
        }
        if (userInk) {
          inkPixels++;
          if (onNumber) inkOnTarget++;
          if (x < uMinX) uMinX = x; if (x > uMaxX) uMaxX = x;
          if (y < uMinY) uMinY = y; if (y > uMaxY) uMaxY = y;
        }
      }
    }

    if (inkPixels < samples * 0.006) return { ok: false, reason: "empty" };

    const precision = inkPixels ? inkOnTarget / inkPixels : 0;
    const coverage = targetCells.size ? hitCells.size / targetCells.size : 0;

    const maskW = Math.max(1, mMaxX - mMinX), maskH = Math.max(1, mMaxY - mMinY);
    const inkW = Math.max(0, uMaxX - uMinX), inkH = Math.max(0, uMaxY - uMinY);
    // Area-based span check (rather than separate width/height ratios):
    // a narrow glyph like "1" has a tall-and-thin mask bbox, so a single
    // straight vertical stroke naturally covers less of its *width* than
    // a curvier digit would — comparing bbox area sidesteps having to
    // hand-tune per-axis thresholds for every glyph's aspect ratio, while
    // still failing a small localized scribble that never reaches across
    // the numeral either way.
    const spanOk = (inkW * inkH) >= (maskW * maskH * 0.22);

    const ok = precision >= 0.42 && coverage >= 0.45 && spanOk;
    return { ok, reason: "off-track", precision, coverage, spanOk };
  }

  document.getElementById("btn-done-trace").addEventListener("click", () => {
    const n = state.activeMission;
    const result = validateTrace(n);

    if (result.ok || traceAttempts >= MAX_GENTLE_RETRIES) {
      completeMission(n);
      return;
    }

    traceAttempts++;
    showToast("Try again!");
    speak("Try again!", "calm");
    traceGuideEl.classList.remove("guide-hint");
    // restart the CSS animation even if it's already been triggered once
    void traceGuideEl.offsetWidth;
    traceGuideEl.classList.add("guide-hint");
  });

  function startTrace(n) {
    state.activeMission = n;
    traceAttempts = 0;
    traceMissionNumEl.textContent = n;
    renderTraceGuide(n);
    showScreen("screen-trace");
    requestAnimationFrame(() => {
      resizeCanvasToDisplay();
      traceCtx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
    });
    speak("Now trace the number " + numberToWords(n));
  }

  /* ----------------------------------------------------------
     Mission: Complete
  ---------------------------------------------------------- */
  const completeNumberEl = document.getElementById("complete-number");
  const btnNextMission = document.getElementById("btn-next-mission");
  const confettiLayer = document.getElementById("confetti-layer");

  function fireConfetti() {
    confettiLayer.innerHTML = "";
    const colors = ["#1e88e5", "#22b06b", "#3aa0f0", "#3fc881", "#8fd0ff", "#a4eec2"];
    const shapes = ["square", "circle", "star"];
    for (let i = 0; i < 40; i++) {
      const piece = document.createElement("div");
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      piece.className = "confetti-piece shape-" + shape;
      piece.style.left = Math.random() * 100 + "%";
      piece.style.animationDuration = (1.8 + Math.random() * 1.4) + "s";
      piece.style.animationDelay = (Math.random() * 0.4) + "s";
      if (shape === "star") {
        piece.textContent = Math.random() < 0.5 ? "⭐" : "🎉";
      } else {
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      }
      confettiLayer.appendChild(piece);
    }
    setTimeout(() => { confettiLayer.innerHTML = ""; }, 3200);
  }

  function completeMission(n) {
    const wasAlreadyDone = state.progress.completed.includes(n);
    if (!wasAlreadyDone && n === state.progress.current) {
      state.progress.completed.push(n);
      state.progress.current = n + 1;
      state.progress.stars += 3;
      saveProgress();
    }
    completeNumberEl.textContent = n;
    showScreen("screen-complete");
    fireConfetti();
    speakParts([
      { text: randomPraise(), style: "excited" },
      { text: "You wrote number " + numberToWords(n) + "!", style: "excited" }
    ]);

    if (n >= TOTAL_MISSIONS) {
      btnNextMission.textContent = "🏆 All Done!";
      btnNextMission.onclick = () => openMap(TOTAL_MISSIONS);
    } else {
      btnNextMission.textContent = "Next Mission ▶";
      btnNextMission.onclick = () => {
        const next = Math.min(n + 1, TOTAL_MISSIONS);
        startMission(next);
      };
    }
  }

  document.getElementById("btn-back-map").addEventListener("click", () => {
    openMap(state.activeMission);
  });

  /* ----------------------------------------------------------
     Init
  ---------------------------------------------------------- */
  refreshTitleButtons();
  showScreen("screen-title");
})();
