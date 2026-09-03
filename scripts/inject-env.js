const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
let content = fs.readFileSync(envFile, 'utf8');

const replacements = [
  {
    placeholder: 'PASSWORD_HASH_PLACEHOLDER',
    value: process.env.PASSWORD_HASH,
    name: 'PASSWORD_HASH',
  },
  {
    placeholder: 'FORM_PLACEHOLDER',
    value: process.env.FORM_ID,
    name: 'FORM_ID',
  },
  {
    placeholder: 'ACHIEVEMENT_PLACEHOLDER',
    value: process.env.ACHIEVEMENT_ID,
    name: 'ACHIEVEMENT_ID',
  },
  {
    placeholder: 'COPY_PLACEHOLDER',
    value: process.env.COPY_ID,
    name: 'COPY_ID',
  },
];

for (const { placeholder, value, name } of replacements) {
  if (!value) {
    throw new Error(`${placeholder} was not replaced because ${name} is empty.`);
  }
  content = content.replaceAll(placeholder, value);
}

fs.writeFileSync(envFile, content);
console.log('Build-time environment injection complete.');
