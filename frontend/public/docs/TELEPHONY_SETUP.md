# Pulse CRM — Real Telephony Setup Guide (Twilio · Telnyx · Plivo · SIP)

This guide takes you from **zero** to **real inbound and outbound phone calls** running through the
self‑hosted IVR engine built into Pulse CRM. The IVR logic (menus, queues, voicemail, business hours,
campaigns, recordings, call log) runs **inside your own backend**. A carrier is only used to bridge
calls to the public phone network (PSTN). You can switch carriers at any time without losing flows.

> **Time needed:** ~20 minutes for Twilio, ~30 minutes for Telnyx or Plivo.
> **Cost:** all three carriers are pay‑as‑you‑go (roughly USD 1–2 / month per number + ~USD 0.01–0.02 / minute).

---

## 0. Before you start — checklist

| Requirement | Why | How to check |
|---|---|---|
| Pulse CRM reachable over **public HTTPS** | Carriers POST webhooks to your backend | Open `https://<your-domain>/api/voice/settings` → you should see `{"detail":"Not authenticated"}` |
| `PUBLIC_BASE_URL` set in `backend/.env` | Used to build webhook URLs and to verify signatures | e.g. `PUBLIC_BASE_URL=https://crm.yourcompany.com` |
| An **admin** login in Pulse CRM | Only `settings.manage` users can edit telephony | Settings → Team |
| A published IVR flow | Inbound calls need a menu to land on | Calls & IVR → IVR flows → **Publish** |

If you run locally for testing, expose the backend with a tunnel:

```bash
ngrok http 8001            # copy the https URL it prints
# then in backend/.env
PUBLIC_BASE_URL=https://xxxxx.ngrok-free.app
```

Restart the backend after changing `.env`.

---

## 1. Choose a carrier

| | **Twilio** (recommended) | **Telnyx** | **Plivo** |
|---|---|---|---|
| Setup difficulty | Easiest | Medium | Easy |
| Browser softphone (agents answer in the CRM) | ✅ Yes (WebRTC) | ❌ ring a phone/SIP instead | ❌ ring a phone/SIP instead |
| Per‑minute price (US) | ~$0.014 | ~$0.005–0.007 | ~$0.01 |
| SIP trunk to your own PBX | ✅ Elastic SIP Trunking | ✅ SIP Trunking | ✅ Zentrunk |
| Free trial | Yes (verified numbers only) | Yes (credit) | Yes (credit) |

All three are configured from **Calls & IVR → Telephony** inside Pulse CRM. You never edit code.

---

## 2A. Twilio — step by step

### 2A.1 Create the account and buy a number
1. Sign up at <https://www.twilio.com/try-twilio> and verify your email + mobile.
2. Console → **Phone Numbers → Manage → Buy a number**. Tick **Voice**, choose your country, click **Buy**.
   *Trial accounts can only call verified numbers — upgrade (add a card) to call anyone.*

### 2A.2 Collect credentials
| Field in Pulse | Where to find it in Twilio Console |
|---|---|
| **Account SID** (`AC…`) | Console home → *Account Info* |
| **Auth Token** | Console home → *Account Info* → click the eye icon |
| **Twilio phone number** | Phone Numbers → Manage → Active numbers (copy in `+1415…` format) |

### 2A.3 (Optional but recommended) Browser softphone
Lets agents answer and dial from the CRM with a headset.
1. Console → **Account → API keys & tokens → Create API key**. Type **Standard**. Copy the **SID** (`SK…`) and **Secret** — the secret is shown **once**.
2. Console → **Voice → Manage → TwiML apps → Create new TwiML App**.
   * Friendly name: `Pulse CRM Softphone`
   * **Voice → Request URL**: paste the *TwiML App Voice URL (softphone)* shown in Pulse → Telephony (it looks like `https://<domain>/api/webhooks/voice/twilio/<workspace-id>/client`), method **POST**.
   * Save and copy the **TwiML App SID** (`AP…`).

### 2A.4 Enter everything in Pulse CRM
1. Calls & IVR → **Telephony** → select **Twilio**.
2. Paste Account SID, Auth Token, phone number (+ API Key SID / Secret / TwiML App SID for the softphone).
3. Set an **Agent fallback number** (your mobile) — used when no agent is online.
4. Leave *Verify webhook signatures* **on**. Click **Save settings**, then **Test connection** — it lists the numbers on your account and confirms your number is owned.

### 2A.5 Point the phone number at Pulse
Console → Phone Numbers → Active numbers → click your number → **Voice Configuration**:

| Twilio setting | Value (copy from Pulse → Telephony → Webhook URLs) |
|---|---|
| Configure with | *Webhook, TwiML Bin, Function…* → **Webhook** |
| **A call comes in** | `…/api/webhooks/voice/twilio/<workspace-id>/inbound` — HTTP **POST** |
| **Primary handler fails** | `…/api/webhooks/voice/twilio/<workspace-id>/fallback` — POST |
| **Call status changes** | `…/api/webhooks/voice/twilio/<workspace-id>/status` — POST |

Click **Save configuration**.

### 2A.6 Test
* **Inbound:** call your Twilio number from a mobile. You should hear the greeting of your published flow. Press a digit → the queue members ring (browser softphone and/or phone numbers). Watch the call appear in **Calls & IVR → Live calls**.
* **Outbound:** Live calls → *Place a real call* → enter your mobile → **Call now**. With the softphone online the call starts in the browser; otherwise Twilio rings your mobile and bridges to the fallback number.
* **Recording:** completed calls show a **Play** link in the call log (recordings live in Twilio, protected by your Auth Token).

---

## 2B. Telnyx — step by step

1. Sign up at <https://telnyx.com/sign-up> (business email required, KYC may take a few hours).
2. **Numbers → Search & Buy Numbers** → filter *Voice* → buy.
3. **Voice → Programmable Voice → Create Application**:
   * Application name `Pulse CRM`
   * **Send a webhook to the URL** → paste the *Webhook URL (Voice API application)* from Pulse → Telephony (`…/api/webhooks/voice/telnyx/<workspace-id>`), **API version v2**.
   * Save, then copy the **Application ID** (long number).
4. **Numbers → My Numbers** → click your number → *Connection or App* → select `Pulse CRM`.
5. **Voice → Outbound Voice Profiles → Create** → name it, add the `Pulse CRM` application → set traffic/country limits → Save.
6. **Account → Keys & Credentials → API Keys → Create API Key** — copy `KEY…` (shown once).
7. Same page, **Public Key** tab → copy the account **public key** (base64). Pulse uses it to verify webhook signatures (Ed25519).
8. In Pulse → Telephony → **Telnyx**: paste API Key, Application ID, phone number, Public Key → **Save** → **Test connection**.
9. Add queue members as phone numbers (`+1…`) or SIP extensions (with *SIP transfer domain*). Test inbound & outbound exactly as in 2A.6.

---

## 2C. Plivo — step by step

1. Sign up at <https://console.plivo.com/accounts/register/> and verify.
2. **Phone Numbers → Buy Numbers** → filter *Voice* → rent.
3. **Voice → Applications → Add New Application**:
   * Name `Pulse CRM`
   * **Answer URL** → paste *Answer URL (Application)* from Pulse (`…/api/webhooks/voice/plivo/<workspace-id>/answer`) — method **POST**
   * **Hangup URL** → paste *Hangup URL (Application)* (`…/hangup`) — POST
   * Save.
4. **Phone Numbers → Your Numbers** → click the number → *Application Type* **XML Application** → select `Pulse CRM` → Update.
5. Console → **Account (top right) → API Keys** → copy **Auth ID** (`MA…`) and **Auth Token**.
6. In Pulse → Telephony → **Plivo**: paste Auth ID, Auth Token, phone number → **Save** → **Test connection**.
7. Test inbound & outbound as in 2A.6.

---

## 2D. Enterprise: connect your own PBX / SIP trunk

Pulse can hand calls to an existing Asterisk / FreeSWITCH / 3CX / Cisco PBX in two ways:

1. **Extension transfer through the carrier** — set *SIP transfer domain* (e.g. `pbx.acme.com`) in Telephony. Any queue member or transfer destination written as digits (`204`) is dialed as `sip:204@pbx.acme.com`. Works with all three carriers; your PBX must accept SIP from the carrier's IP ranges (Twilio/Telnyx/Plivo publish them).
2. **Carrier SIP trunk into the PBX** — buy an *Elastic SIP Trunk* (Twilio) / *SIP Trunk* (Telnyx) / *Zentrunk* (Plivo), register your PBX to it, and keep Pulse as the IVR front door by pointing the DID's voice webhook at Pulse as above. Pulse then transfers to `sip:` URIs on the trunk.

Direct SIP registration from the browser (no carrier at all) requires a media server (Asterisk/FreeSWITCH + coturn) and is intentionally out of scope for this build; see `SELF_HOSTED_DEPLOYMENT.md` for a reference architecture.

---

