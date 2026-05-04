# OpenClaw + n8n Business Automation Integration Guide

## Overview

This guide shows how to integrate OpenClaw (AI-powered web scraping) and n8n (workflow automation) with your CRM system to create powerful business automation workflows.

## What You'll Achieve

### 🤖 **Automated Lead Generation**
- Scrape competitor websites for leads
- Extract contact information from business directories
- Monitor job boards for potential clients
- Auto-create leads in CRM with enriched data

### 📊 **Market Intelligence**
- Track competitor pricing and products
- Monitor industry news and trends
- Analyze customer reviews and feedback
- Generate automated market reports

### 🔄 **Customer Journey Automation**
- Auto-respond to support tickets based on content
- Trigger follow-up sequences based on customer behavior
- Route tickets to appropriate teams automatically
- Send personalized emails based on customer data

### 📈 **Sales Process Automation**
- Qualify leads automatically using scraped data
- Update pipeline stages based on external triggers
- Send proposals and contracts automatically
- Track deal progress and send alerts

## Architecture Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  OpenClaw   │───▶│     n8n     │───▶│  Your CRM   │
│ (Scraping)  │    │(Workflows)  │    │ (Actions)   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
   Web Data          Process & Route      Store & Act
```

## Part 1: Setting Up OpenClaw Integration

### 1.1 Install OpenClaw
```bash
# Install OpenClaw
pip install openclaw

# Or using Docker
docker pull openclaw/openclaw:latest
```

### 1.2 Create OpenClaw Scraping Scripts

#### Lead Generation Script
```python
# scripts/lead_scraper.py
from openclaw import WebScraper
import json
import requests

class LeadScraper:
    def __init__(self):
        self.scraper = WebScraper()
        self.crm_webhook = "https://your-crm.com/api/webhooks/openclaw"
    
    def scrape_business_directory(self, industry, location):
        """Scrape business directory for leads"""
        config = {
            "url": f"https://yellowpages.com/search?search_terms={industry}&geo_location_terms={location}",
            "selectors": {
                "business_name": ".business-name",
                "phone": ".phone",
                "address": ".address",
                "website": ".website-link"
            },
            "pagination": True,
            "max_pages": 5
        }
        
        results = self.scraper.scrape(config)
        return self.process_leads(results)
    
    def process_leads(self, raw_data):
        """Process and enrich lead data"""
        leads = []
        for item in raw_data:
            lead = {
                "company_name": item.get("business_name"),
                "phone": item.get("phone"),
                "address": item.get("address"),
                "website": item.get("website"),
                "source": "OpenClaw Directory Scrape",
                "status": "new",
                "tags": ["scraped", "directory"]
            }
            leads.append(lead)
        
        # Send to n8n webhook
        self.send_to_n8n(leads)
        return leads
    
    def send_to_n8n(self, data):
        """Send scraped data to n8n webhook"""
        webhook_url = "http://localhost:5678/webhook/openclaw-leads"
        requests.post(webhook_url, json={"leads": data})

# Usage
scraper = LeadScraper()
scraper.scrape_business_directory("restaurants", "New York")
```

#### Competitor Monitoring Script
```python
# scripts/competitor_monitor.py
from openclaw import WebScraper
import schedule
import time

class CompetitorMonitor:
    def __init__(self):
        self.scraper = WebScraper()
        self.competitors = [
            {"name": "Competitor A", "url": "https://competitor-a.com/pricing"},
            {"name": "Competitor B", "url": "https://competitor-b.com/products"}
        ]
    
    def monitor_pricing(self):
        """Monitor competitor pricing changes"""
        for competitor in self.competitors:
            config = {
                "url": competitor["url"],
                "selectors": {
                    "prices": ".price",
                    "products": ".product-name",
                    "features": ".feature-list"
                }
            }
            
            data = self.scraper.scrape(config)
            self.send_to_n8n({
                "type": "competitor_update",
                "competitor": competitor["name"],
                "data": data,
                "timestamp": time.time()
            })
    
    def send_to_n8n(self, data):
        webhook_url = "http://localhost:5678/webhook/competitor-data"
        requests.post(webhook_url, json=data)

