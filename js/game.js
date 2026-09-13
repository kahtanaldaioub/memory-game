const { getScores, saveScores } = window.memoryStorage;
const { el, formatTime } = window.memoryUi;
const board = document.querySelector("#gameBoard");
const setupModal = document.querySelector("#setupModal");
const resultModal = document.querySelector("#resultModal");
const difficultySettings = {
  easy: { pairs: 6, baseScore: 300 },
  normal: { pairs: 8, baseScore: 500 },
  hard: { pairs: 10, baseScore: 700 },
};
const themeSymbols = {
  classic: ["♚", "♛", "♜", "♝", "♞", "♟", "⚀", "⚂", "⚄", "⚅"],
  horror: ["☠", "🕷", "🦇", "👁", "🕸", "⚰", "🩸", "🕯", "🪦", "🔮"],
  funky: ["★", "♫", "☮", "☻", "✌", "❤", "☼", "⚡", "♪", "✺"],
};
const themeStories = {
  classic:
    "Every pair you remember is a small victory for focus. Keep the rhythm and trust your memory.",
  horror:
    "The shadows hide every clue. Face the unknown, remember the signs, and find your way out.",
  funky:
    "Let the colors bounce and the beat guide you. A playful mind can turn every mistake into momentum.",
};
let audioContext;
let game = {
  difficulty: "easy",
  theme: "classic",
  tries: 0,
  matched: 0,
  combo: 0,
  maxCombo: 0,
  startedAt: 0,
  pausedAt: 0,
  timer: null,
  locked: false,
  paused: false,
  firstCard: null,
  scoreSaved: false,
};
let muted = localStorage.getItem("memory-match-muted") === "on";

const tone = (
  frequency,
  duration,
  type = "sine",
  volume = 0.05,
  endFrequency = frequency,
) => {
  if (muted) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audioContext ||= new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(1, endFrequency),
    audioContext.currentTime + duration,
  );
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + duration,
  );
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
};
const playSound = (event) => {
  const pack = { classic: "classic", horror: "funny", funky: "arcade" }[
    game.theme
  ];

  if (pack === "funny") {
    if (event === "flip") {
      tone(260, 0.12, "sawtooth", 0.035, 520);
      setTimeout(() => tone(520, 0.08, "square", 0.03, 380), 90);
    }
    if (event === "match") {
      tone(392, 0.1, "square", 0.05, 523);
      setTimeout(() => tone(523, 0.1, "square", 0.05, 784), 80);
      setTimeout(() => tone(784, 0.18, "square", 0.05, 1046), 160);
      setTimeout(() => tone(1046, 0.14, "triangle", 0.04, 523), 260);
    }
    if (event === "wrong") {
      tone(360, 0.14, "sawtooth", 0.05, 220);
      setTimeout(() => tone(220, 0.14, "sawtooth", 0.05, 130), 120);
      setTimeout(() => tone(130, 0.22, "sawtooth", 0.045, 65), 250);
    }
    if (event === "start") {
      tone(196, 0.1, "triangle", 0.04, 294);
      setTimeout(() => tone(294, 0.1, "triangle", 0.04, 392), 100);
      setTimeout(() => tone(392, 0.22, "sawtooth", 0.04, 660), 200);
    }
    if (event === "win") {
      [392, 523, 659, 784, 1046, 1318].forEach((f, i) =>
        setTimeout(() => tone(f, 0.14, "square", 0.045, f * 1.25), i * 90),
      );
      setTimeout(() => tone(1568, 0.3, "triangle", 0.04, 784), 600);
    }
    return;
  }

  if (pack === "arcade") {
    if (event === "flip") {
      tone(660, 0.05, "square", 0.04, 990);
      setTimeout(() => tone(990, 0.04, "square", 0.035, 1320), 35);
    }
    if (event === "match") {
      [523, 659, 784, 1046, 1318].forEach((f, i) =>
        setTimeout(() => tone(f, 0.07, "square", 0.04), i * 45),
      );
      setTimeout(() => tone(1568, 0.18, "square", 0.045, 1568), 240);
    }
    if (event === "wrong") {
      tone(240, 0.1, "square", 0.05, 160);
      setTimeout(() => tone(160, 0.1, "square", 0.05, 110));
      setTimeout(() => tone(110, 0.18, "square", 0.045, 55), 180);
    }
    if (event === "start") {
      [330, 440, 554, 659, 880].forEach((f, i) =>
        setTimeout(() => tone(f, 0.07, "square", 0.04), i * 45),
      );
      setTimeout(() => tone(1108, 0.22, "square", 0.045, 1108), 260);
    }
    if (event === "win") {
      const seq = [659, 784, 988, 1318, 988, 1318, 1568, 2093];
      seq.forEach((f, i) =>
        setTimeout(() => tone(f, 0.09, "square", 0.04), i * 70),
      );
      setTimeout(
        () => tone(2093, 0.35, "square", 0.045, 2093),
        seq.length * 70,
      );
    }
    return;
  }

  if (event === "flip") {
    tone(523, 0.08, "sine", 0.04, 659);
  }
  if (event === "match") {
    tone(659, 0.12, "sine", 0.045, 880);
    setTimeout(() => tone(880, 0.18, "sine", 0.04, 1046), 110);
  }
  if (event === "wrong") {
    tone(330, 0.14, "triangle", 0.04, 262);
    setTimeout(() => tone(262, 0.16, "sine", 0.035, 196), 130);
  }
  if (event === "start") {
    tone(392, 0.12, "sine", 0.04, 523);
    setTimeout(() => tone(523, 0.14, "sine", 0.04, 659), 110);
    setTimeout(() => tone(659, 0.22, "sine", 0.045, 784), 220);
  }
  if (event === "win") {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => tone(f, 0.22, "sine", 0.045, f * 1.5), i * 140),
    );
    setTimeout(() => tone(1568, 0.4, "triangle", 0.04, 1046), 620);
  }
};
const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const getCards = (pairs) =>
  shuffle(
    [...Array(pairs)]
      .map((_, index) => ({
        id: index,
        symbol: themeSymbols[game.theme][index],
      }))
      .flatMap((item) => [item, { ...item }]),
  );

