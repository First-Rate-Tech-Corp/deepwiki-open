# Deploying DeepWiki for First-Rate-Tech-Corp

This guide is written for a **non-technical owner**. Follow it top to bottom.
It deploys a private, Gemini-powered, password-gated DeepWiki on
**DigitalOcean App Platform**, then shows you how to add your private repos.

There is no code to write. You will mostly click buttons and paste values.

---

## What you are deploying

- **DeepWiki** turns a code repository into a browsable wiki plus an AI chat.
- It runs as **one container** on DigitalOcean. The website you visit is the
  frontend; the AI brain runs invisibly inside the same container.
- It uses **Google Gemini** for both embeddings and answers, so the only AI key
  you need is a **Google API key**.
- It is gated by an **access code** you choose, so random people can't open it.

---

## Before you start — gather two secrets

You will need these two values during setup. Get them now.

### 1. `GOOGLE_API_KEY` (your Gemini key)
1. Go to **https://aistudio.google.com/apikey** (sign in with the Google account
   you want billed — your existing Google Cloud project is fine).
2. Click **Create API key**.
3. Copy the long string it gives you. Keep it somewhere safe for a minute.

### 2. `DEEPWIKI_AUTH_CODE` (your access passphrase)
- Make up a **strong passphrase** (e.g. 4–5 random words plus a number).
  Example style: `copper-harbor-lantern-47-rpainfall`.
- This is the code anyone must type to open your DeepWiki. Don't reuse a
  password you use elsewhere. Write it down securely.

---

## Step 1 — Create the App on DigitalOcean

1. Log in to **https://cloud.digitalocean.com**.
2. In the left menu click **App Platform** → **Create App**.
3. Choose **GitHub** as the source and authorize DigitalOcean if asked.
4. Pick the repository **`First-Rate-Tech-Corp/deepwiki-open`** and the
   **`main`** branch.
5. DigitalOcean should detect the **App Spec** file at **`.do/app.yaml`** and
   pre-fill the settings (one Docker service named `deepwiki`, public port 3000,
   instance size `professional-xs`).
   - If it does NOT auto-detect, choose **Create App from App Spec** / **Edit
     your App Spec** and paste the contents of `.do/app.yaml` from this repo.

> **Why `professional-xs`?** Indexing a repo uses memory. Sizes under ~1 GB can
> run out of memory and crash mid-index. `professional-xs` is ~1 GB. If you
> later index big repos and it crashes, bump it to a larger size in the app's
> **Settings → your component → Edit → Resource Size**.

---

## Step 2 — Set the two SECRET values

DigitalOcean will show the environment variables from the spec. Two of them are
marked **SECRET** and currently hold the placeholder `REPLACE_IN_DO_DASHBOARD`.
You must replace both with your real values:

| Variable             | What to paste                                  |
|----------------------|------------------------------------------------|
| `GOOGLE_API_KEY`     | The Gemini key from "Before you start" step 1. |
| `DEEPWIKI_AUTH_CODE` | The passphrase you invented in step 2.         |

Leave the other variables as they are:
- `DEEPWIKI_EMBEDDER_TYPE = google`  ← forces Gemini embeddings
- `DEEPWIKI_AUTH_MODE = true`        ← turns on the access wall
- `SERVER_BASE_URL = http://localhost:8001` ← internal wiring, don't change

---

## Step 3 — Deploy

1. Click **Create Resources** / **Deploy**.
2. The first build takes several minutes (it builds the whole container).
3. When it finishes, DigitalOcean gives you a public URL like
   `https://deepwiki-frtc-xxxxx.ondigitalocean.app`. That's your DeepWiki.

> Pushing new commits to the `main` branch of the fork will auto-redeploy
> (`deploy_on_push: true`).

---

## Step 4 — Open it and enter the access code

1. Visit the DigitalOcean URL.
2. You'll be asked for the **access code** — type the `DEEPWIKI_AUTH_CODE`
   passphrase you set. You're in.

---

## Step 5 — Add your private repositories

DeepWiki indexes private repos at runtime — you paste the repo URL and a GitHub
token in the UI. Nothing about your private repos is stored in the deploy
config.

