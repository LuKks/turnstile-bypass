# turnstile-bypass

Solve Turnstile captchas automatically

```
npm i turnstile-bypass
```

## Usage

```js
const TurnstileBypass = require('turnstile-bypass')

const cf = new TurnstileBypass()

const bypass = await cf.solve('https://dexscreener.com')
// => { userAgent, cookies }
```

To allow manual solving of the captcha as a fallback:

```js
const bypass = await cf.solve('https://dexscreener.com', {
  interactive: true
})
```

## API

#### `cf = new TurnstileBypass()`

Create a new Cloudflare Bypass instance.

#### `bypass = await cf.solve(url[, options])`

Solve a captcha and get the authorized cookies.

Options:

```js
{
  automatic: true, // Try to automatically solve the captcha
  interactive: false // Fallback to manual solving of the captcha
}
```

## License

MIT
