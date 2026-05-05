# Email Setup UI Reference Guide

## Component Locations

### Quick Setup Button - Settings Page
**Path**: Settings → Integrations Tab

```
╔════════════════════════════════════════════════════════════════╗
║                          SETTINGS                             ║
║  ⚙️ Configure integrations, manage roles & permissions        ║
╚════════════════════════════════════════════════════════════════╝

[TABS] Integrations | Automation | Domains | Roles | Team | Help | Webhooks

╔════════════════════════════════════════════════════════════════╗
║  ⚡ Quick Email Setup                                         ║
║  Get your email integrated in 1 click and receive all         ║
║  support messages                                             ║
║                              [⚡ Setup Email] ← Amber Button  ║
╚════════════════════════════════════════════════════════════════╝

[INTEGRATION CARDS - Existing]
  ✉️ Resend (Email)
  ✉️ SendGrid (Email)
  ✉️ Custom SMTP
  ...
```

**Visual Highlights**:
- Card background: Amber-50 to Orange-50 gradient
- Border: Amber-300 (2px)
- Button: Amber-500 to Orange-600 gradient
- Icon: Zap with pulsing animation (⚡)

### Setup Button - Email Center
**Path**: Email Center Header

```
╔════════════════════════════════════════════════════════════════╗
║ 📧 Email Center                                               ║
║ Sent: 45 | Received: 23 | Today: 5                           ║
║                                                               ║
║ [View Modes] [Filter] [Refresh] [⚡Setup Email] [➕ Compose] │
║                                  ↑                            ↑
║                              Amber Button               Blue Button
╚════════════════════════════════════════════════════════════════╝
```

**Visual Hierarchy**:
- Setup Email: Amber/Orange (stands out)
- Compose: Blue/Indigo (primary action)
- Refresh: Gray (utility)
- View toggles: Gray (secondary)

## Modal Layouts

### Step 0: Provider Selection

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║  ┌─────────────────────────────────────────────────────────────┐│
║  │ 📧 Email Setup                                              ││
║  │ Connect your email to receive support messages              ││
║  └─────────────────────────────────────────────────────────────┘│
║                                                                  ║
║  Choose Your Email Provider                                    ║
║                                                                  ║
║  ┌────────────────────────────────────────────────────────────┐ ║
║  │ 🚀  Resend                                    [Easy] 2 min  │ ║
║  │     Cloud email (recommended for beginners)                │ ║
║  └────────────────────────────────────────────────────────────┘ ║
║                                                                  ║
║  ┌────────────────────────────────────────────────────────────┐ ║
║  │ 📧  SMTP                                   [Medium] 5 min  │ ║
║  │     Gmail, Outlook, or custom server                       │ ║
║  └────────────────────────────────────────────────────────────┘ ║
║                                                                  ║
║  ┌────────────────────────────────────────────────────────────┐ ║
║  │ 🏢  GoDaddy Email                          [Easy] 3 min   │ ║
║  │     GoDaddy hosting with professional email                │ ║
║  └────────────────────────────────────────────────────────────┘ ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

**Interaction**:
- Click any provider card to select
- Cards have hover effect (border color change)
- Shows icon, name, description, difficulty, and time
- Progress indicator: Step 0/2

### Step 1: Configuration

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║  ┌─────────────────────────────────────────────────────────────┐│
║  │ 📧 Email Setup                                              ││
║  │ Connect your email to receive support messages              ││
║  └─────────────────────────────────────────────────────────────┘│
║                                                                  ║
║  🚀 Resend                                                      ║
║     Cloud email (recommended for beginners)                    ║
║                                                                  ║
║  API Key *                                                      ║
║  ┌────────────────────────────────────────────────────────────┐ ║
║  │ re_xxx...                                  [👁️ toggle]     │ ║
║  └────────────────────────────────────────────────────────────┘ ║
║  Get from resend.com/api-keys                                 ║
║                                                                  ║
║  From Email *                                                   ║
║  ┌────────────────────────────────────────────────────────────┐ ║
║  │ support@yourcompany.com                                     │ ║
║  └────────────────────────────────────────────────────────────┘ ║
║  Your support email address                                   ║
║                                                                  ║
║  ┌────────────────────────────────────────────────────────────┐ ║
║  │ ✅ Connected!                                              │ ║
║  │    Connection successful!                                   │ ║
║  └────────────────────────────────────────────────────────────┘ ║
║                                                                  ║
║  [← Back]                          [Connect Email →]            ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

**Form Features**:
- Required fields marked with red asterisk (*)
- Password fields have eye icon toggle
- Placeholder text shows examples
- Help text below each field
- Dynamic number of fields based on provider
- Status box shows test results (green ✅ or red ❌)

**SMTP Provider Example**:
```
API Key           → Host
Placeholder       → SMTP Host
Help text         → SMTP server address
                 ↓
               Port
               587
               Usually 587 or 465
               ↓
           Username
           your-email@domain.com
           ↓
           Password (with toggle)
           ••••
           Use app password for Gmail
           ↓
           From Email
           support@yourcompany.com
           ↓
           From Name (optional)
           Support Team
           Display name in emails
```