const elapsedSeconds = () => {
  if (!game.startedAt) return 0;
  return Math.floor(
    ((game.paused ? game.pausedAt : Date.now()) - game.startedAt) / 1000,
  );
};
const updateHud = () => {
  const pairs = difficultySettings[game.difficulty].pairs;
  el("triesCount").textContent = game.tries;
  el("timeCount").textContent = formatTime(elapsedSeconds());
  el("scoreCount").textContent = game.score || 0;
  el("progressCount").textContent = `${game.matched} / ${pairs}`;
  el("comboCount").textContent = `${game.combo}x`;
  el("progressBar").style.width = `${(game.matched / pairs) * 100}%`;
};

const renderLeaderboard = () => {
  const scores = getScores().sort(
    (first, second) => second.points - first.points,
  );
  el("leaderboardList").innerHTML = scores.length
    ? scores
        .map(
          (score) =>
            `<li><span>${score.name}</span><small>${score.difficulty || "classic"} · ${formatTime(score.time)} · ${score.tries} tries</small><strong class="score-value">${score.points}</strong></li>`,
        )
        .join("")
    : "<li><span>No scores yet</span></li>";
};
const stopTimer = () => clearInterval(game.timer);
const startClock = () => {
  if (game.startedAt) return;
  game.startedAt = Date.now();
  game.timer = setInterval(updateHud, 1000);
  el("pauseButton").disabled = false;
};
const burstParticles = () => {
  const colors = ["var(--accent)", "#ffd166", "#7bdff2", "#f7aef8"];
  for (let index = 0; index < 28; index++) {
    const particle = document.createElement("i");
    particle.className = "particle";
    particle.style.setProperty("--x", `${Math.random() * 100}%`);
    particle.style.setProperty("--delay", `${Math.random() * 0.35}s`);
    particle.style.setProperty("--color", colors[index % colors.length]);
    el("gameBoard").appendChild(particle);
    setTimeout(() => particle.remove(), 1300);
  }
};
const saveCurrentScore = () => {
  if (!game.score || game.scoreSaved || !el("saveScoreCheckbox").checked)
    return;
  const scores = getScores();
  scores.push({
    name: (el("playerName").value.trim() || "Player").slice(0, 16),
    difficulty: game.difficulty,
    points: game.score,
    time: elapsedSeconds(),
    tries: game.tries,
  });
  saveScores(scores);
  game.scoreSaved = true;
  el("saveScoreButton").textContent = "Score saved";
  el("saveScoreButton").disabled = true;
  renderLeaderboard();
};
const finishGame = (won) => {
  stopTimer();
  const settings = difficultySettings[game.difficulty];
  const elapsed = elapsedSeconds();
  const wrongPairs = game.tries - game.matched;
  const speedBonus = Math.max(0, 500 - elapsed * 3);
  const pairBonus = game.matched * 40;
  const comboBonus = Math.max(0, game.maxCombo - 1) * 35;
  const perfectBonus = wrongPairs === 0 ? 250 : 0;
  game.score = won
    ? settings.baseScore +
      pairBonus +
      speedBonus +
      comboBonus +
      perfectBonus -
      wrongPairs * 55
    : 0;
  if (won) {
    playSound("win");
    burstParticles();
  }
  el("resultKicker").textContent = won
    ? wrongPairs === 0
      ? "Perfect round"
      : "Round complete"
    : "Round over";
  el("resultTitle").textContent = won ? "You did it!" : "Round stopped";
  el("resultSummary").textContent = won
    ? `Score ${game.score} · ${formatTime(elapsed)} · ${game.tries} tries${wrongPairs === 0 ? " · Perfect match streak" : ""}`
    : "Your score was not added.";
  el("scoreBreakdown").innerHTML = won
    ? `<span>Base <b>${settings.baseScore}</b></span><span>Pairs <b>+${pairBonus}</b></span><span>Speed <b>+${speedBonus}</b></span><span>Combo <b>+${comboBonus}</b></span><span>Mistakes <b>-${wrongPairs * 55}</b></span><span>Perfect <b>+${perfectBonus}</b></span>`
    : "";
  el("saveScoreOption").hidden = !won;
  el("saveScoreButton").hidden = !won;
  el("saveScoreButton").disabled = false;
  el("saveScoreButton").textContent = "Save score";
  setTimeout(() => {
	resultModal.classList.remove("hidden");
	el("saveScoreCheckbox").checked = true;
  }, 2000);
  playSound("start");
};
const chooseCard = (card) => {
  if (
    game.locked ||
    game.paused ||
    card.classList.contains("is-flipped") ||
    card.classList.contains("is-matched")
  )
    return;
  startClock();
  card.classList.add("is-flipped");
  playSound("flip");
  if (!game.firstCard) {
    game.firstCard = card;
    return;
  }
  game.tries++;
  game.locked = true;
  const first = game.firstCard;
  const match = first.dataset.id === card.dataset.id;
  if (match) {
    playSound("match");
    first.classList.add("is-matched");
    card.classList.add("is-matched");
    game.matched++;
    game.combo++;
    game.maxCombo = Math.max(game.maxCombo, game.combo);
    game.firstCard = null;
    game.locked = false;
    if (game.matched === difficultySettings[game.difficulty].pairs)
      finishGame(true);
  } else {
    playSound("wrong");
    game.combo = 0;
    first.classList.add("is-wrong");
    card.classList.add("is-wrong");
    setTimeout(() => {
      first.classList.remove("is-flipped", "is-wrong");
      card.classList.remove("is-flipped", "is-wrong");
      game.firstCard = null;
      game.locked = false;
    }, 650);
  }
  updateHud();
};
const applyTheme = (theme) => {
  document.body.className = `theme-${theme}`;
  localStorage.setItem("memory-match-theme", theme);
  const themeInput = document.querySelector(
    `input[name="theme"][value="${theme}"]`,
  );
  if (themeInput) themeInput.checked = true;
  el("storyText").textContent = themeStories[theme];
};
document.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("keydown", (event) => {
  const blockedKey =
    event.key === "F12" ||
    (event.ctrlKey &&
      event.shiftKey &&
      ["I", "J", "C"].includes(event.key.toUpperCase())) ||
    (event.ctrlKey && event.key.toUpperCase() === "U");
  if (blockedKey) event.preventDefault();
});
const startGame = () => {
  game.difficulty = document.querySelector(
    'input[name="difficulty"]:checked',
  ).value;
  const theme = document.querySelector('input[name="theme"]:checked').value;
  game.theme = theme;
  applyTheme(theme);
  const settings = difficultySettings[game.difficulty];
  game = {
    ...game,
    tries: 0,
    matched: 0,
    combo: 0,
    maxCombo: 0,
    score: 0,
    scoreSaved: false,
    startedAt: 0,
    pausedAt: 0,
    locked: false,
    paused: false,
    firstCard: null,
  };
  localStorage.setItem("memory-match-player", el("playerName").value.trim());
  localStorage.setItem("memory-match-difficulty", game.difficulty);
  setupModal.classList.add("hidden");
  resultModal.classList.add("hidden");
  board.className = `board ${game.difficulty === "hard" ? "hard" : ""}`;
  board.innerHTML = "";
  el("playerDisplay").textContent = (
    el("playerName").value.trim() || "Player"
  ).slice(0, 16);
  getCards(settings.pairs).forEach((item) => {
    const card = document.createElement("button");
    card.className = "card";
    card.dataset.id = item.id;
    card.setAttribute("aria-label", "Hidden card");
    card.innerHTML = `<span class="card-face">${item.symbol}</span><span class="card-back"></span>`;
    card.addEventListener("click", () => chooseCard(card));
    board.appendChild(card);
  });
  clearInterval(game.timer);
  el("pauseButton").disabled = true;
  el("pauseButton").textContent = "Pause";
  el("pauseButton").setAttribute("aria-pressed", "false");
  updateHud();
  el("statusMessage").textContent = "Click a card to start the timer.";
  playSound("start");
};
const togglePause = () => {
  if (!game.startedAt || !board.children.length) return;
  game.paused = !game.paused;
  if (game.paused) {
    game.pausedAt = Date.now();
    board.classList.add("is-paused");
    el("pauseButton").textContent = "Resume";
    el("statusMessage").textContent = "Game paused.";
  } else {
    game.startedAt += Date.now() - game.pausedAt;
    board.classList.remove("is-paused");
    el("pauseButton").textContent = "Pause";
    el("statusMessage").textContent = "Find every matching pair.";
  }
  el("pauseButton").setAttribute("aria-pressed", String(game.paused));
  updateHud();
};
const setMuted = (value) => {
  muted = value;
  localStorage.setItem("memory-match-muted", muted ? "on" : "off");
  el("muteButton").textContent = muted ? "Sound off" : "Sound on";
  el("muteButton").setAttribute("aria-pressed", String(muted));
};
el("startButton").addEventListener("click", startGame);
el("saveScoreButton").addEventListener("click", saveCurrentScore);
el("playAgainButton").addEventListener("click", () => {
  resultModal.classList.add("hidden");
  setupModal.classList.remove("hidden");
});
el("newGameButton").addEventListener("click", () => {
  stopTimer();
  el("pauseButton").disabled = true;
  resultModal.classList.add("hidden");
  setupModal.classList.remove("hidden");
});
el("pauseButton").addEventListener("click", togglePause);
el("muteButton").addEventListener("click", () => setMuted(!muted));
el("clearScoresButton").addEventListener("click", () => {
  saveScores([]);
  renderLeaderboard();
});
el("playerName").addEventListener("input", () => {
  el("playerDisplay").textContent = (
    el("playerName").value.trim() || "Player"
  ).slice(0, 16);
});
el("playerName").value = localStorage.getItem("memory-match-player") || "";
const savedDifficulty = localStorage.getItem("memory-match-difficulty");
if (
  savedDifficulty &&
  document.querySelector(`input[name="difficulty"][value="${savedDifficulty}"]`)
)
  document.querySelector(
    `input[name="difficulty"][value="${savedDifficulty}"]`,
  ).checked = true;
setMuted(muted);
saveScores(getScores());
renderLeaderboard();
applyTheme(localStorage.getItem("memory-match-theme") || "classic");
el("playerDisplay").textContent = (
  el("playerName").value.trim() || "Player"
).slice(0, 16);
