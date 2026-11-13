// Syntax diagnostics are intentionally separate from full native TypeScript validation.
const fs=require('node:fs');const path=require('node:path');
const ts=require(process.env.LENS_TYPESCRIPT_PATH || 'typescript');
let count=0,errors=0;
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const name=path.join(dir,entry.name);if(entry.isDirectory())walk(name);else if(/\.(ts|tsx)$/.test(name)&&!name.endsWith('.d.ts')){const output=ts.transpileModule(fs.readFileSync(name,'utf8'),{fileName:name,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,isolatedModules:true}});count++;for(const d of output.diagnostics||[]){if(d.category===ts.DiagnosticCategory.Error){errors++;console.error(name+': '+ts.flattenDiagnosticMessageText(d.messageText,'\n'));}}}}}
for(const dir of ['app','src','widgets','tests'])walk(dir);
console.log(`${count} TypeScript/TSX files parsed, ${errors} syntax errors. This does not replace tsc --noEmit.`);process.exitCode=errors?1:0;
