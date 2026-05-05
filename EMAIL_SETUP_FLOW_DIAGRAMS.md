# Email Setup - Flow Diagrams & Architecture

## User Flow Diagram

```
START
  ↓
┌─────────────────────────────────────────────┐
│  User navigates to:                         │
│  • Settings → Integrations, OR              │
│  • Email Center                             │
└─────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────┐
│  Sees "Setup Email" button (⚡)             │
│  • Amber/Orange color                       │
│  • Zap icon for quick identification        │
└─────────────────────────────────────────────┘
  ↓
  [User clicks "Setup Email"]
  ↓
┌─────────────────────────────────────────────┐
│  STEP 0: Provider Selection                 │
│                                             │
│  [🚀 Resend]  [📧 SMTP]  [🏢 GoDaddy]    │
└─────────────────────────────────────────────┘
  ↓
  [User selects provider]
  ↓
┌─────────────────────────────────────────────┐
│  STEP 1: Enter Credentials                  │
│                                             │
│  Provider-specific form appears:            │
│  • Resend: API Key, From Email             │
│  • SMTP: Host, Port, User, Pass, etc       │
│  • GoDaddy: Similar to SMTP                │
│                                             │
│  Features:                                  │
│  ✓ Password toggle (show/hide)             │
│  ✓ Helper text for each field              │
│  ✓ Real-time validation                    │
└─────────────────────────────────────────────┘
  ↓
  [User enters credentials]
  ↓
  [User clicks "Connect Email"]
  ↓
┌─────────────────────────────────────────────┐
│  Backend: Save Configuration                │
│  PUT /integrations/{provider}               │
│  Body: { config: {...fields...} }          │
└─────────────────────────────────────────────┘
  ↓
  [Configuration saved]
  ↓
┌─────────────────────────────────────────────┐
│  Backend: Test Connection                   │
│  POST /integrations/{provider}/test         │
└─────────────────────────────────────────────┘
  ↓
  ┌──────────────────────┬──────────────────────┐
  ↓                      ↓
Connection OK      Connection Failed
  ↓                      ↓
┌─────────────────┐   ┌─────────────────────────┐
│ STEP 2: Success │   │ Show Error Message      │
│                 │   │ "Check credentials..."  │
│ ✅ Confirmed!  │   │                         │
│ What's Next:    │   │ Allow user to:          │
│ 1. Get emails   │   │ • Retry connection      │
│ 2. Auto-ticket  │   │ • Go back & change      │
│ 3. Reply quick  │   └─────────────────────────┘
└─────────────────┘   ↓
  ↓                   [User fixes & retries]
  [User clicks "Done"]  ↓
  ↓                   (Returns to Step 1)
┌─────────────────────────────────────────────┐
│  Modal closes                               │
│  Callback fires: onComplete()               │
│  User redirected or state updated           │
└─────────────────────────────────────────────┘
  ↓
SUCCESS! User can now:
✅ Send emails from Pulse
✅ Receive support emails
✅ Create tickets from emails
✅ Reply to customers
  ↓
END
```

