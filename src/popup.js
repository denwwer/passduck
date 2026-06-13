// DOM elements
const lowercaseCheckbox = document.getElementById('lowercase');
const uppercaseCheckbox = document.getElementById('uppercase');
const numbersCheckbox = document.getElementById('numbers');
const customCheckbox = document.getElementById('custom');
const customCharsInput = document.getElementById('customChars');
const lengthInput = document.getElementById('length');
const lengthValue = document.getElementById('lengthValue');
const generateBtn = document.getElementById('generateBtn');
const passwordOutput = document.getElementById('passwordOutput');
const copyBtn = document.getElementById('copyBtn');
const strengthFill = document.getElementById('strengthFill');
const strengthLabel = document.getElementById('strengthLabel');
const notification = document.getElementById('notification');
const modePasswordBtn = document.getElementById('modePasswordBtn');
const modePassphraseBtn = document.getElementById('modePassphraseBtn');
const passwordModeView = document.getElementById('passwordMode');
const passphraseModeView = document.getElementById('passphraseMode');
// passphrase elements
const wordCountInput = document.getElementById('wordCount');
const wordCountValue = document.getElementById('wordCountValue');
const passphraseHint = document.getElementById('passphraseHint');

// Sets
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const AMBIGUOUS = '0Oo1Il';
const WORD_SEPARATORS = '-./+=*_';
const GEN_MODE = {
  pass: 'password',
  phrase: 'passphrase',
};

// User settings
let settings;

/**
 * Removes duplicates from custom chars
 */
function uniqCustomChars() {
  customCharsInput.value = [...new Set(customCharsInput.value)].join('');
}

/**
 * Generates cryptographically secure random int
 * @param max
 * @return {number}
 */
function getRandom(max) {
  // Uint16 keeps rejection sampling unbiased for any charset up to 65536 chars
  const limit = 65536 - (65536 % max);
  let val;

  for (;;) {
    val = crypto.getRandomValues(new Uint16Array(1))[0];
    if (val < limit) break;
  }

  return val % max;
}

/**
 * Checks if a char appears more than 3 times
 * @param password
 * @return {boolean}
 */
function hasDuplicates(password) {
  const counts = {};
  for (const char of password) {
    counts[char] = (counts[char] || 0) + 1;
    if (counts[char] > 3) return true;
  }
  return false;
}

/**
 * Update strength meter
 * @param rawBits
 */
function updateStrength(rawBits) {
  const bits = Math.round(rawBits);

  let level;
  if (bits < 40) level = 'weak';
  else if (bits < 70) level = 'fair';
  else if (bits < 120) level = 'strong';
  else level = 'very-strong';

  strengthFill.className = `strength-fill ${level}`;
  strengthFill.style.width = `${Math.min((bits / 128) * 100, 100)}%`;
  strengthLabel.textContent = `${chrome.i18n.getMessage('strength_' + level.replace('-', '_'))} · ${bits} bits`;
}

/**
 * Switch between password and passphrase modes
 * @param mode 'password' | 'passphrase'
 * @param save persist the choice to storage
 */
function switchMode(mode, save = true) {
  const isPassword = mode === GEN_MODE.pass;

  modePasswordBtn.classList.toggle('active', isPassword);
  modePassphraseBtn.classList.toggle('active', !isPassword);
  passwordModeView.hidden = !isPassword;
  passphraseModeView.hidden = isPassword;
  passphraseHint.hidden = isPassword;

  // Slide content in from the selected tab's side (skip on popup open)
  if (save) {
    const view = isPassword ? passwordModeView : passphraseModeView;
    view.classList.remove('slide-in-left', 'slide-in-right');
    void view.offsetWidth; // reflow so re-adding the class restarts the animation
    view.classList.add(isPassword ? 'slide-in-left' : 'slide-in-right');
  }

  if (settings.mode !== mode) {
    settings.mode = mode;
    if (save) chrome.storage.sync.set({ settings });
  }

  generate(save);
}

/**
 * Generate passphrase from the bundled wordlist
 * @param slide
 */
function generatePassphrase(slide) {
  const count = Number(wordCountInput.value);
  const words = [];
  const list = chrome.i18n.getUILanguage().includes('de')
    ? WORDLISTS.de
    : WORDLISTS.en;

  for (let i = 0; i < count; i++) {
    let word = list[getRandom(list.length)];
    if (settings.wordCapitalize === i) {
      word = word[0].toUpperCase() + word.slice(1);
    }

    words.push(word);
  }

  // Append a digit to satisfy "must contain a number" rules
  words[getRandom(words.length)] += getRandom(10);

  renderOutput(words.join(settings.wordSeparator));

  let bits = count * Math.log2(list.length);
  bits += Math.log2(10 * count);
  updateStrength(bits);

  // Update settings
  if (settings.wordCount !== count) {
    settings.wordCount = count;

    // Skip for slider live updates to prevent MAX_WRITE_OPERATIONS_PER_MINUTE error
    if (!slide) chrome.storage.sync.set({ settings });
  }
}

