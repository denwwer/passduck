#!/bin/bash

rm -rf ./safari PassDuck*

cp -r ./src ./safari

sed -i '' 's/chrome\.storage/browser\.storage/g' safari/popup.js
sed -i '' 's/chrome\.i18n/browser\.i18n/g' safari/popup.js
sed -i '' '/<head>/a\
<meta name="color-scheme" content="light dark">
' safari/popup.html

# Listen for changes in color scheme
sed -i '' 's/\/\/ init/applyTheme();/g' safari/popup.js
cat >> safari/popup.js << 'EOF'

function applyTheme() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.body.classList.toggle('dark', isDark);
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

EOF

jq '. + {"browser_specific_settings":{"safari":{"strict_min_version":"15.4"}}}' safari/manifest.json > safari/manifest.tmp.json && mv safari/manifest.tmp.json safari/manifest.json
xcrun safari-web-extension-converter ./safari