## 3. Environment variables (backend/.env)

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URL` | ✅ | MongoDB connection string (`mongodb://…` or `mongodb+srv://…`) |
| `DB_NAME` | ✅ | Database name |
| `JWT_SECRET` | ✅ | Signs login tokens — use 32+ random chars in production |
| `INTEGRATIONS_KEY` | ✅ | Fernet key that encrypts carrier credentials at rest. Generate: `python -c "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())"` |
| `PUBLIC_BASE_URL` | ✅ for telephony | Public HTTPS origin of the backend, no trailing slash. Used to build webhook URLs and validate signatures |
| `CORS_ORIGINS` | ✅ | Comma‑separated frontend origins |
| `USE_MOCK_DB` | ❌ | Must be `false` (or absent) in production |

Frontend (`frontend/.env`): `REACT_APP_BACKEND_URL=https://<backend-domain>`.

Carrier credentials are **never** stored in `.env` — they are entered in the UI and encrypted per workspace.

---

## 4. How a call flows (for your engineers)

```
Caller ──► Carrier ──POST──► /api/webhooks/voice/<carrier>/<workspace>/inbound
                              │  signature check (Twilio HMAC-SHA1 / Plivo HMAC-SHA256 / Telnyx Ed25519)
                              │  load published flow, apply business hours
                              ▼
                     IVR engine renders the current node
             greeting/play ─► say + redirect(next)
             menu          ─► gather 1 digit ─► /gather → routes[digit]
             queue         ─► dial members (round-robin / ring-all) ─► /dial-result → fallback/voicemail
             transfer      ─► dial number | sip:ext@domain | client:agent
             voicemail     ─► record ─► /recording (URL stored on the call)
             hangup        ─► say + hangup
                              ▼
                 voice_calls collection: status, ivr_path, digits, duration, recordings
```

Every webhook is idempotent and scoped by `workspace-id`; a wrong provider or bad signature returns 403/404 and the carrier plays its own error.

---

## 5. Go‑live checklist

- [ ] Upgraded carrier account (no trial restrictions), payment method added
- [ ] Number has emergency address / regulatory bundle completed (required in EU/UK/AU)
- [ ] `PUBLIC_BASE_URL` is your production domain and *Verify webhook signatures* is **on**
- [ ] `INTEGRATIONS_KEY` and `JWT_SECRET` rotated from the development values
- [ ] Published flow has a voicemail node and business hours set to your timezone
- [ ] Every queue has at least one member **and** an agent fallback number is set
- [ ] Recording consent message added to the greeting where legally required
- [ ] Test inbound, outbound, voicemail and after‑hours from a real phone
- [ ] Carrier spend alert configured (Twilio: Monitor → Usage triggers; Telnyx: Billing → Alerts; Plivo: Account → Alerts)

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Caller hears "application error" / silence | Webhook URL unreachable or returned 5xx | Open the inbound URL in a browser — you must get a 4xx JSON, not a timeout. Check `PUBLIC_BASE_URL`, TLS certificate, firewall |
| `403 Invalid … signature` in backend logs | `PUBLIC_BASE_URL` differs from the URL the carrier called (http vs https, missing port, proxy rewrite) | Make `PUBLIC_BASE_URL` exactly match the public URL; temporarily untick *Verify webhook signatures* to confirm, then re‑enable |
| Test connection: "configured number NOT found" | Wrong format or number lives in a sub‑account | Use E.164 (`+14155550123`); use the sub‑account's credentials |
| Softphone stays `offline` | Missing API Key / TwiML App, or browser blocked the microphone | Fill the three softphone fields; use HTTPS; allow microphone |
| Softphone `error 31005 / 31000` | TwiML App Voice URL not set or wrong | Paste the *TwiML App Voice URL* into the TwiML App, method POST |
| Inbound goes straight to voicemail | Outside business hours | Edit flow → business hours/timezone, or disable them |
| Outbound rejected (`21215`, `Forbidden`) | Destination country not enabled | Twilio: Voice → Settings → Geo permissions. Telnyx: Outbound Voice Profile → countries. Plivo: Voice → Geo permissions |
| Telnyx accepts webhook but nothing happens | Public Key wrong → every event rejected | Re‑copy the public key or clear the field (verification off) to confirm |
| Recording link asks for login | Recordings are protected by the carrier | Log in to the carrier console, or download via API with the account credentials |

Backend logs: `tail -f /var/log/supervisor/backend.err.log` (supervisor) or your container logs.

---

## 7. Costs at a glance (indicative, USD)

| | Number / month | Inbound / min | Outbound / min (US) | Recording |
|---|---|---|---|---|
| Twilio | 1.15 | 0.0085 | 0.014 | 0.0025 / min + storage |
| Telnyx | 1.00 | 0.0035 | 0.005 | 0.002 / min |
| Plivo | 0.80 | 0.0055 | 0.010 | 0.0025 / min |

Check the carrier pricing pages for your country before going live.
