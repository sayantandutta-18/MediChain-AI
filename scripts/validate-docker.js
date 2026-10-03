/* Offline validation of docker-compose.yml - verifies structure and that no
   secret is baked into the image or hardcoded in the file. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const yaml = require('js-yaml');
const doc = yaml.load(fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8'));
const s = doc.services;

console.log('services      :', Object.keys(s).join(', '));
console.log('api build     :', s.api.build.context, '|', s.api.build.dockerfile);
console.log('web build     :', s.web.build.context, '|', s.web.build.dockerfile);
console.log('mongodb image :', s.mongodb.image);

const apiEnv = s.api.environment || {};
const runtimeInjected = Object.entries(apiEnv)
  .filter(function (e) { return String(e[1]).indexOf('${') >= 0; })
  .map(function (e) { return e[0]; });

console.log('api vars injected at runtime :', runtimeInjected.join(', '));

// Any literal (non-interpolated) value that looks like a secret is a problem.
const secretish = /SECRET|KEY|PASSWORD|MNEMONIC|TOKEN/i;
const baked = Object.keys(apiEnv).filter(function (k) {
  return secretish.test(k) && String(apiEnv[k]).indexOf('${') < 0 && String(apiEnv[k]).trim() !== '';
});

console.log('secrets baked into compose   :', baked.length === 0 ? 'NONE (good)' : baked.join(', '));

const health = (apiEnv.API_PREFIX || '/api/v1') + '/health';
console.log('health endpoint expected at  :', health);

for (const df of ['backend/Dockerfile', 'frontend/Dockerfile']) {
  const p = path.join(root, df);
  if (!fs.existsSync(p)) {
    console.log(df + ': MISSING');
    continue;
  }
  const content = fs.readFileSync(p, 'utf8');
  const copiesEnv = /^COPY\s+\.env/im.test(content);
  console.log(df + ': copies .env = ' + (copiesEnv ? 'YES (PROBLEM)' : 'no'));
}

const feEnv = fs.readFileSync(path.join(root, 'frontend', '.env.example'), 'utf8');
const badPublic = (feEnv.match(/^\s*(VITE_[A-Z_]+)=/gm) || [])
  .map(function (m) { return m.match(/(VITE_[A-Z_]+)=/)[1]; })
  .filter(function (k) { return secretish.test(k) && !/URL|TARGET/.test(k); });
console.log('frontend VITE_* secret-ish vars :', badPublic.length === 0 ? 'NONE (good)' : badPublic.join(', '));