## Component Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Pulse CRM Application                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │   Settings.jsx       │      │   Emails.jsx         │    │
│  │                      │      │                      │    │
│  │ Quick Setup Button   │      │ Setup Email Button   │    │
│  │ (Integrations Tab)   │      │ (Header)             │    │
│  │                      │      │                      │    │
│  │ onClick: setState    │      │ onClick: setState    │    │
│  │ showEmailSetup=true  │      │ showEmailSetup=true  │    │
│  └──────────────────────┘      └──────────────────────┘    │
│           │                              │                  │
│           └──────────────┬───────────────┘                  │
│                          ↓                                  │
│           ┌──────────────────────────────────────┐         │
│           │  {showEmailSetup && (                │         │
│           │    <EmailIntegrationSetup            │         │
│           │      onComplete={closeModal} />      │         │
│           │  )}                                  │         │
│           └──────────────────────────────────────┘         │
│                          ↓                                  │
│     ┌────────────────────────────────────────┐             │
│     │  EmailIntegrationSetup Component       │             │
│     │  (/components/EmailIntegrationSetup.jsx)│            │
│     │                                        │             │
│     │  State:                               │             │
│     │  • step (0, 1, 2)                     │             │
│     │  • provider (resend, smtp, etc)       │             │
│     │  • config (form values)               │             │
│     │  • loading (API call status)          │             │
│     │  • testResult (connection test)       │             │
│     │  • showPassword (password toggle)     │             │
│     │                                        │             │
│     │  Renders:                             │             │
│     │  ├─ Modal Container                   │             │
│     │  ├─ Step 0: Provider Selection        │             │
│     │  ├─ Step 1: Configuration Form        │             │
│     │  └─ Step 2: Success Screen            │             │
│     └────────────────────────────────────────┘             │
│                          ↓                                  │
│                   API Calls                                │
│              (Backend Integration)                         │
└──────────────────────────────────────────────────────────────┘
         ↓                                    ↓
    ┌─────────────────────────────────────────────┐
    │            Backend API Server               │
    │                                             │
    │  PUT /integrations/{provider}              │
    │  ├─ Validates config format                │
    │  ├─ Stores in database                     │
    │  └─ Returns: { success: true }             │
    │                                             │
    │  POST /integrations/{provider}/test        │
    │  ├─ Tests email connection                 │
    │  ├─ Validates credentials                  │
    │  └─ Returns: { account_status: "OK" }      │
    │                                             │
    └─────────────────────────────────────────────┘
```

## Data Flow Diagram

```
User Input (Step 1)
       ↓
  ┌────────────────────┐
  │ Form Field Values  │
  │ {                  │
  │   api_key: "...",  │
  │   from_email: "..."│
  │ }                  │
  └────────────────────┘
       ↓
  ┌────────────────────┐
  │ Validation         │
  │ • Required check   │
  │ • Format check     │
  └────────────────────┘
       ↓
  ┌────────────────────────────┐
  │ API Call: Save Config      │
  │ PUT /integrations/resend   │
  │ Header: Authorization      │
  │ Body: { config: {...} }    │
  └────────────────────────────┘
       ↓
  ┌────────────────────────────┐
  │ API Call: Test Connection  │
  │ POST /integrations/.../test│
  │ Header: Authorization      │
  └────────────────────────────┘
       ↓
       ├─ Success ──→ Step 2 (Success Screen)
       │
       └─ Failure ──→ Error Message (stay at Step 1)
                      User can retry or go back
```

## State Machine Diagram

```
START
  ↓
┌──────────────────────────────────────┐
│ STEP 0: Provider Selection           │
│ ────────────────────────────────────│
│ state.step = 0                       │
│ state.provider = ""                  │
│ state.config = {}                    │
└──────────────────────────────────────┘
  │
  │ User selects provider (e.g., "resend")
  │ handleProviderSelect(id)
  ├─ setProvider("resend")
  ├─ setConfig({})
  └─ setStep(1)
  │
  ↓
┌──────────────────────────────────────┐
│ STEP 1: Configuration                │
│ ────────────────────────────────────│
│ state.step = 1                       │
│ state.provider = "resend"            │
│ state.config = { ... }               │
│ state.loading = false                │
└──────────────────────────────────────┘
  │
  ├─ Back button ──→ setStep(0)
  │
  │ User enters credentials
  │ handleInputChange(key, value)
  ├─ setConfig({ ...config, [key]: value })
  │
  │ User clicks "Connect Email"
  │ handleSave()
  ├─ setLoading(true)
  ├─ validateConfig() → true/false
  ├─ API: PUT /integrations/resend
  ├─ setLoading(false)
  ├─ handleTest() (auto-called)
  │
  ├─ API: POST /integrations/resend/test
  │ ├─ Success: setTestResult({success: true, message: "..."})
  │ │           setStep(2)
  │ └─ Error:   setTestResult({success: false, message: "..."})
  │
  ↓
┌──────────────────────────────────────┐
│ STEP 2: Success                      │
│ ────────────────────────────────────│
│ state.step = 2                       │
│ state.testResult = { success: true } │
│ Animation: Checkmark appears         │
└──────────────────────────────────────┘
  │
  │ User clicks "Done"
  │ onClick={() => {
  │   if (onComplete) onComplete();
  │   setStep(0);
  │   setConfig({});
  │ }}
  │
  ↓