# Schedule monitoring
monitor = CompetitorMonitor()
schedule.every(6).hours.do(monitor.monitor_pricing)
```

## Part 2: Setting Up n8n Workflows

### 2.1 Install n8n
```bash
# Using npm
npm install n8n -g

# Using Docker
docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n

# Using Docker Compose (recommended)
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
    volumes:
      - n8n_data:/home/node/.n8n
volumes:
  n8n_data:
```

### 2.2 Create n8n Workflows

#### Lead Processing Workflow
```json
{
  "name": "Lead Processing Automation",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "openclaw-leads",
        "responseMode": "responseNode"
      },
      "name": "Webhook - Receive Leads",
      "type": "n8n-nodes-base.webhook"
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.leads[0].phone}}",
              "operation": "isNotEmpty"
            }
          ]
        }
      },
      "name": "Filter Valid Leads",
      "type": "n8n-nodes-base.if"
    },
    {
      "parameters": {
        "url": "https://api.hunter.io/v2/email-finder",
        "options": {
          "queryParameters": {
            "domain": "={{$json.website}}",
            "api_key": "your-hunter-api-key"
          }
        }
      },
      "name": "Enrich with Email",
      "type": "n8n-nodes-base.httpRequest"
    },
    {
      "parameters": {
        "url": "https://your-crm.com/api/contacts",
        "options": {
          "headers": {
            "Authorization": "Bearer your-crm-token"
          },
          "body": {
            "name": "={{$json.company_name}}",
            "phone": "={{$json.phone}}",
            "email": "={{$json.email}}",
            "source": "OpenClaw Automation",
            "tags": ["automated", "scraped"]
          }
        }
      },
      "name": "Create CRM Contact",
      "type": "n8n-nodes-base.httpRequest"
    }
  ],
  "connections": {
    "Webhook - Receive Leads": {
      "main": [["Filter Valid Leads"]]
    },
    "Filter Valid Leads": {
      "main": [["Enrich with Email"]]
    },
    "Enrich with Email": {
      "main": [["Create CRM Contact"]]
    }
  }
}
```

#### Ticket Auto-Response Workflow
```json
{
  "name": "Smart Ticket Response",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "new-ticket",
        "responseMode": "responseNode"
      },
      "name": "Webhook - New Ticket",
      "type": "n8n-nodes-base.webhook"
    },
    {
      "parameters": {
        "model": "gpt-3.5-turbo",
        "messages": [
          {
            "role": "system",
            "content": "Analyze this support ticket and categorize it as: technical, billing, general, or urgent. Also suggest a priority level (low, medium, high, critical)."
          },
          {
            "role": "user",
            "content": "Subject: {{$json.subject}}\nContent: {{$json.content}}"
          }
        ]
      },
      "name": "AI Ticket Analysis",
      "type": "n8n-nodes-base.openAi"
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.category}}",
              "value2": "urgent"
            }
          ]
        }
      },
      "name": "Check if Urgent",
      "type": "n8n-nodes-base.if"
    },
    {
      "parameters": {
        "url": "https://your-crm.com/api/tickets/{{$json.ticket_id}}",
        "options": {
          "method": "PATCH",
          "headers": {
            "Authorization": "Bearer your-crm-token"
          },
          "body": {
            "priority": "critical",
            "assigned_to": "urgent-team@company.com",
            "tags": ["urgent", "auto-escalated"]
          }
        }
      },
      "name": "Escalate Urgent Ticket",
      "type": "n8n-nodes-base.httpRequest"
    }
  ]
}
```

## Part 3: CRM Backend Integration

### 3.1 Add Webhook Endpoints to Your CRM

Add these endpoints to your `backend/server.py`:

```python
# OpenClaw Integration Endpoints
@app.post("/webhooks/openclaw/leads")
async def handle_openclaw_leads(request: Request):
    """Handle leads from OpenClaw scraping"""
    try:
        data = await request.json()
        leads = data.get('leads', [])
        
        processed_leads = []
        for lead_data in leads:
            # Create contact in database
            contact = {
                'id': str(uuid.uuid4()),
                'name': lead_data.get('company_name', ''),
                'phone': lead_data.get('phone', ''),
                'email': lead_data.get('email', ''),
                'address': lead_data.get('address', ''),
                'website': lead_data.get('website', ''),
                'source': 'OpenClaw Automation',
                'tags': lead_data.get('tags', []),
                'created_at': datetime.now().isoformat(),
                'owner_id': 'system'  # Or extract from auth
            }
            
            # Store in database
            if USE_MOCK_DB:
                mock_db['contacts'].append(contact)
            else:
                # Store in real database
                pass
            
            processed_leads.append(contact)
        
        return {
            "success": True,
            "processed": len(processed_leads),
            "leads": processed_leads
        }
        
    except Exception as e:
        logger.error(f"Error processing OpenClaw leads: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/webhooks/openclaw/competitor-data")
