# Email Setup - Developer Quick Start Guide

## What Was Built

A one-click email integration modal that lets users set up email in 2-5 minutes through a simple 3-step wizard.

## Files You Need to Know About

### 1. Main Component
**File**: `/frontend/src/components/EmailIntegrationSetup.jsx` (314 lines)

**What it does**:
- Renders a modal with email setup wizard
- Handles 3 steps: select provider → enter credentials → verify connection
- Validates form inputs
- Tests connections with backend
- Shows success/error feedback

**How to use it**:
```jsx
import EmailIntegrationSetup from "../components/EmailIntegrationSetup";

// In your component:
const [showEmailSetup, setShowEmailSetup] = useState(false);

return (
  <>
    {showEmailSetup && <EmailIntegrationSetup onComplete={() => setShowEmailSetup(false)} />}
    <button onClick={() => setShowEmailSetup(true)}>Setup Email</button>
  </>
);
```

### 2. Integration Points
- **Settings Page**: `/frontend/src/pages/Settings.jsx`
  - Quick setup button in Integrations tab
  - Modal renders conditionally

- **Email Page**: `/frontend/src/pages/Emails.jsx`
  - Setup button in header
  - Modal renders conditionally

## How It Works

### Component Flow
```
Step 0: Provider Selection
        ↓
User picks Resend/SMTP/GoDaddy
        ↓
Step 1: Configuration
        ↓
User enters credentials
        ↓
Click "Connect Email"
        ↓
Save to backend (PUT /integrations/{provider})
        ↓
Test connection (POST /integrations/{provider}/test)
        ↓
Success? Show Step 2: Success Screen
        ↓
User clicks "Done"
        ↓
Modal closes, callback fires
```

### Key State Variables
```javascript
const [step, setStep] = useState(0);              // Current step (0, 1, 2)
const [provider, setProvider] = useState("resend"); // Selected provider
const [config, setConfig] = useState({});          // Form values
const [loading, setLoading] = useState(false);     // API call state
const [testResult, setTestResult] = useState(null);// Test result
const [showPassword, setShowPassword] = useState({}); // Password visibility
```

## Customization Guide

### Adding a New Email Provider

**In EmailIntegrationSetup.jsx**:

```javascript
const PROVIDERS = [
  {
    id: "new_provider",              // Unique ID
    name: "New Email Service",       // Display name
    desc: "Description here",        // Short description
    icon: "🎯",                      // Emoji icon
    fields: [                        // Form fields
      { 
        key: "api_key",              // Field name
        label: "API Key",            // Form label
        placeholder: "xxx",          // Input placeholder
        secret: true,                // Mask input (password)
        help: "Get from provider",   // Help text
        optional: false              // Is it required?
      },
      // ... more fields
    ],
    difficulty: "Easy",              // Easy/Medium/Hard
    setupTime: "2 min"               // Estimated time
  }
  // ... other providers
];
```

### Changing Colors

**Provider Button (Step 0)**:
```jsx
// Currently: border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50
// Change to:
className="... border-blue-300 hover:border-purple-500 hover:bg-purple-50"
```

**Modal Header**:
```jsx
// Currently: from-blue-50 to-indigo-50
// Change to:
className="bg-gradient-to-r from-purple-50 to-pink-50"
```

**Quick Setup Card (in Settings/Emails)**:
```jsx
// Currently: from-amber-50 to-orange-50, border-amber-300
// Change to:
className="from-blue-50 to-cyan-50 border-blue-300"
```

**Action Buttons**:
```jsx
// Currently: from-blue-600 to-indigo-600
// Change to:
className="from-green-600 to-emerald-600"
```

## Backend Integration

### Expected API Endpoints

**Save Configuration**:
```
PUT /integrations/{provider}
Headers: Authorization: Bearer {token}
Body: { config: { field1: value1, field2: value2, ... } }
Response: { success: true } or throw error
```

**Test Connection**:
```
POST /integrations/{provider}/test
Headers: Authorization: Bearer {token}
Response: { account_status: "...", friendly_name: "..." }
         or throw error if connection fails
```

### Error Handling

Errors should be thrown or returned with proper status codes:
```javascript
// 400 Bad Request - Validation error
{ detail: "API key format is invalid" }

// 401 Unauthorized - Credentials wrong
{ detail: "Invalid credentials provided" }

// 500 Server Error - Server issue
{ detail: "Failed to test connection" }
```

The component will catch these and show user-friendly messages.

## Testing

### Manual Testing Checklist

**Settings Page**:
- [ ] Navigate to Settings → Integrations
- [ ] See "Quick Email Setup" card (amber/orange)
- [ ] Click "Setup Email" button
- [ ] Modal opens

**Email Center**:
- [ ] Go to Email Center
- [ ] See "Setup Email" button in header (amber/orange)
- [ ] Click it
- [ ] Modal opens

**Step 0 - Provider Selection**:
- [ ] See 3 provider cards
- [ ] Hover effects work (border/background change)
- [ ] Click each card - advances to step 1
- [ ] Selected provider matches the form

