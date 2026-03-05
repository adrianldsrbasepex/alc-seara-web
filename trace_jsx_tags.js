import fs from 'fs';
import ts from 'typescript';

const filePath = process.argv[2];
const sourceFile = ts.createSourceFile(
    'AdminPanel.tsx',
    fs.readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
);

function traverse(node) {
    if (node.kind === ts.SyntaxKind.JsxElement) {
        const opening = node.openingElement;
        const closing = node.closingElement;
        if (opening.tagName.getText() !== closing.tagName.getText()) {
            console.log(`Mismatch: <${opening.tagName.getText()}> at line ${sourceFile.getLineAndCharacterOfPosition(opening.getStart()).line + 1} with </${closing.tagName.getText()}> at line ${sourceFile.getLineAndCharacterOfPosition(closing.getStart()).line + 1}`);
        }
    }
    ts.forEachChild(node, traverse);
}

traverse(sourceFile);
console.log("Done checking JSX Elements");
