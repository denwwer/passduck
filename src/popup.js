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
const notification = document.getElementById('notification');

// Sets
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';

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
  const limit = 256 - (256 % max);
  let val;

  for (; ;) {
    val = crypto.getRandomValues(new Uint8Array(1))[0];
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
 * Generate password
 * @param slide
 */
function generatePassword(slide) {
  let charset = '';
  const required = [];
  const length = Number(lengthInput.value);

  if (lowercaseCheckbox.checked) {
    required.push(LOWERCASE[getRandom(LOWERCASE.length)]);
    charset += LOWERCASE;
  }
  if (uppercaseCheckbox.checked) {
    required.push(UPPERCASE[getRandom(UPPERCASE.length)]);
    charset += UPPERCASE;
  }
  if (numbersCheckbox.checked) {
    required.push(NUMBERS[getRandom(NUMBERS.length)]);
    if (length >= 12) required.push(NUMBERS[getRandom(NUMBERS.length)]);

    charset += NUMBERS;
  }

  if (customCheckbox.checked && customCharsInput.value) {
    uniqCustomChars();
    required.push(customCharsInput.value[getRandom(customCharsInput.value.length)]);

    charset += customCharsInput.value;
  }

  if (charset === '') {
    showNotification(chrome.i18n.getMessage('required_select'));
    return;
  }

  if (length < 8 || length > 128) {
    showNotification(chrome.i18n.getMessage('required_length'));
    return;
  }

  let password;
  let tries = 10;

  for (; ;) {
    password = required.join('');

    for (let i = password.length; i < length; i++) {
      password += charset[getRandom(charset.length)];
    }

    // Fisher-Yates shuffle
    const passwordArray = password.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = getRandom(i + 1);
      [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }

    password = passwordArray.join('');
    tries--;

    if (!tries || !hasDuplicates(password)) break;
  }

  passwordOutput.value = password;

  // Update settings
  if (settings.customChars !== customCharsInput.value || settings.lengthValue !== lengthInput.value) {
    settings.customChars = customCharsInput.value;
    settings.lengthValue = lengthInput.value;

    // Skip for slider live updates to prevent MAX_WRITE_OPERATIONS_PER_MINUTE error
    if (!slide) chrome.storage.sync.set({settings});
  }
}

/**
 * Copy to clipboard
 * @return Promise<void>
 */
async function copyToClipboard() {
  const password = passwordOutput.value;

  if (!password) return;

  try {
    copyBtn.disabled = true;
    await navigator.clipboard.writeText(password);
    setTimeout(() => {
      copyBtn.disabled = false;
    }, 2000);
    showNotification(chrome.i18n.getMessage('copied'));
  } catch (err) {
    showNotification(chrome.i18n.getMessage('copied_error'));
    console.error('Clipboard error:', err.message);
  }
}

/**
 * Show notification
 * @param message
 */
function showNotification(message) {
  notification.textContent = message;
  notification.classList.remove('hidden');

  setTimeout(() => {
    notification.classList.add('hidden');
  }, 2000);
}

/**
 * Update progress indicator
 * @param value
 */
function updateSlider(value) {
  const min = Number(lengthInput.min);
  const max = Number(lengthInput.max);
  const percentage = ((value - min) / (max - min)) * 100;
  lengthInput.style.background = `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${percentage}%, var(--border-color) ${percentage}%, var(--border-color) 100%)`;
}

function setLengthColor(value) {
  let color = '#ef233c';

  if (value <= 12) {
    color = '#666666';
  } else if (value >= 100) {
    color = '#029f96';
  }

  lengthValue.style.color = color;
}

// Event listeners
generateBtn.addEventListener('click', () => generatePassword());
copyBtn.addEventListener('click', copyToClipboard);
passwordOutput.addEventListener('click', function () {
  this.select();
});

lengthInput.addEventListener('input', () => {
  const value = lengthInput.value;
  lengthValue.textContent = value;

  setLengthColor(value);
  generatePassword(true);
  updateSlider(value);
});

// Sync settings when user releases slide
lengthInput.addEventListener('change', () => {
  chrome.storage.sync.set({settings});
});

customCheckbox.addEventListener('change', () => {
  customCharsInput.disabled = !customCheckbox.checked;
  generatePassword();
});

[lowercaseCheckbox, uppercaseCheckbox, numbersCheckbox].forEach(checkbox => {
  checkbox.addEventListener('change', () => generatePassword());
})

// Generate password on load
async function init() {
  ({settings} = await chrome.storage.sync.get(['settings']));

  if (settings === undefined) {
    settings = {
      customChars: '-<>*()=?{}[]."~|;:_+,/', // !@#$%^& - common used
      lengthValue: 20
    }

    await chrome.storage.sync.set({settings});
  }

  customCharsInput.value = settings.customChars;
  lengthInput.value = settings.lengthValue;
  lengthValue.textContent = settings.lengthValue;

  setLengthColor(settings.lengthValue);

  generatePassword();
  updateSlider(lengthInput.value);
}

// Set localized labels
async function locale() {
  numbersCheckbox.nextElementSibling.textContent = chrome.i18n.getMessage('numbers');
  lowercaseCheckbox.nextElementSibling.textContent = chrome.i18n.getMessage('lowercase');
  customCheckbox.nextElementSibling.textContent = chrome.i18n.getMessage('symbols');
  uppercaseCheckbox.nextElementSibling.textContent = chrome.i18n.getMessage('uppercase');

  customCharsInput.setAttribute('placeholder', chrome.i18n.getMessage('custom_chars'))
  generateBtn.textContent = chrome.i18n.getMessage('generate')
  copyBtn.setAttribute('title', chrome.i18n.getMessage('copy'))
}

// Load
(async function load() {
  // init
  await Promise.all([init(), locale()]);
})();