Component unmounts or modal closes
Callback fires: onComplete()
Parent component closes modal
User sees success message
```

## Modal Visibility Flow

```
Parent Component (Settings.jsx or Emails.jsx)
       │
       ├─ State: showEmailSetup = false
       │
       ├─ JSX:
       │ {showEmailSetup && <EmailIntegrationSetup onComplete={...} />}
       │
       └─ Buttons:
          [Setup Email] → onClick={() => setShowEmailSetup(true)}
                                          ↓
                               Modal appears ✅
                               
                               User completes setup
                               ↓
                               onComplete() fires
                               ↓
                               setShowEmailSetup(false)
                               ↓
                               Modal disappears ✅
```

## Provider Configuration Structure

```
PROVIDERS Array:
┌──────────────────────────────────────────────────────┐
│ [                                                    │
│   {                                                  │
│     id: "resend",                                   │
│     name: "Resend",                                 │
│     desc: "Cloud email...",                         │
│     icon: "🚀",                                     │
│     difficulty: "Easy",                             │
│     setupTime: "2 min",                             │
│     fields: [                                       │
│       {                                             │
│         key: "api_key",        ──────┐             │
│         label: "API Key",             │             │
│         placeholder: "re_xxx",        │──→ Form     │
│         secret: true,                 │    Input    │
│         help: "Get from..."           │             │
│       },                              │             │
│       {                              ─┘             │
│         key: "from_email",                          │
│         label: "From Email",                        │
│         ...                                         │
│       }                                             │
│     ]                                               │
│   },                                                │
│   { /* SMTP provider */ },                          │
│   { /* GoDaddy provider */ }                        │
│ ]                                                   │
└──────────────────────────────────────────────────────┘
     ↓
   Used in:
   • Step 0: Display provider cards
   • Step 1: Render form fields dynamically
   • Step 2: Show what was configured
```

## Error Handling Flow

```
User enters invalid credentials
         ↓
User clicks "Connect Email"
         ↓
validateConfig() 
  ├─ Check required fields
  ├─ true → proceed to save
  └─ false → toast.error("Field required") → stay at Step 1
         ↓
API: PUT /integrations/provider
  ├─ Success → proceed to test
  └─ Error (400) → 
        ├─ catch error
        ├─ toast.error(error.response.data.detail)
        └─ stay at Step 1, show error in red box
         ↓
API: POST /integrations/provider/test
  ├─ Success ──→ setStep(2) ✅
  └─ Error (401/500) →
        ├─ setTestResult({ success: false, message: "..." })
        ├─ show red error box
        ├─ toast.error("Connection test failed")
        └─ stay at Step 1, allow retry
```

## API Integration Points

```
Frontend Component
       │
       ├─ API Request 1
       │  └─ PUT /integrations/{provider}
       │     ├─ Authorization: Bearer token
       │     ├─ Body: { config: {...} }
       │     └─ Expect: { success: true } or error
       │
       └─ API Request 2
          └─ POST /integrations/{provider}/test
             ├─ Authorization: Bearer token
             └─ Expect: { account_status: "..." } or error

Examples:
┌─────────────────────────────────────────────┐
│ PUT /integrations/resend                    │
│ {                                           │
│   "config": {                               │
│     "api_key": "re_xxxxxxxxxxxx",           │
│     "from_email": "support@company.com"     │
│   }                                         │
│ }                                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ PUT /integrations/smtp                      │
│ {                                           │
│   "config": {                               │
│     "host": "smtp.gmail.com",               │
│     "port": 587,                            │
│     "username": "user@gmail.com",           │
│     "password": "app_password",             │
│     "from_email": "support@company.com",    │
│     "from_name": "Support Team"             │
│   }                                         │
│ }                                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ POST /integrations/resend/test              │
│ (No body, just test with stored config)     │
│ Response: {                                 │
│   "account_status": "Connected!"            │
│ }                                           │
└─────────────────────────────────────────────┘
```

---

**Last Updated**: May 5, 2026
**Format**: Markdown with ASCII diagrams
**Purpose**: Help understand component architecture and data flows
