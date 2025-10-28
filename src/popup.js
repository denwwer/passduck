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

/**
 * Generate password
 */
function generatePassword() {
  let charset = '';
  const required = [];

  if (lowercaseCheckbox.checked) {
    required.push(LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)]);
    charset += LOWERCASE;
  }
  if (uppercaseCheckbox.checked) {
    required.push(UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)]);
    charset += UPPERCASE;
  }
  if (numbersCheckbox.checked) {
    required.push(NUMBERS[Math.floor(Math.random() * NUMBERS.length)]);
    charset += NUMBERS;
  }

  if (customCheckbox.checked && customCharsInput.value) {
    required.push(customCharsInput.value[Math.floor(Math.random() * customCharsInput.value.length)]);
    charset += customCharsInput.value;
  }

  if (charset === '') {
    showNotification('Please select at least one option');
    return;
  }

  let length = parseInt(lengthInput.value);
  if (length < 8 || length > 128) {
    showNotification('Length must be between 6 and 128');
    return;
  }

  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  let password = required.join('');
  const charsetLength = charset.length;

  for (let i = password.length; i < length; i++) {
    password += charset[randomValues[i] % charsetLength];
  }

  // Fisher-Yates shuffle
  const passwordArray = password.split('');
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = randomValues[i] % (i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }

  passwordOutput.value = password;

  const settings = {
    customChars: customCharsInput.value,
    lengthValue: lengthInput.value
  }
  chrome.storage.sync.set({settings});
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
    showNotification('Copied to clipboard');
  } catch (err) {
    showNotification('Clipboard error');
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
  const min = parseInt(lengthInput.min);
  const max = parseInt(lengthInput.max);
  const percentage = ((value - min) / (max - min)) * 100;
  lengthInput.style.background = `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${percentage}%, var(--border-color) ${percentage}%, var(--border-color) 100%)`;
}

// Event listeners
generateBtn.addEventListener('click', generatePassword);
copyBtn.addEventListener('click', copyToClipboard);
passwordOutput.addEventListener('click', function () {
  this.select();
});

lengthInput.addEventListener('input', () => {
  const value = lengthInput.value;
  lengthValue.textContent = value;
  updateSlider(value);
});

customCheckbox.addEventListener('change', () => {
  customCharsInput.disabled = !customCheckbox.checked;
});

// Generate password on load
(async function load() {
  let {settings} = await chrome.storage.sync.get(['settings']);

  if (settings === undefined) {
    settings = {
      customChars: '@$#-!&<>*()=?%{}[]',
      lengthValue: 20
    }

    await chrome.storage.sync.set({settings});
  }

  customCharsInput.value = settings.customChars;
  lengthInput.value = settings.lengthValue;
  lengthValue.textContent = settings.lengthValue;

  generatePassword();
  updateSlider(lengthInput.value);
})();
