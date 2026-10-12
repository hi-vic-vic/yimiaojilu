const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/template.html', 'utf8');
const handler = source.slice(source.indexOf('async function sendMagicLink('), source.indexOf('async function verifyOtp('));

async function run(response, networkError) {
  let request;
  const messages = [];
  const status = {textContent: ''};
  const context = vm.createContext({
    $: id => id === 'loginStatus' ? status : {},
    FormData: class { get() { return 'test@example.com'; } },
    location: {origin: 'https://hi-vic-vic.github.io', pathname: '/yimiaojilu/'},
    sb: () => ({url: 'https://project.supabase.co', key: 'public-test-key'}),
    toast: message => messages.push(message),
    fetch: async (url, options) => {
      request = {url, options};
      if (networkError) throw new TypeError('Failed to fetch');
      return response;
    },
    URL, encodeURIComponent, TypeError,
  });
  vm.runInContext(handler, context);
  const button = {disabled: false};
  await context.sendMagicLink(button);
  assert.equal(button.disabled, false);
  return {request, messages, status};
}

(async () => {
  const success = await run({ok: true});
  assert.equal(new URL(success.request.url).searchParams.get('redirect_to'), 'https://hi-vic-vic.github.io/yimiaojilu/');
  assert.deepEqual(JSON.parse(success.request.options.body), {email: 'test@example.com', create_user: true});
  assert.match(success.messages[0], /已发送/);
  const limited = await run({ok: false, status: 429, json: async () => ({code: 'over_email_send_rate_limit', msg: 'email rate limit exceeded'})});
  assert.match(limited.status.textContent, /邮件.*额度|邮件.*限流/);
  const invalid = await run({ok: false, status: 400, json: async () => ({code: 'email_address_invalid', msg: 'Invalid email address'})});
  assert.match(invalid.status.textContent, /邮箱/);
  const offline = await run(null, true);
  assert.match(offline.status.textContent, /网络/);
  console.log('Auth request and error handling tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
