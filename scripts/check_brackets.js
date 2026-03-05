const fs = require('fs');
const content = fs.readFileSync('c:/Users/adria/Documents/ALC - SEARA/components/AdminPanel.tsx', 'utf8');

let braces = 0;
let parens = 0;
let brackets = 0;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') braces++;
    else if (char === '}') braces--;
    else if (char === '(') parens++;
    else if (char === ')') parens--;
    else if (char === '[') brackets++;
    else if (char === ']') brackets--;

    if (braces < 0 || parens < 0 || brackets < 0) {
        console.log(`Unbalanced at char ${i} (${char}): braces=${braces}, parens=${parens}, brackets=${brackets}`);
    }
}

console.log(`Final counts: braces=${braces}, parens=${parens}, brackets=${brackets}`);