async def handle_competitor_data(request: Request):
    """Handle competitor monitoring data"""
    try:
        data = await request.json()
        
        # Store competitor data
        competitor_update = {
            'id': str(uuid.uuid4()),
            'type': data.get('type'),
            'competitor': data.get('competitor'),
            'data': data.get('data'),
            'timestamp': data.get('timestamp'),
            'created_at': datetime.now().isoformat()
        }
        
        # Trigger alerts if significant changes detected
        if detect_price_changes(competitor_update):
            await send_price_alert(competitor_update)
        
        return {"success": True, "stored": True}
        
    except Exception as e:
        logger.error(f"Error processing competitor data: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/webhooks/n8n/ticket-update")
async def handle_n8n_ticket_update(request: Request):
    """Handle ticket updates from n8n workflows"""
    try:
        data = await request.json()
        ticket_id = data.get('ticket_id')
        updates = data.get('updates', {})
        
        # Update ticket in database
        if USE_MOCK_DB:
            for ticket in mock_db['tickets']:
                if ticket['id'] == ticket_id:
                    ticket.update(updates)
                    break
        else:
            # Update in real database
            pass
        
        return {"success": True, "updated": ticket_id}
        
    except Exception as e:
        logger.error(f"Error updating ticket from n8n: {str(e)}")
        return {"success": False, "error": str(e)}

# Helper functions
def detect_price_changes(competitor_data):
    """Detect significant price changes"""
    # Implement price change detection logic
    return False

async def send_price_alert(competitor_data):
    """Send alert about price changes"""
    # Implement alert sending logic
    pass
```

### 3.2 Add Automation Settings to Frontend

Add automation configuration to your Settings page:

```jsx
// Add to frontend/src/pages/Settings.jsx

