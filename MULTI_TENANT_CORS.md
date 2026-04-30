# Multi-Tenant CORS Solution

## Overview

This system provides dynamic CORS (Cross-Origin Resource Sharing) support for multiple businesses using the same backend API. Instead of hardcoding frontend domains, the system allows each business to register and verify their own frontend domains.

## How It Works

### 1. Dynamic CORS Middleware
- **Custom Middleware**: Replaces static CORS configuration with dynamic domain lookup
- **Database-Driven**: Fetches allowed origins from the `frontend_domains` collection
- **Caching**: Caches origins for 5 minutes to avoid database hits on every request
- **Fallback**: Falls back to environment variables if database lookup fails

### 2. Domain Registration Process
1. **Business registers domain** via `/api/frontend-domains` endpoint
2. **System generates verification token** (16-character UUID)
3. **Business creates verification file** at `https://domain/.well-known/pulse-crm-verification.txt`
4. **System verifies ownership** by fetching the file and checking the token
5. **Domain is activated** for CORS once verified

### 3. Verification Process
```
POST /api/frontend-domains/{domain_id}/verify
```
- Fetches `https://domain/.well-known/pulse-crm-verification.txt`
- Checks if verification token is present in the file
- Updates domain status to `verified: true`
- Domain is immediately available for CORS requests

## API Endpoints

### Frontend Domain Management
- `GET /api/frontend-domains` - List domains for current user
- `POST /api/frontend-domains` - Register new domain
- `POST /api/frontend-domains/{id}/verify` - Verify domain ownership
- `DELETE /api/frontend-domains/{id}` - Remove domain
- `GET /api/public/verify-domain/{domain}` - Get verification token (public)

### Example Registration
```json
POST /api/frontend-domains
{
  "domain": "mybusiness.vercel.app",
  "business_name": "My Business Inc"
}
```

### Example Verification File
Create file at: `https://mybusiness.vercel.app/.well-known/pulse-crm-verification.txt`
Content: `abc123def456` (the verification token)

## Frontend Integration

### Domain Settings UI
- **Email Domains Tab**: Manage email sending domains (existing functionality)
- **Frontend Domains Tab**: Manage CORS domains (new functionality)
- **Verification Instructions**: Step-by-step guide for domain verification
- **Status Indicators**: Visual feedback for verified/pending domains

### Verification Steps for Users
1. Go to Settings → Domain Management → Frontend Domains
2. Click "Add Frontend Domain"
3. Enter domain (e.g., `yourbusiness.vercel.app`)
4. Create verification file with provided token
5. Click "Verify" to complete the process

## Deployment Considerations

### Environment Variables
```bash
# Fallback CORS origins (for development and emergency access)
CORS_ORIGINS=https://puls1.vercel.app,http://localhost:3000,https://localhost:3000
```

### Database Collections
- `frontend_domains`: Stores registered frontend domains
- `domains`: Stores email sending domains (existing)

### Security Features
- **Domain validation**: Regex validation for proper domain format
- **Ownership verification**: File-based verification prevents domain hijacking
- **Unique domains**: Each domain can only be registered once
- **User isolation**: Users can only manage their own domains

## Benefits

### For Platform Operators
- **Scalable**: No need to update CORS config for each new business
- **Secure**: Verification prevents unauthorized domain registration
- **Manageable**: Central dashboard to view all registered domains

### For Businesses
- **Self-Service**: Register and verify domains independently
- **Flexible**: Use any domain (Vercel, Netlify, custom domains)
- **Immediate**: CORS access available immediately after verification

### For Developers
- **Clean Architecture**: Separation of concerns between email and frontend domains
- **Extensible**: Easy to add new verification methods or domain types
- **Maintainable**: Clear API structure and documentation

## Example Use Cases

### SaaS Platform
- **Platform**: `api.pulsecrm.com`
- **Business A**: `companya.vercel.app` → registers and verifies
- **Business B**: `app.companyb.com` → registers and verifies
- **Business C**: `crm.companyc.net` → registers and verifies

### White-Label Solution
- **Backend**: Single Pulse CRM instance
- **Frontend**: Multiple branded frontends
- **Domains**: Each brand uses their own domain
- **CORS**: Automatically handled per domain

## Migration from Static CORS

### Before (Static)
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://puls1.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### After (Dynamic)
```python
app.add_middleware(DynamicCORSMiddleware)
```

The new system maintains backward compatibility through environment variable fallback while enabling unlimited domain registration.