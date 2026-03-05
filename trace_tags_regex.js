import fs from 'fs';

const content = fs.readFileSync(process.argv[2], 'utf8');
const lines = content.split('\n');

const stack = [];
// very basic regex to find tags, ignoring comments and strings inside JSX
// this is not perfect but good enough for a rough idea
let inComment = false;

for (let i = 838; i < lines.length; i++) {
    let line = lines[i];
    // remove simplistic comments
    line = line.replace(/\{\/\*.*?\*\/\}/g, '');
    let pos = 0;
    while (pos < line.length) {
        if (!inComment && line.indexOf('{/*') !== -1) {
            inComment = true;
            // logic here is simplified, skip to end or block
        }
        break; // Simplified
    }
}
// Actually, writing a full HTML tag balancer might be tricky.
// Better to use an html parser package like htmlparser2 or just rely on a simple regex
