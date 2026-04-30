import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CheckCircle2, XCircle, AlertCircle, Copy, Trash2, RefreshCw, Plus, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function DomainSettings() {
  const [domains, setDomains] = useState([]);
  const [frontendDomains, setFrontendDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [newFrontendDomain, setNewFrontendDomain] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [provider, setProvider] = useState('resend');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadDomains();
    loadFrontendDomains();
  }, []);

  const loadDomains = async () => {
    try {
      const res = await api.get('/domains');
      setDomains(res.data);
    } catch (error) {
      toast.error('Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  const loadFrontendDomains = async () => {
    try {
      const res = await api.get('/frontend-domains');
      setFrontendDomains(res.data);
    } catch (error) {
      toast.error('Failed to load frontend domains');
    }
  };

  const addFrontendDomain = async () => {
    if (!newFrontendDomain) {
      toast.error('Please enter a domain name');
      return;
    }

    try {
      const res = await api.post('/frontend-domains', {
        domain: newFrontendDomain,
        business_name: businessName,
      });
      toast.success('Frontend domain added! Follow verification instructions.');
      setFrontendDomains([res.data, ...frontendDomains]);
      setNewFrontendDomain('');
      setBusinessName('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add frontend domain');
    }
  };

  const verifyFrontendDomain = async (domainId) => {
    setVerifying(true);
    try {
      const res = await api.post(`/frontend-domains/${domainId}/verify`);
      toast.success(res.data.verified ? 'Domain verified!' : res.data.message);
      loadFrontendDomains();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const deleteFrontendDomain = async (domainId) => {
    if (!confirm('Are you sure you want to remove this frontend domain?')) return;

    try {
      await api.delete(`/frontend-domains/${domainId}`);
      toast.success('Frontend domain removed');
      setFrontendDomains(frontendDomains.filter(d => d.id !== domainId));
    } catch (error) {
      toast.error('Failed to remove frontend domain');
    }
  };

  const addDomain = async () => {
    if (!newDomain) {
      toast.error('Please enter a domain name');
      return;
    }

    try {
      const res = await api.post('/domains', {
        domain: newDomain,
        provider: provider,
      });
      toast.success('Domain added! Configure DNS records to verify.');
      setDomains([res.data, ...domains]);
      setNewDomain('');
      setSelectedDomain(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add domain');
    }
  };

  const verifyDomain = async (domain) => {
    setVerifying(true);
    try {
      const res = await api.post('/domains/verify', { domain });
      toast.success(res.data.verified ? 'Domain verified!' : 'Verification pending. Check DNS records.');
      loadDomains();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const deleteDomain = async (domainId) => {
    if (!confirm('Are you sure you want to remove this domain?')) return;

    try {
      await api.delete(`/domains/${domainId}`);
      toast.success('Domain removed');
      setDomains(domains.filter(d => d.id !== domainId));
      if (selectedDomain?.id === domainId) {
        setSelectedDomain(null);
      }
    } catch (error) {
      toast.error('Failed to remove domain');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getDNSInstructions = (provider) => {
    const instructions = {
      resend: 'Resend provides excellent email deliverability with automatic DKIM signing.',
      sendgrid: 'SendGrid is a reliable email service with advanced analytics.',
      smtp: 'Use your own SMTP server for complete control over email sending.',
    };
    return instructions[provider] || '';
  };

  if (loading) {
    return <div className="p-8">Loading domains...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Domain Management</h1>
        <p className="text-gray-600">
          Configure email domains for sending and frontend domains for CORS access. Perfect for multi-tenant deployments.
        </p>
      </div>

      <Tabs defaultValue="domains" className="space-y-6">
        <TabsList>
          <TabsTrigger value="domains">Email Domains</TabsTrigger>
          <TabsTrigger value="frontend">Frontend Domains</TabsTrigger>
          <TabsTrigger value="add">Add Domain</TabsTrigger>
          <TabsTrigger value="providers">Email Providers</TabsTrigger>
        </TabsList>

        <TabsContent value="domains" className="space-y-4">
          {domains.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No domains configured</h3>
                <p className="text-gray-600 mb-4">
                  Add your first custom domain to start sending emails from your own domain.
                </p>
                <Button onClick={() => document.querySelector('[value="add"]').click()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Domain
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {domains.map((domain) => (
                <Card key={domain.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {domain.domain}
                          {domain.verified ? (
                            <Badge variant="success" className="bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="bg-yellow-100 text-yellow-800">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Provider: {domain.provider.toUpperCase()} • Added {new Date(domain.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verifyDomain(domain.domain)}
                          disabled={verifying}
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${verifying ? 'animate-spin' : ''}`} />
                          Verify
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDomain(selectedDomain?.id === domain.id ? null : domain)}
                        >
                          {selectedDomain?.id === domain.id ? 'Hide' : 'Show'} DNS
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteDomain(domain.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {selectedDomain?.id === domain.id && (
                    <CardContent>
                      <Alert className="mb-4">
                        <AlertDescription>
                          Add these DNS records to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-3">
                        {domain.dns_records?.map((record, idx) => (
                          <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline">{record.type}</Badge>
                                  <span className="text-sm font-medium">{record.purpose}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                  <div>
                                    <label className="text-xs text-gray-600">Name/Host</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <code className="text-sm bg-white px-2 py-1 rounded border flex-1">
                                        {record.name}
                                      </code>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(record.name)}
                                      >
                                        <Copy className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600">Value</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <code className="text-sm bg-white px-2 py-1 rounded border flex-1 truncate">
                                        {record.value}
                                      </code>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(record.value)}
                                      >
                                        <Copy className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {domain.verification_results && (
                        <div className="mt-4">
                          <h4 className="font-semibold mb-2">Verification Status</h4>
                          <div className="space-y-2">
                            {domain.verification_results.map((result, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                {result.verified ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-600" />
                                )}
                                <span>{result.record.purpose}: {result.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="frontend" className="space-y-4">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Frontend Domains</h2>
            <p className="text-gray-600">
              Manage frontend domains for CORS access. Each business can register their own domain.
            </p>
          </div>

          {frontendDomains.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Globe className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No frontend domains configured</h3>
                <p className="text-gray-600 mb-4">
                  Add your frontend domain to enable CORS access for your application.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {frontendDomains.map((domain) => (
                <Card key={domain.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {domain.domain}
                          {domain.verified ? (
                            <Badge variant="success" className="bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="bg-yellow-100 text-yellow-800">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {domain.business_name && `Business: ${domain.business_name} • `}
                          Added {new Date(domain.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verifyFrontendDomain(domain.id)}
                          disabled={verifying}
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${verifying ? 'animate-spin' : ''}`} />
                          Verify
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteFrontendDomain(domain.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {!domain.verified && (
                    <CardContent>
                      <Alert className="mb-4">
                        <AlertDescription>
                          <strong>Verification Required:</strong> Create a file at your domain to verify ownership.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">1. Create this file on your domain:</label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1">
                              https://{domain.domain}/.well-known/pulse-crm-verification.txt
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(`https://${domain.domain}/.well-known/pulse-crm-verification.txt`)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium">2. File content (verification token):</label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1">
                              {domain.verification_token}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(domain.verification_token)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="text-sm text-gray-600">
                          <strong>Instructions:</strong>
                          <ol className="list-decimal list-inside mt-1 space-y-1">
                            <li>Create the `.well-known` directory in your domain's public folder</li>
                            <li>Create `pulse-crm-verification.txt` with the token above</li>
                            <li>Make sure the file is accessible via HTTPS</li>
                            <li>Click "Verify" to complete the process</li>
                          </ol>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Add Frontend Domain</CardTitle>
              <CardDescription>
                Register your frontend domain to enable CORS access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Domain Name</label>
                <Input
                  placeholder="yourbusiness.vercel.app"
                  value={newFrontendDomain}
                  onChange={(e) => setNewFrontendDomain(e.target.value)}
                />
                <p className="text-sm text-gray-600 mt-1">
                  Enter your frontend domain (e.g., yourbusiness.vercel.app, app.yourdomain.com)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Business Name (Optional)</label>
                <Input
                  placeholder="Your Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Multi-tenant Support:</strong> Each business can register their own frontend domain. 
                  Once verified, the domain will be automatically allowed for CORS requests.
                </AlertDescription>
              </Alert>

              <Button onClick={addFrontendDomain} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Frontend Domain
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add Email Domain</CardTitle>
              <CardDescription>
                Configure a custom domain to send emails from your business domain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Domain Name</label>
                <Input
                  placeholder="yourbusiness.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
                <p className="text-sm text-gray-600 mt-1">
                  Enter your domain without http:// or www
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Provider</label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resend">Resend (Recommended)</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="smtp">Custom SMTP</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600 mt-1">
                  {getDNSInstructions(provider)}
                </p>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Next steps:</strong> After adding your domain, you'll receive DNS records to add to your domain registrar. 
                  Once configured, click "Verify" to confirm setup.
                </AlertDescription>
              </Alert>

              <Button onClick={addDomain} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Email Domain
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Resend</CardTitle>
                <CardDescription>
                  Modern email API with excellent deliverability and developer experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✓ Easy setup with automatic DKIM signing</li>
                  <li>✓ Real-time email tracking and analytics</li>
                  <li>✓ 100 emails/day free tier</li>
                  <li>✓ Best for startups and small businesses</li>
                </ul>
                <Button variant="outline" className="mt-4" asChild>
                  <a href="https://resend.com" target="_blank" rel="noopener noreferrer">
                    Learn More
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SendGrid</CardTitle>
                <CardDescription>
                  Enterprise-grade email delivery with advanced features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✓ Powerful email marketing features</li>
                  <li>✓ Advanced analytics and A/B testing</li>
                  <li>✓ 100 emails/day free tier</li>
                  <li>✓ Best for growing businesses</li>
                </ul>
                <Button variant="outline" className="mt-4" asChild>
                  <a href="https://sendgrid.com" target="_blank" rel="noopener noreferrer">
                    Learn More
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custom SMTP</CardTitle>
                <CardDescription>
                  Use your own email server or provider
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✓ Complete control over email infrastructure</li>
                  <li>✓ Works with any SMTP provider</li>
                  <li>✓ No third-party dependencies</li>
                  <li>✓ Best for enterprises with existing email infrastructure</li>
                </ul>
                <p className="text-sm text-gray-600 mt-4">
                  Configure SMTP settings in the Integrations page
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
