const test = require('brittle')
const fetch = require('like-fetch')
const TurnstileBypass = require('./index.js')

test('basic', async function (t) {
  const cf = new TurnstileBypass()
  const bypass = await cf.solve('https://dexscreener.com')

  if (!bypass) {
    t.fail()
    return
  }

  t.ok(bypass.userAgent)
  t.ok(bypass.cookies)
  t.ok(bypass.cookies.find(c => c.name === 'cf_clearance'))

  const response = await fetch('https://dexscreener.com', {
    headers: {
      'user-agent': bypass.userAgent,
      cookie: bypass.cookies.map(c => c.name + '=' + c.value).join('; ')
    }
  })

  t.is(response.status, 200)

  const html = await response.text()

  t.ok(html.includes('DEX Screener'))
  t.ok(html.includes('window.__SERVER_DATA'))
})

test('basic', async function (t) {
  const cf = new TurnstileBypass()
  const bypass = await cf.solve('https://google.com')

  t.absent(bypass)
})
