const DEFAULT_CONFIG = {
  title: 'Blocky Speller',
  description: 'Memorise, listen, and spell.',
  wordpack: './wordpacks/en-GB-core.json',
  theme: {
    colors: {},
    fontScale: 1,
  },
  gameplay: {
    startingLives: 3,
    memorizeDurationMs: 2500,
    feedbackDurationMs: 1500,
    wordsPerLevel: 5,
  },
  speech: {
    lang: 'en-GB',
    preferRegion: 'en-GB',
    rate: 0.85,
    pitch: 1.1,
    volume: 1,
  },
};

const state = {
  config: structuredClone(DEFAULT_CONFIG),
  words: [],
  wordsRemaining: [],
  currentWord: '',
  userInput: '',
  score: 0,
  lives: DEFAULT_CONFIG.gameplay.startingLives,
  gameState: 'loading',
  roundId: 0,
  transitionTimer: null,
};

const keyboardRows = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioContextClass ? new AudioContextClass() : null;

const elements = {
  startScreen: document.getElementById('start-screen'),
  gameScreen: document.getElementById('game-screen'),
  gameOverScreen: document.getElementById('game-over-screen'),
  introCopy: document.getElementById('intro-copy'),
  introHint: document.getElementById('intro-hint'),
  playBtn: document.getElementById('play-btn'),
  retryBtn: document.getElementById('retry-btn'),
  wordDisplay: document.getElementById('word-display'),
  heartsContainer: document.getElementById('hearts-container'),
  xpBar: document.getElementById('xp-bar'),
  levelDisplay: document.getElementById('level-display'),
  statusText: document.getElementById('status-text'),
  repeatAudioBtn: document.getElementById('repeat-audio-btn'),
  feedbackMessage: document.getElementById('feedback-message'),
  playArea: document.getElementById('play-area'),
  finalScore: document.getElementById('final-score'),
  keyboard: document.getElementById('keyboard'),
};

function setVisibleScreen(screen) {
  elements.startScreen.classList.remove('visible');
  elements.gameScreen.classList.remove('visible');
  elements.gameOverScreen.classList.remove('visible');
  screen.classList.add('visible');
}

function clearTransitionTimer() {
  if (state.transitionTimer !== null) {
    clearTimeout(state.transitionTimer);
    state.transitionTimer = null;
  }
}

function playSound(type) {
  if (!audioCtx) {
    return;
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'click') {
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  } else if (type === 'xp') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  } else if (type === 'hurt') {
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, now);
    oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }
}

function normalizeLang(lang) {
  return (lang || '').toLowerCase().replace('_', '-');
}

function resolveVoice(targetLang) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  if (voices.length === 0) {
    return null;
  }

  const normalizedTarget = normalizeLang(targetLang);
  const voiceByExact = voices.find((voice) => normalizeLang(voice.lang) === normalizedTarget);
  if (voiceByExact) {
    return voiceByExact;
  }

  const targetBase = normalizedTarget.split('-')[0];
  const voiceByBase = voices.find((voice) => normalizeLang(voice.lang).startsWith(`${targetBase}-`));
  if (voiceByBase) {
    return voiceByBase;
  }

  return voices.find((voice) => normalizeLang(voice.lang).startsWith('en')) || voices[0] || null;
}

