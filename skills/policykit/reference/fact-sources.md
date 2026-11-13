# Fact sources - building the ground-truth inventory from the repo

The policy is never evidence of its own claims (`SKILL.md`, law 4). This file shows where the truth
lives in a repository, and what a repository can never show. Every inventory item is recorded as:

```
item:     <what - e.g. "processor: Stripe", "cookie: _ga", "retention: account deletion">
status:   present <file:line> | absent <what was searched> | unknown <why the repo cannot show it>
liveness: live | feature-flagged <flag, production value and its source, or unknown> | dead | test-only
```

A dependency in `package.json` that nothing imports is not a processor. A script tag behind a consent
gate is still a cookie the policy must disclose, but it is consent-based, not essential. Follow each
hit to the code that runs it before you record it as live.

## Where to look

| Question | Where the answer lives | Search for |
| --- | --- | --- |
| **Which third parties receive data?** | Dependencies (`package.json`, lockfiles, `requirements.txt`, `go.mod`, `Gemfile`, ...), SDK initialisation, outbound `fetch` / HTTP-client calls, env var names, `<script src>` and iframe hosts, CSP headers (they list allowed third-party hosts), `next.config` / middleware rewrites and proxies. | Vendor package names and hosts: payments (`stripe`, `@paddle`, `@lemonsqueezy`, `mollie`, `braintree`, `paypal`), email (`resend`, `@sendgrid`, `postmark`, `mailgun`, `nodemailer` SMTP host, `@aws-sdk/client-ses`), analytics (`gtag`, `googletagmanager`, `posthog`, `mixpanel`, `@segment`, `plausible`, `@vercel/analytics`, `umami`, `matomo`, `hotjar`, `clarity`), errors (`@sentry`, `bugsnag`, `rollbar`, `logrocket`, `datadog`), support (`intercom`, `crisp`, `zendesk`, `helpscout`), auth (`@clerk`, `auth0`, `next-auth` providers, `firebase/auth`, `@supabase`), storage and DB hosts (`@aws-sdk/client-s3`, `@vercel/blob`, `cloudflare` R2, connection-string hosts), AI (`openai`, `@anthropic-ai/sdk`, `@google/generative-ai`, `cohere`, `replicate`), ads (`fbq`, `facebook pixel`, `linkedin insight`, `tiktok pixel`, `google ads` conversion tags), maps, fonts, video embeds (`fonts.googleapis.com`, `youtube.com/embed`, `vimeo`). Env var prefixes name vendors (`STRIPE_`, `SENTRY_`, `OPENAI_`, ...). |
| **What personal data is collected?** | DB schema and migrations (Prisma, Drizzle, SQL, ORM models), validation schemas on forms and API inputs (zod, yup, joi), the forms themselves, analytics `track()` / `capture()` calls and their properties, and what is logged (request logs often hold IP addresses, user agents, and emails). | `email`, `name`, `phone`, `address`, `ip`, `userAgent`, `birth`, `dob`, `location`, `geo`, `lat`, `payment`, `card`, `iban`, `ssn`, `passport`, `health`, `gender`, `ethnic`, `religion`, `biometric`, `child`, `age`. The last group are signals for special-category (GDPR Art 9) or children's data. |
| **Which cookies and client storage are set?** | Server-side cookie writes, client-side storage writes, and third-party scripts (each vendor documents its cookies). The consent banner's config, if there is one. | `document.cookie`, `cookies().set`, `setCookie`, `res.cookie`, `Set-Cookie`, `localStorage`, `sessionStorage`, `indexedDB`, session config (`maxAge`, `expires`), CSRF tokens, consent-manager config (`cookieconsent`, `klaro`, `cookiebot`, `onetrust`, `usercentrics`). |
| **Where is the data hosted?** | Deploy config: `vercel.json` (`regions`), `fly.toml` (`primary_region`), `wrangler.toml`, `netlify.toml`, Terraform and IaC (`region =`), Docker Compose, DB connection-string hosts, the region of each storage bucket. | `region`, `location`, `eu-`, `us-`, `fra1`, `iad1`, `ams`, ... Many hosts are only partly visible from the repo (the managed DB's region may live in a dashboard): record `unknown` rather than guessing. |
| **How long is data kept?** | Scheduled jobs (cron config, `vercel.json` crons, queue workers), TTL indexes, soft-delete vs hard-delete paths, the account-deletion handler and everything it touches, log retention settings, and any backup config in the repo. | `cron`, `schedule`, `ttl`, `expireAfterSeconds`, `deletedAt`, `softDelete`, `purge`, `cleanup`, `retention`, `DELETE FROM`, `.delete(`, `destroy`. Backup retention at a managed provider is almost always `unknown` - a user fact. |
| **Can people exercise their rights?** | The UI and endpoints for data export, account deletion, email change and correction, unsubscribe, marketing opt-in and opt-out, and the cookie-preference control. | Routes and handlers named `export`, `download-data`, `delete-account`, `unsubscribe`, `preferences`, `opt-out`, `do-not-sell`. Check that the flow the policy describes actually exists. |
| **What consent is captured?** | Signup and checkout forms: checkboxes, their default state (a pre-ticked box is not consent), their label text (it is a satellite clause), and what is stored when they are ticked (timestamp, revision). | `checkbox`, `consent`, `agree`, `accept`, `terms`, `marketing`, `newsletter`, `defaultChecked`, `checked={true}`. For withdrawal-right exceptions: a step where the consumer expressly asks to start performance during the withdrawal period, and acknowledges losing the right. |
| **Are marketing emails sent, and how?** | Email templates and their footers (an unsubscribe link), and the list-subscription logic. | `unsubscribe`, `List-Unsubscribe`, `newsletter`, `campaign`, `audience`. |
| **Is there automated decision-making or profiling?** | Scoring, risk, fraud, moderation, recommendation, and eligibility logic that decides something about a person without a human. Any AI call whose output decides an outcome for a person. | `score`, `risk`, `fraud`, `eligib`, `approve`, `reject`, `ban`, `moderat`, `recommend`, plus model or LLM calls used for decisions. |
| **Is any data sold or shared?** | Ad pixels and conversion APIs, audience syncs, data exports to ad platforms, and affiliate trackers. Also every third party in the inventory that receives personal information (analytics, session replay, chat, error tracking): under the CCPA it is a sale unless the vendor is a service provider or contractor under a contract with the §1798.100(d) terms - whether that contract exists is a user fact. | `fbq(`, `conversions api`, `gtag('event', 'conversion'`, `ttq`, `lintrk`, `audience`, `customer match`. |

## What a repo can never show - always a user fact

- Backup retention, and vendor-side settings (log retention at the host, the analytics data-retention
  setting, IP anonymisation toggles in a dashboard).
- Signed DPAs, SCCs, and Data Privacy Framework certifications of the vendors.
- The legal entity, its registrations, its office, any DPO or representative appointment.
- Incident-response, support, and request-handling practice (who answers, how fast in reality).
- Offline processing: spreadsheets, CRM tools used by staff, accountants, payroll.
- Which markets are targeted, and the size thresholds.
- Anything injected at runtime from outside the repo: tag-manager container tags, CMS or site-builder
  scripts, and scripts or cookies added by a CDN, WAF, or host. A negative claim ("we do not use
  X") is never settled by repo absence: confirm it with the user or from the live site's cookies and
  network requests, or it is a QUESTION.

Anything in this list that a clause depends on is resolved by `facts.md` or becomes a QUESTION. It
never passes on assumption.