### Step 2: Success

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║  ┌─────────────────────────────────────────────────────────────┐│
║  │ 📧 Email Setup                                              ││
║  │ Connect your email to receive support messages              ││
║  └─────────────────────────────────────────────────────────────┘│
║                                                                  ║
║                    ┌──────────────────┐                         ║
║                    │ ✅   (pulsing)   │                         ║
║                    └──────────────────┘                         ║
║                                                                  ║
║           Email Connected!                                     ║
║           Your email integration is ready to receive           ║
║           support messages                                     ║
║                                                                  ║
║  ┌────────────────────────────────────────────────────────────┐ ║
║  │ ⚡ What's Next?                                            │ ║
║  │                                                             │ ║
║  │ 1. Your inbox will now receive all support emails          │ ║
║  │ 2. Emails automatically create tickets in your system      │ ║
║  │ 3. Reply directly from Pulse to manage conversations       │ ║
║  └────────────────────────────────────────────────────────────┘ ║
║                                                                  ║
║              [Done]                                             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

**Visual Elements**:
- Large animated success checkmark (✅)
- Success message with benefits
- Blue callout box with "What's Next?" section
- "Done" button closes modal

## Color Scheme

### Primary Colors
- **Amber/Orange (Quick Setup)**
  - Background: `from-amber-500 to-orange-600`
  - Hover: `from-amber-600 to-orange-700`
  - Use for: Quick setup buttons, attention-grabbing
  - RGB: Amber #F59E0B → Orange #EA580C

- **Blue/Indigo (Primary)**
  - Background: `from-blue-600 to-indigo-600`
  - Hover: `from-blue-700 to-indigo-700`
  - Use for: Main actions (Connect, Save, Done)
  - RGB: Blue #2563EB → Indigo #4F46E5

- **Gray (Neutral)**
  - Background: White (#FFFFFF)
  - Border: Gray-200 (#E5E7EB)
  - Text: Gray-900/700/600/500
  - Use for: Backgrounds, borders, text hierarchy

- **Success Green**
  - Background: `from-green-400 to-green-600`
  - Text: `text-green-800` on green-50
  - Use for: Success states, checkmarks
  - RGB: Green #22C55E

- **Error Red**
  - Background: `from-red-500 to-red-600`
  - Text: `text-red-800` on red-50
  - Use for: Errors, warnings
  - RGB: Red #EF4444

### Gradients
```
Header: from-blue-50 to-indigo-50     (Light blue gradient)
Quick Setup Card: from-amber-50 to-orange-50  (Light amber)
Success: from-green-400 to-green-600   (Bright green)
Primary Button: from-blue-600 to-indigo-600  (Deep blue)
```

## Responsive Behavior

### Desktop (1024px+)
- Modal centered on screen
- Full width provider selection cards
- Side-by-side form layouts where possible
- All text visible without truncation

### Tablet (768px - 1023px)
- Modal adjusted to 90% width
- Single column forms
- Touch-friendly button sizes
- Provider cards stack vertically

### Mobile (< 768px)
- Modal takes 95% width with padding
- Full-screen experience for modals
- Larger touch targets for buttons
- Single column layout
- Text buttons show on desktop only (hidden on mobile)

## Animations

### Button Hover Effects
- Color transition: 300ms ease-all
- Shadow enhancement on hover
- Border color change

### Success Checkmark
- Pulsing animation: 2s infinite
- Opacity fade-in on appear
- Scale animation (pulse effect)

### Loading State
- "Connecting..." spinner animation
- Disabled button state (opacity-50)
- Prevents double-clicks

## Accessibility Features

### Keyboard Navigation
- Tab through all form fields
- Enter to submit forms
- Escape to close modal (planned)
- Focus visible outlines

### Color Contrast
- Text on colored backgrounds: WCAG AA compliant
- Amber text has dark gray background
- Blue text has light background
- Red/Green text has colored backgrounds

### Labels & Help Text
- All form fields have labels
- Helper text for context
- Required field indicators
- Error messages clear and specific

### Screen Readers
- Semantic HTML structure
- Form labels properly associated
- Button purposes clear
- Feedback messages announced

## Icon Usage

### Icons Used
- **Mail** (📧): Email-related sections
- **Zap** (⚡): Quick setup, lightning speed
- **Plus** (➕): Add/Compose actions
- **Check** (✅): Success confirmation
- **AlertCircle** (⚠️): Error/warning states
- **Eye/EyeOff** (👁️): Password visibility
- **ChevronDown/Up** (▼/▲): Expandable sections
- **Settings** (⚙️): Configuration pages

### Icon Styling
- Size: 4px (w-4 h-4) to 6px (w-6 h-6)
- Stroke width: 2-2.5
- Color: Inherit from text color
- Spacing: gap-2 or gap-3 from text

## Error States

### Validation Error
```
┌────────────────────────────────────────┐
│ API Key is required                    │
└────────────────────────────────────────┘
```

### Connection Error
```
┌────────────────────────────────────────────────────────────────┐
│ ❌ Connection Failed                                           │
│    Check your credentials. Ensure host and port are correct.  │
└────────────────────────────────────────────────────────────────┘
```

### Success Message
```
┌────────────────────────────────────────────────────────────────┐
│ ✅ Connected!                                                  │
│    Your email account is ready to use.                        │
└────────────────────────────────────────────────────────────────┘
```

---

**Last Updated**: May 2026
**UI Framework**: Tailwind CSS
**Component Library**: shadcn/ui components
**Icon Library**: Lucide Icons
