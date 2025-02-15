module.exports = async function turnstile (page) {
  // Based on the DOM itself without waiting on remote scripts
  const isCloudflare = await page.evaluate(() => !!window._cf_chl_opt)

  if (!isCloudflare) {
    return false
  }

  // Wait until Turnstile appears
  try {
    await page.waitForSelector('[name="cf-turnstile-response"]', { timeout: 30000 })
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return false
    }

    throw err
  }

  const element = await page.$('[name="cf-turnstile-response"]')

  if (!element) {
    return false
  }

  // Guess and click the checkbox until the page changes
  const started = Date.now()

  while (true) {
    if (Date.now() - started >= 30000) {
      throw new Error('Cloudflare captcha timeout')
    }

    const isCloudflare = await page.evaluate(() => !!window._cf_chl_opt)

    if (!isCloudflare) {
      // Probably solved
      break
    }

    const parentElement = await element.evaluateHandle(el => el.parentElement)
    const box = parentElement ? await parentElement.boundingBox() : null

    if (!box) {
      // Probably solved
      break
    }

    const x = box.x + randomInteger(25, 35)
    const y = box.y + box.height / 2 + randomInteger(-7, 7)

    await page.mouse.click(x, y)

    await new Promise(resolve => setTimeout(resolve, randomInteger(500, 1000)))
  }

  return true
}

function randomInteger (min, max) {
  const minimum = Math.ceil(min)
  const maximum = Math.floor(max)

  return Math.floor(Math.random() * (maximum - minimum + 1) + minimum)
}
