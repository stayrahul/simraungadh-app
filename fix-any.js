const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walk(dirPath, callback);
    } else {
      if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
        callback(dirPath);
      }
    }
  });
}

walk(path.join(__dirname, 'src'), (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Replace catch (e: any) with catch (e: unknown)
  content = content.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*:\s*any\s*\)/g, 'catch ($1: any)'); // Wait, let's just leave it as is if it's already updated.
  // Actually, wait, let's fix the instances where we want to use `(e as any).message` safely
  content = content.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*:\s*any\s*\)/g, 'catch ($1: unknown)');
  
  // also replace (e.message || ...) to ( ($1 instanceof Error ? $1.message : String($1)) || ...)
  // This is a bit too complex for regex.
  // Let's just do catch (e: any) -> catch (e) and suppress TS errors or fix manually.
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
  }
});
