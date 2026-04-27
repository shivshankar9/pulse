# Supabase Migration Plan (Instead of MongoDB)

## Current MongoDB Collections:
1. `users` - User accounts and authentication
2. `roles` - Role definitions and permissions
3. `contacts` - CRM contacts
4. `deals` - Sales deals/pipeline
5. `activities` - Tasks, calls, meetings
6. `emails` - Email logs
7. `tickets` - Support tickets
8. `saved_views` - Saved filters/views
9. `helpdesk_config` - Helpdesk configuration
10. Plus others: `integrations`, `messages`, `voice_calls`, `webhook_events`, `invitations`, etc.

## Migration Steps:

### 1. Create Supabase Project
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Create new project
supabase projects create "pulse-crm"
```

### 2. Design PostgreSQL Schema

#### Users Table:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Contacts Table:
```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    title TEXT,
    status TEXT DEFAULT 'lead',
    source TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    score INTEGER,
    score_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Deals Table:
```sql
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    contact_id UUID REFERENCES contacts(id),
    company TEXT,
    value DECIMAL(10,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    stage TEXT DEFAULT 'lead',
    expected_close DATE,
    notes TEXT,
    probability INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Update Backend Code

#### Replace MongoDB imports with Supabase:
```python
# Instead of:
from motor.motor_asyncio import AsyncIOMotorClient
import os

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Use:
from supabase import create_client, Client
import os

supabase_url = os.environ['SUPABASE_URL']
supabase_key = os.environ['SUPABASE_KEY']
supabase: Client = create_client(supabase_url, supabase_key)
```

#### Update Database Operations:
```python
# MongoDB style:
# await db.contacts.find_one({"id": cid, "owner_id": user["id"]})

# Supabase style:
response = supabase.table('contacts')\
    .select('*')\
    .eq('id', cid)\
    .eq('owner_id', user['id'])\
    .execute()
contact = response.data[0] if response.data else None
```

### 4. Update Requirements.txt
Remove MongoDB dependencies and add Supabase:
```txt
# Remove:
# motor==3.3.1
# pymongo==4.5.0

# Add:
supabase==2.3.1
psycopg2-binary==2.9.9
```

### 5. Environment Variables Update
```env
# Instead of:
MONGO_URL=mongodb://...
DB_NAME=pulse_crm

# Use:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

## Challenges to Consider:

1. **Data Migration**: Need to export MongoDB data and import to PostgreSQL
2. **Query Syntax**: MongoDB uses JSON-like queries, PostgreSQL uses SQL
3. **Schema Design**: MongoDB is schemaless, PostgreSQL requires strict schema
4. **Arrays vs JSON**: MongoDB stores arrays natively, PostgreSQL uses array types or JSONB
5. **Performance**: Different indexing strategies needed

## Alternative Approach: Keep MongoDB for Now

Given the complexity, you might want to:
1. Fix Vercel deployment first (current issue)
2. Deploy backend separately (Render, Railway, etc.)
3. Keep MongoDB for now using MongoDB Atlas (free tier available)
4. Plan Supabase migration as a separate project

## Quick Fix for Current Deployment:

For now, focus on getting the frontend deployed to Vercel and backend to Render/Railway with MongoDB Atlas.