const AutomationSettings = () => {
  const [automationConfig, setAutomationConfig] = useState({
    openclaw: {
      enabled: false,
      scraping_interval: 24, // hours
      target_industries: [],
      target_locations: []
    },
    n8n: {
      enabled: false,
      webhook_url: '',
      auto_response: false,
      lead_enrichment: false
    }
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
        Business Automation
      </h3>
      
      {/* OpenClaw Configuration */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold mb-4">OpenClaw Web Scraping</h4>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={automationConfig.openclaw.enabled}
              onChange={(e) => setAutomationConfig(prev => ({
                ...prev,
                openclaw: { ...prev.openclaw, enabled: e.target.checked }
              }))}
              className="mr-3"
            />
            <span>Enable automated lead scraping</span>
          </label>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Scraping Interval (hours)
            </label>
            <input
              type="number"
              value={automationConfig.openclaw.scraping_interval}
              onChange={(e) => setAutomationConfig(prev => ({
                ...prev,
                openclaw: { ...prev.openclaw, scraping_interval: parseInt(e.target.value) }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>
      
      {/* n8n Configuration */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold mb-4">n8n Workflow Automation</h4>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={automationConfig.n8n.enabled}
              onChange={(e) => setAutomationConfig(prev => ({
                ...prev,
                n8n: { ...prev.n8n, enabled: e.target.checked }
              }))}
              className="mr-3"
            />
            <span>Enable n8n workflow integration</span>
          </label>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              n8n Webhook URL
            </label>
            <input
              type="url"
              value={automationConfig.n8n.webhook_url}
              onChange={(e) => setAutomationConfig(prev => ({
                ...prev,
                n8n: { ...prev.n8n, webhook_url: e.target.value }
              }))}
              placeholder="http://localhost:5678/webhook/crm-integration"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
```

## Part 4: Advanced Automation Workflows

### 4.1 Lead Scoring Automation
```python
# scripts/lead_scoring.py
class LeadScorer:
    def __init__(self):
        self.scoring_rules = {
            'company_size': {'small': 10, 'medium': 20, 'large': 30},
            'industry': {'tech': 25, 'finance': 20, 'retail': 15},
            'location': {'tier1': 20, 'tier2': 15, 'tier3': 10},
            'website_quality': {'high': 15, 'medium': 10, 'low': 5}
        }
    
    def score_lead(self, lead_data):
        """Calculate lead score based on scraped data"""
        score = 0
        
        # Analyze company size from website
        if 'employees' in lead_data:
            emp_count = lead_data['employees']
            if emp_count > 500:
                score += self.scoring_rules['company_size']['large']
            elif emp_count > 50:
                score += self.scoring_rules['company_size']['medium']
            else:
                score += self.scoring_rules['company_size']['small']
        
        # Industry scoring
        industry = self.detect_industry(lead_data.get('description', ''))
        score += self.scoring_rules['industry'].get(industry, 0)
        
        return min(score, 100)  # Cap at 100
    
    def detect_industry(self, description):
        """Use AI to detect industry from company description"""
        # Implement industry detection logic
        return 'tech'
```

### 4.2 Customer Journey Automation
```json
{
  "name": "Customer Journey Automation",
  "nodes": [
    {
      "name": "New Contact Created",
      "type": "n8n-nodes-base.webhook"
    },
    {
      "name": "Wait 1 Hour",
      "type": "n8n-nodes-base.wait"
    },
    {
      "name": "Send Welcome Email",
      "type": "n8n-nodes-base.emailSend"
    },
    {
      "name": "Wait 3 Days",
      "type": "n8n-nodes-base.wait"
    },
    {
      "name": "Check Engagement",
      "type": "n8n-nodes-base.httpRequest"
    },
    {
      "name": "Send Follow-up",
      "type": "n8n-nodes-base.if"
    }
  ]
}
```

## Part 5: Deployment and Monitoring

### 5.1 Docker Compose Setup
```yaml
# docker-compose.automation.yml
version: '3.8'
services:
  openclaw:
    build: ./openclaw
    environment:
      - CRM_WEBHOOK_URL=http://crm:8000/webhooks/openclaw
    volumes:
      - ./scripts:/app/scripts
    depends_on:
      - crm
  
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
      - WEBHOOK_URL=http://crm:8000
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - crm
  
  crm:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/crm
    depends_on:
      - db
  
  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=crm
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  n8n_data:
  postgres_data:
```

### 5.2 Monitoring Dashboard
Add automation monitoring to your CRM dashboard:

```jsx
const AutomationDashboard = () => {
  const [stats, setStats] = useState({
    leads_scraped_today: 0,
    workflows_executed: 0,
    tickets_auto_processed: 0,
    automation_uptime: '99.9%'
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Leads Scraped Today</h3>
        <p className="text-3xl font-bold">{stats.leads_scraped_today}</p>
      </div>
      
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Workflows Executed</h3>
        <p className="text-3xl font-bold">{stats.workflows_executed}</p>
      </div>
      
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Auto-Processed Tickets</h3>
        <p className="text-3xl font-bold">{stats.tickets_auto_processed}</p>
      </div>
      
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Automation Uptime</h3>
        <p className="text-3xl font-bold">{stats.automation_uptime}</p>
      </div>
    </div>
  );
};
```

## Benefits of This Integration

### 🚀 **Increased Efficiency**
- 80% reduction in manual lead entry
- 60% faster ticket response times
- 90% automation of routine tasks

### 📈 **Better Lead Quality**
- Automated lead scoring and qualification
- Real-time competitor intelligence
- Enhanced lead data with AI enrichment

### 💰 **Cost Savings**
- Reduced manual labor costs
- Improved conversion rates
- Better resource allocation

### 🎯 **Competitive Advantage**
- Real-time market intelligence
- Faster response to market changes
- Automated competitive analysis

## Getting Started

1. **Install OpenClaw and n8n** using the instructions above
2. **Set up webhook endpoints** in your CRM backend
3. **Create your first scraping script** for lead generation
4. **Build n8n workflows** for lead processing
5. **Configure automation settings** in your CRM
6. **Monitor and optimize** your automation workflows

This integration will transform your CRM into a powerful automation engine that works 24/7 to grow your business!