function speakCurrentWord() {
  if (!state.currentWord || !window.speechSynthesis) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(state.currentWord);
  const speechConfig = state.config.speech;
  const targetLang = speechConfig.preferRegion || speechConfig.lang;
  const selectedVoice = resolveVoice(targetLang);

  utterance.lang = speechConfig.lang || 'en-GB';
  utterance.rate = Number(speechConfig.rate) || 0.85;
  utterance.pitch = Number(speechConfig.pitch) || 1.1;
  utterance.volume = Number(speechConfig.volume) || 1;

  if (selectedVoice) {
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function updateHUD() {
  const startingLives = state.config.gameplay.startingLives;
  const wordsPerLevel = Math.max(1, state.config.gameplay.wordsPerLevel);

  elements.heartsContainer.innerHTML = '';
  for (let i = 0; i < startingLives; i += 1) {
    const heart = document.createElement('span');
    heart.textContent = '❤️';
    if (i >= state.lives) {
      heart.style.filter = 'grayscale(100%)';
      heart.style.opacity = '0.3';
    }
    elements.heartsContainer.appendChild(heart);
  }

  const level = Math.floor(state.score / wordsPerLevel) + 1;
  elements.levelDisplay.textContent = String(level);

  const xpPercentage = ((state.score % wordsPerLevel) / wordsPerLevel) * 100;
  elements.xpBar.style.width = `${xpPercentage}%`;
}

function renderWordDisplay(showFullWord = false) {
  elements.wordDisplay.innerHTML = '';

  for (let i = 0; i < state.currentWord.length; i += 1) {
    const slot = document.createElement('div');
    slot.className = 'letter-slot';

    if (showFullWord) {
      slot.textContent = state.currentWord[i];
      slot.style.borderBottomColor = 'transparent';
    } else {
      slot.style.borderBottomColor = '#fff';
      if (i < state.userInput.length) {
        slot.textContent = state.userInput[i];
        if (i === state.userInput.length - 1) {
          slot.classList.add('pop-animation');
          window.setTimeout(() => slot.classList.remove('pop-animation'), 300);
        }
      }
    }

    elements.wordDisplay.appendChild(slot);
  }
}

function setStatus(text, memorize = false) {
  elements.statusText.textContent = text;
  elements.statusText.classList.toggle('memorize', memorize);
}

function showFeedback(text, kind) {
  elements.wordDisplay.classList.add('dim');
  elements.repeatAudioBtn.classList.add('hidden');
  elements.repeatAudioBtn.setAttribute('aria-hidden', 'true');

  elements.feedbackMessage.textContent = text;
  elements.feedbackMessage.className = `mc-text feedback visible ${kind} pop-animation`;

  const duration = Math.max(100, state.config.gameplay.feedbackDurationMs - 100);
  window.setTimeout(() => {
    elements.feedbackMessage.className = 'mc-text feedback';
    elements.wordDisplay.classList.remove('dim');
  }, duration);
}

function resetForSpellPhase() {
  state.gameState = 'spell';
  setStatus('Now spell it!');
  elements.repeatAudioBtn.classList.remove('hidden');
  elements.repeatAudioBtn.removeAttribute('aria-hidden');
  renderWordDisplay(false);
}

function endGame() {
  clearTransitionTimer();
  state.gameState = 'gameover';
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  elements.finalScore.textContent = String(state.score);
  setVisibleScreen(elements.gameOverScreen);
}

function checkSpelling() {
  if (state.gameState !== 'spell') {
    return;
  }

  state.gameState = 'checking';
  const roundIdAtCheck = state.roundId;

  if (state.userInput === state.currentWord) {
    playSound('xp');
    state.score += 1;
    updateHUD();
    showFeedback('Correct!', 'correct');

    clearTransitionTimer();
    state.transitionTimer = window.setTimeout(() => {
      if (state.roundId === roundIdAtCheck && state.gameState === 'checking') {
        nextWord();
      }
    }, state.config.gameplay.feedbackDurationMs);
    return;
  }

  playSound('hurt');
  state.lives -= 1;
  updateHUD();

  elements.playArea.classList.add('shake-animation');
  window.setTimeout(() => elements.playArea.classList.remove('shake-animation'), 400);

  showFeedback(`Wrong! It was ${state.currentWord}`, 'wrong');

  clearTransitionTimer();
  state.transitionTimer = window.setTimeout(() => {
    if (state.roundId !== roundIdAtCheck || state.gameState !== 'checking') {
      return;
    }

    if (state.lives <= 0) {
      endGame();
      return;
    }

    state.userInput = '';
    state.gameState = 'spell';
    setStatus('Try again!');
    elements.repeatAudioBtn.classList.remove('hidden');
    elements.repeatAudioBtn.removeAttribute('aria-hidden');
    renderWordDisplay(false);
  }, state.config.gameplay.feedbackDurationMs);
}

function handleKeyInput(char) {
  if (state.gameState !== 'spell') {
    return;
  }

  if (!/^[A-Z]$/.test(char)) {
    return;
  }

  playSound('click');

  if (state.userInput.length >= state.currentWord.length) {
    return;
  }

  state.userInput += char;
  renderWordDisplay(false);

  if (state.userInput.length === state.currentWord.length) {
    checkSpelling();
  }
}

function handleDelete() {
  if (state.gameState !== 'spell') {
    return;
  }

  if (state.userInput.length === 0) {
    return;
  }

  playSound('click');
  state.userInput = state.userInput.slice(0, -1);
  renderWordDisplay(false);
}

function nextWord() {
  if (state.words.length === 0) {
    setStatus('No words loaded');
    return;
  }

  clearTransitionTimer();
  state.roundId += 1;

  if (state.wordsRemaining.length === 0) {
    state.wordsRemaining = [...state.words];
  }

  const randomIndex = Math.floor(Math.random() * state.wordsRemaining.length);
  state.currentWord = state.wordsRemaining[randomIndex];
  state.wordsRemaining.splice(randomIndex, 1);

  state.userInput = '';
  state.gameState = 'memorize';

  elements.repeatAudioBtn.classList.add('hidden');
  elements.repeatAudioBtn.setAttribute('aria-hidden', 'true');
  setStatus('Memorise the word!', true);
  renderWordDisplay(true);
  speakCurrentWord();

  const roundIdAtStart = state.roundId;
  clearTransitionTimer();
  state.transitionTimer = window.setTimeout(() => {
    if (state.roundId !== roundIdAtStart || state.gameState !== 'memorize' || state.lives <= 0) {
      return;
    }
    resetForSpellPhase();
  }, state.config.gameplay.memorizeDurationMs);
}

function startGame() {
  playSound('click');
  clearTransitionTimer();
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  state.score = 0;
  state.lives = state.config.gameplay.startingLives;
  state.wordsRemaining = [...state.words];
  state.userInput = '';
  state.currentWord = '';
  state.roundId = 0;

  updateHUD();
  setVisibleScreen(elements.gameScreen);
  nextWord();
}

function buildKeyboard() {
  elements.keyboard.innerHTML = '';

  keyboardRows.forEach((row) => {
    const rowElement = document.createElement('div');
    rowElement.className = 'keyboard-row';

    row.forEach((char) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mc-btn key';
      button.textContent = char;
      button.addEventListener('click', () => handleKeyInput(char));
      rowElement.appendChild(button);
    });

    if (row === keyboardRows[keyboardRows.length - 1]) {
      const delButton = document.createElement('button');
      delButton.type = 'button';
      delButton.className = 'mc-btn key key-wide key-delete';
      delButton.textContent = 'DEL';
      delButton.addEventListener('click', handleDelete);
      rowElement.appendChild(delButton);
    }

    elements.keyboard.appendChild(rowElement);
  });
}

function applyTheme(themeConfig) {
  const root = document.documentElement;
  const colorMap = {
    mcSky: '--mc-sky',
    mcStone: '--mc-stone',
    mcStoneLight: '--mc-stone-light',
    mcStoneDark: '--mc-stone-dark',
    mcTextShadow: '--mc-text-shadow',
    mcTitle: '--mc-title',
    mcTitleShadow: '--mc-title-shadow',
    statusPrimary: '--status-primary',
    statusMemorize: '--status-memorize',
    feedbackCorrect: '--feedback-correct',
    feedbackWrong: '--feedback-wrong',
  };

  Object.entries(themeConfig.colors || {}).forEach(([key, value]) => {
    const variableName = colorMap[key];
    if (variableName && value) {
      root.style.setProperty(variableName, value);
    }
  });

  if (themeConfig.fontScale) {
    root.style.setProperty('--font-scale', String(themeConfig.fontScale));
  }
}

async function fetchJson(relativePath) {
  const response = await fetch(relativePath, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load ${relativePath}`);
  }
  return response.json();
}

async function loadGameData() {
  const config = await fetchJson('./config.json');
  state.config = {
    ...DEFAULT_CONFIG,
    ...config,
    theme: {
      ...DEFAULT_CONFIG.theme,
      ...config.theme,
      colors: {
        ...DEFAULT_CONFIG.theme.colors,
        ...(config.theme?.colors || {}),
      },
    },
    gameplay: {
      ...DEFAULT_CONFIG.gameplay,
      ...(config.gameplay || {}),
    },
    speech: {
      ...DEFAULT_CONFIG.speech,
      ...(config.speech || {}),
    },
  };

  const wordpack = await fetchJson(state.config.wordpack);
  const words = Array.isArray(wordpack.words)
    ? wordpack.words.map((word) => String(word).trim().toUpperCase()).filter(Boolean)
    : [];

  if (words.length === 0) {
    throw new Error('Wordpack has no words.');
  }

  state.words = words;
}

function onPhysicalKeyboard(event) {
  if (state.gameState !== 'spell' && state.gameState !== 'checking') {
    return;
  }

  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();
    handleDelete();
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    if (state.gameState === 'spell' && state.userInput.length === state.currentWord.length) {
      checkSpelling();
    }
    return;
  }

  const upper = event.key.toUpperCase();
  if (/^[A-Z]$/.test(upper)) {
    event.preventDefault();
    handleKeyInput(upper);
  }
}

function wireEvents() {
  elements.playBtn.addEventListener('click', startGame);
  elements.retryBtn.addEventListener('click', startGame);
  elements.repeatAudioBtn.addEventListener('click', speakCurrentWord);

  document.addEventListener('keydown', onPhysicalKeyboard, { passive: false });

  document.addEventListener('contextmenu', (event) => {
    if (state.gameState === 'spell' || state.gameState === 'memorize' || state.gameState === 'checking') {
      event.preventDefault();
    }
  });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
}

function setLoadError(message) {
  state.gameState = 'error';
  elements.introCopy.textContent = message;
  elements.introHint.textContent = 'Please check config/wordpack paths and reload.';
  elements.playBtn.disabled = true;
}

async function init() {
  buildKeyboard();
  wireEvents();

  try {
    await loadGameData();
    applyTheme(state.config.theme);
    elements.introCopy.textContent = state.config.description;
    elements.introHint.textContent = `Word pack: ${state.config.wordpack}`;
    elements.playBtn.disabled = false;
    state.gameState = 'start';
  } catch (error) {
    setLoadError(`Failed to load game data. ${error.message}`);
  }
}

init();