/**
 * Render coloring output.
 * @param text
 */
function renderOutput(text) {
  const frag = document.createDocumentFragment();

  for (const ch of text) {
    const span = document.createElement('span');
    span.textContent = ch;
    if (ch >= '0' && ch <= '9') span.className = 'ch-num';
    else if (!/[a-z]/i.test(ch)) span.className = 'ch-sym';
    frag.appendChild(span);
  }

  passwordOutput.replaceChildren(frag);
}

let blurTimer;

/**
 * Generate for the active mode
 * @param slide
 */
function generate(slide) {
  passwordOutput.style.filter = 'blur(0)';
  clearTimeout(blurTimer);

  settings.mode === GEN_MODE.pass
    ? generatePassword(slide)
    : generatePassphrase(slide);

  blurTimer = setTimeout(() => {
    passwordOutput.style.filter = 'blur(3px)';
  }, 10_000);
}

/**
 * Generate password
 * @param slide
 */
function generatePassword(slide) {
  let charset = '';
  const required = [];
  const length = Number(lengthInput.value);

  // Removes ambiguous chars
  const clean = (set) =>
    [...set].filter((c) => !AMBIGUOUS.includes(c)).join('');

  // Add char from set
  const addSet = (set) => {
    if (!set) return;
    required.push(set[getRandom(set.length)]);
    charset += set;
  };

  if (lowercaseCheckbox.checked) addSet(clean(LOWERCASE));
  if (uppercaseCheckbox.checked) addSet(clean(UPPERCASE));
  if (numbersCheckbox.checked) addSet(clean(NUMBERS));

  if (customCheckbox.checked && customCharsInput.value) {
    uniqCustomChars();
    addSet(clean(customCharsInput.value));
  }

  // Update setting
  settings.lengthValue = length;
  settings.lowercase = lowercaseCheckbox.checked;
  settings.uppercase = uppercaseCheckbox.checked;
  settings.numbers = numbersCheckbox.checked;
  settings.custom = customCheckbox.checked;

  // Skip for slider live updates to prevent MAX_WRITE_OPERATIONS_PER_MINUTE error
  if (!slide) {
    chrome.storage.sync.set({ settings });
  }

  if (charset === '') {
    showNotification(chrome.i18n.getMessage('required_select'));
    return;
  }

  // Dedupe custom chars vs Sets
  charset = [...new Set(charset)].join('');

  let password;
  let tries = 10;

  for (;;) {
    password = required.join('');

    for (let i = password.length; i < length; i++) {
      password += charset[getRandom(charset.length)];
    }

    // Fisher-Yates shuffle
    const passwordArray = password.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = getRandom(i + 1);
      [passwordArray[i], passwordArray[j]] = [
        passwordArray[j],
        passwordArray[i],
      ];
    }

    password = passwordArray.join('');
    tries--;

    if (!tries || !hasDuplicates(password)) break;
  }

  renderOutput(password);
  updateStrength(length * Math.log2(charset.length));
}

let copyTimer;
/**
 * Copy to clipboard
 * @return Promise<void>
 */
async function copyToClipboard() {
  clearTimeout(copyTimer);

  const password = passwordOutput.textContent;

  if (!password) return;

  try {
    copyBtn.disabled = true;
    await navigator.clipboard.writeText(password);
    copyTimer = setTimeout(() => {
      copyBtn.disabled = false;
    }, 2000);
    showNotification(chrome.i18n.getMessage('copied'));
  } catch (err) {
    copyBtn.disabled = false;
    showNotification(chrome.i18n.getMessage('copied_error'));
    console.error('Clipboard error:', err.message);
  }
}

let notifyTimer;
/**
 * Show notification
 * @param message
 */
function showNotification(message) {
  clearTimeout(notifyTimer);

  notification.textContent = message;
  notification.classList.remove('hide');
  notification.classList.add('show');

  notifyTimer = setTimeout(() => {
    notification.classList.remove('show');
    notification.classList.add('hide');
  }, 2000);
}

/**
 * Update progress indicator
 * @param input range element
 */
function updateSlider(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const percentage = ((input.value - min) / (max - min)) * 100;
  input.style.background = `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${percentage}%, var(--border-color) ${percentage}%, var(--border-color) 100%)`;
}

