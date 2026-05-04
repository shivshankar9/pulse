import React, { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Play, Pause, Settings, BarChart3 } from 'lucide-react';

const AutomationSettings = () => {
  const [automationConfig, setAutomationConfig] = useState({
    openclaw: {
      enabled: false,
      scraping_interval: 24, // hours
      target_industries: ['technology', 'finance', 'retail'],
      target_locations: ['New York', 'San Francisco', 'Los Angeles'],
      max_leads_per_run: 50
    },
    n8n: {
      enabled: false,
      webhook_url: 'http://localhost:5678/webhook/crm-integration',
      auto_response: false,
      lead_enrichment: true,
      ticket_routing: true
    }
  });

  const [stats, setStats] = useState({
    leads_scraped_today: 0,
    workflows_executed_today: 0,
    tickets_auto_processed_today: 0,
    automation_uptime: '99.9%',
    last_scraping_run: null,
    active_workflows: 0
  });

  const [copied, setCopied] = useState('');

  useEffect(() => {
    fetchAutomationStats();
    const interval = setInterval(fetchAutomationStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAutomationStats = async () => {
    try {
      const response = await fetch('/api/automation/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching automation stats:', error);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  const webhookUrls = {
    openclaw_leads: `${window.location.origin}/api/webhooks/openclaw/leads`,
    openclaw_competitor: `${window.location.origin}/api/webhooks/openclaw/competitor-data`,
    n8n_ticket_update: `${window.location.origin}/api/webhooks/n8n/ticket-update`,
    n8n_lead_enrichment: `${window.location.origin}/api/webhooks/n8n/lead-enrichment`
  };

  return (
    <div className="space-y-8">
      {/* Automation Statistics */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6 flex items-center">
          <BarChart3 className="mr-2 text-purple-600" size={24} />
          Automation Dashboard
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <h4 className="text-sm font-medium opacity-90 mb-1">Leads Scraped Today</h4>
            <p className="text-2xl font-bold">{stats.leads_scraped_today}</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
            <h4 className="text-sm font-medium opacity-90 mb-1">Workflows Executed</h4>
            <p className="text-2xl font-bold">{stats.workflows_executed_today}</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
            <h4 className="text-sm font-medium opacity-90 mb-1">Auto-Processed Tickets</h4>
            <p className="text-2xl font-bold">{stats.tickets_auto_processed_today}</p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
            <h4 className="text-sm font-medium opacity-90 mb-1">Automation Uptime</h4>
            <p className="text-2xl font-bold">{stats.automation_uptime}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Last Scraping Run:</span>{' '}
            {stats.last_scraping_run 
              ? new Date(stats.last_scraping_run).toLocaleString()
              : 'Never'
            }
          </div>
          <div>
            <span className="font-medium">Active Workflows:</span> {stats.active_workflows}
          </div>
        </div>
      </div>

      {/* OpenClaw Configuration */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6 flex items-center">
          <Settings className="mr-2 text-blue-600" size={24} />
          OpenClaw Web Scraping
        </h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-semibold text-gray-900">Automated Lead Scraping</h4>
              <p className="text-sm text-gray-600">Automatically scrape business directories for new leads</p>
            </div>
            <button
              onClick={() => setAutomationConfig(prev => ({
                ...prev,
                openclaw: { ...prev.openclaw, enabled: !prev.openclaw.enabled }
              }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                automationConfig.openclaw.enabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  automationConfig.openclaw.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {automationConfig.openclaw.enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scraping Interval (hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={automationConfig.openclaw.scraping_interval}
                    onChange={(e) => setAutomationConfig(prev => ({
                      ...prev,
                      openclaw: { ...prev.openclaw, scraping_interval: parseInt(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Leads Per Run
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={automationConfig.openclaw.max_leads_per_run}
                    onChange={(e) => setAutomationConfig(prev => ({
                      ...prev,
                      openclaw: { ...prev.openclaw, max_leads_per_run: parseInt(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Industries
                </label>
                <div className="flex flex-wrap gap-2">
                  {automationConfig.openclaw.target_industries.map((industry, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {industry}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* n8n Configuration */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-6 flex items-center">
          <Play className="mr-2 text-green-600" size={24} />
          n8n Workflow Automation
        </h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-semibold text-gray-900">Workflow Integration</h4>
              <p className="text-sm text-gray-600">Enable n8n workflow automation for your CRM</p>
            </div>
            <button
              onClick={() => setAutomationConfig(prev => ({
                ...prev,
                n8n: { ...prev.n8n, enabled: !prev.n8n.enabled }
              }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                automationConfig.n8n.enabled ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  automationConfig.n8n.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {automationConfig.n8n.enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-green-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={automationConfig.n8n.auto_response}
                    onChange={(e) => setAutomationConfig(prev => ({
                      ...prev,
                      n8n: { ...prev.n8n, auto_response: e.target.checked }
                    }))}
                    className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable automatic ticket responses</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={automationConfig.n8n.lead_enrichment}
                    onChange={(e) => setAutomationConfig(prev => ({
                      ...prev,
                      n8n: { ...prev.n8n, lead_enrichment: e.target.checked }
                    }))}
                    className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable lead enrichment workflows</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={automationConfig.n8n.ticket_routing}
                    onChange={(e) => setAutomationConfig(prev => ({
                      ...prev,
                      n8n: { ...prev.n8n, ticket_routing: e.target.checked }
                    }))}
                    className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable intelligent ticket routing</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Webhook URLs */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
          Webhook URLs
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenClaw Leads Webhook
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={webhookUrls.openclaw_leads}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
              />
              <button
                onClick={() => copyToClipboard(webhookUrls.openclaw_leads, 'openclaw_leads')}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copied === 'openclaw_leads' ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenClaw Competitor Data Webhook
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={webhookUrls.openclaw_competitor}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
              />
              <button
                onClick={() => copyToClipboard(webhookUrls.openclaw_competitor, 'openclaw_competitor')}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copied === 'openclaw_competitor' ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              n8n Ticket Update Webhook
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={webhookUrls.n8n_ticket_update}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
              />
              <button
                onClick={() => copyToClipboard(webhookUrls.n8n_ticket_update, 'n8n_ticket_update')}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {copied === 'n8n_ticket_update' ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              n8n Lead Enrichment Webhook
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={webhookUrls.n8n_lead_enrichment}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
              />
              <button
                onClick={() => copyToClipboard(webhookUrls.n8n_lead_enrichment, 'n8n_lead_enrichment')}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {copied === 'n8n_lead_enrichment' ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Setup Instructions</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Copy the webhook URLs above</li>
            <li>Configure them in your OpenClaw scripts and n8n workflows</li>
            <li>Test the integration by triggering a workflow</li>
            <li>Monitor the automation dashboard for results</li>
          </ol>
          <a
            href="/N8N_OPENCLAW_INTEGRATION_GUIDE.md"
            target="_blank"
            className="inline-flex items-center mt-3 text-blue-600 hover:text-blue-800 font-medium"
          >
            <ExternalLink size={16} className="mr-1" />
            View Complete Setup Guide
          </a>
        </div>
      </div>
    </div>
  );
};

export default AutomationSettings;