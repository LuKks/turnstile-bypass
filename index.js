const puppeteer = require('puppeteer-extra')
const createPuppeteerStealth = require('puppeteer-extra-plugin-stealth')
const turnstile = require('./lib/turnstile.js')

const puppeteerStealth = createPuppeteerStealth()
puppeteerStealth.enabledEvasions.delete('user-agent-override')
puppeteer.use(puppeteerStealth)

module.exports = class TurnstileBypass {
  static turnstile (page) {
    return turnstile(page)
  }

  async _launchBrowser () {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--no-sandbox', '--start-maximized'],
      targetFilter: target => {
        // Allows bypassing Cloudflare
        if (target.type() === 'other' && !target.url()) {
          return false
        }

        return true
      }
    })

    return browser
  }

  async solve (url, opts = {}) {
    const browser = await this._launchBrowser(opts)
    const [page] = await browser.pages()

    try {
      await setWindowState(page, 'minimized')

      if (opts.userAgent) await page.setUserAgent(opts.userAgent)
      if (opts.cookies) await page.setCookie(...opts.cookies)

      await page.goto(url, { waitUntil: 'domcontentloaded' })

      const isCloudflare = await page.evaluate(() => !!window._cf_chl_opt)

      if (!isCloudflare) {
        return null
      }

      // Force focus due minimized state
      const session = await page.target().createCDPSession()
      await session.send('Emulation.setFocusEmulationEnabled', { enabled: true })

      // Automatic captcha
      if (opts.automatic !== false) {
        await turnstile(page)
      }

      // Manual captcha
      if (opts.interactive === true) {
        await this._manualCaptcha(page)
      }

      const userAgent = await page.evaluate(() => navigator.userAgent)
      let cookies = await page.cookies()

      // Quick fix for cookies not being responded yet
      if (!cookies.find(c => c.name === 'cf_clearance')) {
        await new Promise(resolve => setTimeout(resolve, 1000))

        cookies = await page.cookies()
      }

      if (cookies.find(c => c.name === 'cf_clearance')) {
        return {
          userAgent,
          cookies: cookies.filter(c => c.name.startsWith('__cf_') || c.name.startsWith('cf_'))
        }
      }

      throw new Error('Captcha could not be solved')
    } finally {
      await page.close()
      await browser.close()
    }
  }

  async _manualCaptcha (page) {
    const isCloudflare = await page.evaluate(() => !!window._cf_chl_opt)

    if (!isCloudflare) {
      return
    }

    // TODO: Not maximizing for unknown reason
    // (Tmp log until bug is fixed.)
    console.error('Captcha requires user interaction!')
    await setWindowState(page, 'maximized')

    const started = Date.now()

    while (true) {
      if (Date.now() - started >= 60000) {
        throw new Error('Captcha timeout')
      }

      const isCloudflare = await page.evaluate(() => !!window._cf_chl_opt)

      if (isCloudflare) {
        // Wait until user manually verifies the captcha
        await new Promise(resolve => setTimeout(resolve, 500))

        continue
      }

      break
    }
  }
}

async function setWindowState (page, state) {
  const session = await page.target().createCDPSession()
  const { windowId } = await session.send('Browser.getWindowForTarget')

  await session.send('Browser.setWindowBounds', { windowId, bounds: { windowState: state } })
  await session.detach()
}
