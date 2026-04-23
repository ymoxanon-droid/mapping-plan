import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const defaultMsg = `update: ${new Date().toISOString().replace('T', ' ').slice(0, 16)}`;
const rawMsg = args.length > 0 ? args.join(' ') : defaultMsg;
const msg = rawMsg.replace(/"/g, '\\"');

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();

if (status === '') {
  console.log('Tidak ada perubahan baru. Coba push commit yang tersisa...');
} else {
  run('git add -A');
  run(`git commit -m "${msg}"`);
}

run('git push');

console.log('\nSelesai. Vercel akan auto-deploy dari branch main.');
console.log('  Production: https://mapping-plan.vercel.app');
console.log('  Dashboard : https://vercel.com/ymoxanon-droids-projects/mapping-plan');