**Step 1 - Configuration**:
- [ ] Form fields appear for selected provider
- [ ] Field labels, placeholders, and help text show
- [ ] Password fields are masked (•••)
- [ ] Eye icon toggles password visibility
- [ ] Required fields marked with *
- [ ] "Back" button returns to provider selection
- [ ] "Connect Email" button triggers save

**Step 2 - Success**:
- [ ] Success screen appears after connection test
- [ ] Animated checkmark displays
- [ ] "What's Next?" section shows next steps
- [ ] "Done" button closes modal
- [ ] Callback function fires (modal closes in parent)

**Error Handling**:
- [ ] Submit empty form - shows validation error
- [ ] Enter wrong credentials - shows connection error
- [ ] Error messages are clear and helpful

**Responsive**:
- [ ] Desktop: Modal centered, full width
- [ ] Tablet: Modal 90% width, single column
- [ ] Mobile: Modal 95% width, full screen feel

### Unit Test Examples

```javascript
describe('EmailIntegrationSetup', () => {
  it('should start at step 0', () => {
    render(<EmailIntegrationSetup />);
    expect(screen.getByText('Choose Your Email Provider')).toBeInTheDocument();
  });

  it('should move to step 1 when provider selected', async () => {
    render(<EmailIntegrationSetup />);
    fireEvent.click(screen.getByText('Resend'));
    expect(screen.getByDisplayValue('re_xxx')).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    render(<EmailIntegrationSetup />);
    fireEvent.click(screen.getByText('Resend'));
    fireEvent.click(screen.getByText('Connect Email'));
    expect(screen.getByText('API Key is required')).toBeInTheDocument();
  });

  it('should call onComplete when done', async () => {
    const onComplete = jest.fn();
    render(<EmailIntegrationSetup onComplete={onComplete} />);
    // ... go through setup ...
    fireEvent.click(screen.getByText('Done'));
    expect(onComplete).toHaveBeenCalled();
  });
});
```

## Debugging Tips

### Modal won't open?
1. Check that `showEmailSetup` state is being set to true
2. Check that `onComplete` callback is provided
3. Check console for import errors
4. Verify component path is correct

### Form fields not showing?
1. Check that provider selection worked
2. Verify `PROVIDERS` array has the correct fields
3. Check that provider ID matches the fields definition

### API calls failing?
1. Check network tab for API response
2. Verify backend endpoints exist
3. Check Authorization header is sent
4. See if error response has `detail` field

### Styling looks wrong?
1. Check Tailwind CSS is configured
2. Verify custom colors in tailwind.config.js
3. Check for conflicting CSS
4. Clear cache and rebuild

## Common Modifications

### Hide a Provider
```javascript
const PROVIDERS = [
  // ...existing...
].filter(p => p.id !== 'sendgrid'); // Hide SendGrid
```

### Change Default Provider
```javascript
const [provider, setProvider] = useState("smtp"); // Was "resend"
```

### Make Field Optional
```javascript
{
  key: "from_name",
  label: "From Name",
  optional: true,  // Add this
  help: "Display name (optional)"
}
```

### Increase Timeout
```javascript
// In handleSave function
setLoading(true);
// Add this before API call:
const timeout = setTimeout(() => {
  toast.error("Request timed out");
  setLoading(false);
}, 30000); // 30 seconds
```

## Performance Notes

- Modal only renders when `showEmailSetup` is true
- No external dependencies beyond existing project
- Single component, ~314 lines, minimal bundle impact
- API calls batched (save + immediate test)
- State updates only affect this component

## Security Considerations

✅ **Already Implemented**:
- Password fields masked by default
- Credentials sent via HTTPS (API.baseURL)
- No credentials logged to console
- Auth token automatically included in requests
- Backend validates all credentials

⚠️ **Remember**:
- Don't store passwords in localStorage
- Don't log API responses with sensitive data
- Always use HTTPS in production
- Validate on backend before saving

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with ES6 support

No polyfills needed for modern features used.

## File Size Impact

- Component: ~314 lines
- Minified: ~8-10 KB
- Gzipped: ~2-3 KB
- No new dependencies

## Related Documentation

- **User Guide**: `/ONE_CLICK_EMAIL_SETUP.md`
- **Implementation Details**: `/EMAIL_SETUP_IMPLEMENTATION.md`
- **UI Reference**: `/EMAIL_SETUP_UI_REFERENCE.md`

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Modal doesn't open | Check `showEmailSetup` state is true |
| Form fields missing | Verify provider selected correctly |
| API calls fail | Check network tab, verify endpoints |
| Styling wrong | Clear cache, check Tailwind config |
| Password toggle broken | Check `showPassword` state exists |
| Validation fails | Check `validateConfig()` logic |
| Toast not showing | Verify sonner is installed |

---

**Last Updated**: May 2026
**Version**: 1.0
**Difficulty**: Intermediate
**Time to Understand**: 15-30 minutes