### 5a. Create a read-only GitHub token (fine-grained PAT)
1. Go to **https://github.com/settings/personal-access-tokens/new**
   (GitHub → Settings → Developer settings → Personal access tokens →
   **Fine-grained tokens** → **Generate new token**).
2. **Token name:** e.g. `deepwiki-readonly`.
3. **Resource owner:** select **First-Rate-Tech-Corp** (the org).
4. **Expiration:** pick a reasonable date (e.g. 90 days); you can regenerate.
5. **Repository access:** choose **Only select repositories**, and select just:
   - `First-Rate-Tech-Corp/make-it-rain-api`
   - `First-Rate-Tech-Corp/make-it-rain-frontend`
6. **Permissions → Repository permissions:** set **Contents** to **Read-only**.
   (That's all DeepWiki needs to read the code. Leave everything else as
   "No access".)
7. Click **Generate token** and **copy** it. You won't see it again.

> If the org requires admin approval for fine-grained tokens, an org owner may
> need to approve the token request before it works.

### 5b. Index each repo in DeepWiki
1. In DeepWiki, paste the repo URL, for example:
   - `https://github.com/First-Rate-Tech-Corp/make-it-rain-api`
2. When prompted, paste the **GitHub token** from step 5a.
3. Submit. DeepWiki clones the repo, builds Gemini embeddings, generates the
   wiki, and (where supported) enables chat.
4. Repeat for `…/make-it-rain-frontend`.

> **Known limitation (single public container):** Wiki **generation and reading
> work normally**. The interactive **"Ask"/chat** feature opens a live
> connection (WebSocket) directly from your browser to the AI backend on
> `localhost:8001`, which a browser can't reach in this single-public-port
> setup. If the chat box doesn't respond, that's why — the wiki pages
> themselves still generate and display. For full chat, run DeepWiki locally
> (see the bottom of this file) or split the backend onto its own public
> component. Wiki content (the main value) is unaffected.

---

## SECURITY — please read

**DeepWiki's built-in access code protects the UI, but it does NOT fully lock
down the underlying API.** That means a public DigitalOcean URL hosting a wiki
of your **private / sellable code** is a residual exposure: someone who finds
the URL and probes the API could potentially reach content the UI is hiding.

### Strongly recommended: put it behind Cloudflare Access (free)
**Cloudflare Access** is a free, email-gated "zero-trust" gate. Visitors must
sign in with an approved email before they can reach the app **at all** — the
real protection the built-in code can't provide.

High-level steps:
1. Add the app's **custom domain** to Cloudflare (point your domain's DNS at
   Cloudflare; in DigitalOcean, add that custom domain to the app).
2. In Cloudflare go to **Zero Trust → Access → Applications → Add an
   application** → **Self-hosted**.
3. Set the application domain to your DeepWiki hostname.
4. Add an **Access policy**: Action **Allow**, rule **Emails** → your email(s)
   (e.g. `chris@firstratetechcorp.com`). Only those emails can get in.
5. Save. Now the site demands an approved-email login before DeepWiki even
   loads.

### Until Cloudflare Access is in place
- Keep the **URL** and the **access code** private. Don't share them.
- Treat the deployment as "soft-protected," not "secure."

### Cheapest / most private alternative: run it locally
For maximum privacy, don't deploy publicly at all — **run DeepWiki on your own
machine** with Docker and the same environment variables
(`GOOGLE_API_KEY`, `DEEPWIKI_EMBEDDER_TYPE=google`, `DEEPWIKI_AUTH_MODE=true`,
`DEEPWIKI_AUTH_CODE=…`). Then it's only reachable at `http://localhost:3000` on
your computer, and the chat feature also works because everything is local.

---

## Quick reference — environment variables

| Variable                 | Value                    | Purpose                              |
|--------------------------|--------------------------|--------------------------------------|
| `GOOGLE_API_KEY`         | (your Gemini key, SECRET)| Gemini embeddings + answers          |
| `DEEPWIKI_EMBEDDER_TYPE` | `google`                 | Force the Gemini embedder            |
| `DEEPWIKI_AUTH_MODE`     | `true`                   | Turn on the access-code wall         |
| `DEEPWIKI_AUTH_CODE`     | (your passphrase, SECRET)| The code users must enter            |
| `SERVER_BASE_URL`        | `http://localhost:8001`  | Internal frontend → backend wiring   |
