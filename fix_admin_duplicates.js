const fs = require('fs');
const file = '/Users/rahul/Downloads/simraungadh-app/simraungadh/src/app/admin.tsx';
let content = fs.readFileSync(file, 'utf8');

// The block we want to keep exactly ONCE, after TAB 6 and before its closing ScrollView
const blockRegex = /\s*\{\/\* TAB 7: SETTINGS \*\/\}[\s\S]*?activeTab === 'settings'[\s\S]*?<\/View>\n\s*\)\}\n\n\s*<\/ScrollView>/g;

content = content.replace(blockRegex, '\n        </ScrollView>');

fs.writeFileSync(file, content);