// Event listeners
modePasswordBtn.addEventListener('click', () => switchMode(GEN_MODE.pass));
modePassphraseBtn.addEventListener('click', () => switchMode(GEN_MODE.phrase));
generateBtn.addEventListener('click', () => generate());
copyBtn.addEventListener('click', copyToClipboard);
passwordOutput.addEventListener('click', () => {
  const range = document.createRange();
  range.selectNodeContents(passwordOutput);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
});

lengthInput.addEventListener('input', () => {
  lengthValue.textContent = lengthInput.value;

  generate(true);
  updateSlider(lengthInput);
});

wordCountInput.addEventListener('input', () => {
  wordCountValue.textContent = wordCountInput.value;

  generate(true);
  updateSlider(wordCountInput);
});

// Sync settings when user releases slide
[lengthInput, wordCountInput].forEach((slider) => {
  slider.addEventListener('change', () => {
    chrome.storage.sync.set({ settings });
  });
});

customCheckbox.addEventListener('change', () => {
  customCharsInput.disabled = !customCheckbox.checked;
  generate(false);
});

customCharsInput.addEventListener('blur', () => {
  uniqCustomChars();

  if (settings.customChars !== customCharsInput.value) {
    settings.customChars = customCharsInput.value;
    chrome.storage.sync.set({ settings });
  }
});

[lowercaseCheckbox, uppercaseCheckbox, numbersCheckbox].forEach((checkbox) => {
  checkbox.addEventListener('change', () => generate(false));
});

// Load settings and generate password
async function init() {
  let save = false;
  ({ settings } = await chrome.storage.sync.get(['settings']));

  if (settings === undefined) {
    settings = {
      customChars: '-<>*()=?{}[]."~|;:_+,/', // !@#$%^& - common used (add as preset?)
      lengthValue: 20,
    };
    save = true;
  }

  // Passphrase settings (defaults when upgrading)
  if (!settings.mode) {
    settings.lowercase = true;
    settings.uppercase = true;
    settings.numbers = true;
    settings.custom = true;
    settings.mode = GEN_MODE.pass;
    settings.wordCount = 5;
    settings.wordSeparator = WORD_SEPARATORS[getRandom(WORD_SEPARATORS.length)];
    settings.wordCapitalize = getRandom(3); // capitalize first 3 words
    save = true;
  }

  if (save) {
    await chrome.storage.sync.set({ settings });
  }

  // apply settings
  lowercaseCheckbox.checked = settings.lowercase;
  uppercaseCheckbox.checked = settings.uppercase;
  numbersCheckbox.checked = settings.numbers;
  customCheckbox.checked = settings.custom;
  customCharsInput.value = settings.customChars;
  customCharsInput.disabled = !settings.custom;
  lengthInput.value = settings.lengthValue;
  lengthValue.textContent = settings.lengthValue;

  wordCountInput.value = settings.wordCount;
  wordCountValue.textContent = settings.wordCount;

  // Restore last mode and triggers initial generation
  switchMode(settings.mode, false);
  updateSlider(lengthInput);
  updateSlider(wordCountInput);
}

// Set localized labels
async function locale() {
  // adjust labels positions for locale
  // to test locale set in src/manifest.json:6 (default_locale) target lang and rename "en" _locales as "_en"
  // const loc = 'de';
  const loc = chrome.i18n.getUILanguage();

  if (loc.includes('es')) {
    lowercaseCheckbox.parentNode.style =
      'position: relative; margin-right: 0.2rem;';
  }
  if (loc.includes('uk')) {
    lowercaseCheckbox.parentNode.style =
      'position: relative; margin-right: 0.7rem;';
  }

  numbersCheckbox.nextElementSibling.textContent =
    chrome.i18n.getMessage('numbers');
  lowercaseCheckbox.nextElementSibling.textContent =
    chrome.i18n.getMessage('lowercase');
  customCheckbox.nextElementSibling.textContent =
    chrome.i18n.getMessage('symbols');
  uppercaseCheckbox.nextElementSibling.textContent =
    chrome.i18n.getMessage('uppercase');

  customCharsInput.setAttribute(
    'placeholder',
    chrome.i18n.getMessage('custom_chars'),
  );
  generateBtn.textContent = chrome.i18n.getMessage('generate');
  copyBtn.setAttribute('title', chrome.i18n.getMessage('copy'));

  let wordHint = chrome.i18n.getMessage('passphrase_hint');
  if (!loc.includes('de') && !loc.includes('en')) {
    wordHint += ' ' + chrome.i18n.getMessage('passphrase_lang_note');
  }

  passphraseHint.textContent = wordHint;
}

// Load
(async function load() {
  // init
  await Promise.all([init(), locale()]);
})();
