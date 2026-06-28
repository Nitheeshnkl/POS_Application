const { execSync } = require('child_process');
try {
  console.log(execSync('git log --oneline -n 20').toString());
} catch(e) {
  console.log('Error:', e.message);
}
