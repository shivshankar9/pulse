#!/usr/bin/env python3
"""
DNS Record Checker for billbytekot.in
Checks current DNS records to identify domain verification issues
"""

import dns.resolver
import json
from datetime import datetime

def check_dns_records(domain):
    """Check all relevant DNS records for domain verification"""
    
    print(f"🔍 Checking DNS records for: {domain}")
    print("=" * 50)
    
    results = {
        'domain': domain,
        'timestamp': datetime.now().isoformat(),
        'records': {}
    }
    
    # Record types to check
    record_types = ['TXT', 'MX', 'CNAME', 'A']
    
    for record_type in record_types:
        try:
            print(f"\n📋 {record_type} Records:")
            answers = dns.resolver.resolve(domain, record_type)
            records = []
            
            for answer in answers:
                record_value = str(answer).strip('"')
                records.append(record_value)
                print(f"  ✅ {record_value}")
            
            results['records'][record_type] = records
            
        except dns.resolver.NXDOMAIN:
            print(f"  ❌ Domain {domain} does not exist")
            results['records'][record_type] = []
        except dns.resolver.NoAnswer:
            print(f"  ⚠️  No {record_type} records found")
            results['records'][record_type] = []
        except Exception as e:
            print(f"  ❌ Error checking {record_type}: {str(e)}")
            results['records'][record_type] = []
    
    return results

def analyze_resend_verification(txt_records):
    """Analyze TXT records for Resend verification issues"""
    
    print(f"\n🔍 Analyzing Resend Verification:")
    print("=" * 40)
    
    issues = []
    
    # Check for Resend verification token
    resend_verify = None
    for record in txt_records:
        if 'resend-verify=' in record:
            resend_verify = record
            print(f"  ✅ Resend verification token found: {record}")
            break
    
    if not resend_verify:
        issues.append("❌ Missing _resend TXT record with verification token")
    
    # Check for SPF record
    spf_record = None
    for record in txt_records:
        if record.startswith('v=spf1') and 'resend.com' in record:
            spf_record = record
            print(f"  ✅ SPF record found: {record}")
            break
    
    if not spf_record:
        issues.append("❌ Missing or incorrect SPF record for Resend")
    
    # Check for DKIM record (this should be checked separately for resend._domainkey)
    dkim_records = []
    for record in txt_records:
        if record.startswith('p=') and 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ' in record:
            dkim_records.append(record)
            print(f"  ✅ DKIM record found: {record[:50]}...")
    
    if not dkim_records:
        issues.append("⚠️  DKIM record not found in main domain TXT records (should be in resend._domainkey)")
    
    # Check for DMARC record
    dmarc_record = None
    for record in txt_records:
        if record.startswith('v=DMARC1'):
            dmarc_record = record
            print(f"  ✅ DMARC record found: {record}")
            
            # Check for template variables
            if '{payload.domain}' in record:
                issues.append("❌ DMARC record contains template variable {payload.domain} - should be actual domain")
            break
    
    if not dmarc_record:
        issues.append("❌ Missing DMARC record")
    
    return issues

def check_subdomain_records(domain):
    """Check subdomain records that are critical for Resend"""
    
    print(f"\n🔍 Checking Subdomain Records:")
    print("=" * 40)
    
    subdomains_to_check = [
        '_resend',
        'resend._domainkey',
        '_dmarc'
    ]
    
    subdomain_results = {}
    
    for subdomain in subdomains_to_check:
        full_domain = f"{subdomain}.{domain}"
        try:
            print(f"\n📋 TXT Records for {full_domain}:")
            answers = dns.resolver.resolve(full_domain, 'TXT')
            records = []
            
            for answer in answers:
                record_value = str(answer).strip('"')
                records.append(record_value)
                print(f"  ✅ {record_value}")
            
            subdomain_results[subdomain] = records
            
        except dns.resolver.NXDOMAIN:
            print(f"  ❌ Subdomain {full_domain} does not exist")
            subdomain_results[subdomain] = []
        except dns.resolver.NoAnswer:
            print(f"  ⚠️  No TXT records found for {full_domain}")
            subdomain_results[subdomain] = []
        except Exception as e:
            print(f"  ❌ Error checking {full_domain}: {str(e)}")
            subdomain_results[subdomain] = []
    
    return subdomain_results

def main():
    """Main function to check DNS records"""
    
    domain = "billbytekot.in"
    
    print("🌐 DNS Record Verification Tool")
    print("=" * 50)
    
    # Check main domain records
    results = check_dns_records(domain)
    
    # Check subdomain records
    subdomain_results = check_subdomain_records(domain)
    
    # Analyze for Resend verification issues
    txt_records = results['records'].get('TXT', [])
    issues = analyze_resend_verification(txt_records)
    
    # Print summary
    print(f"\n📊 VERIFICATION SUMMARY")
    print("=" * 50)
    
    if issues:
        print("❌ Issues Found:")
        for issue in issues:
            print(f"  {issue}")
    else:
        print("✅ No obvious issues found!")
    
    print(f"\n🔧 RECOMMENDED FIXES:")
    print("=" * 30)
    
    # Check specific issues based on subdomain results
    resend_verify = subdomain_results.get('_resend', [])
    if not resend_verify:
        print("1. ❌ Add _resend TXT record:")
        print("   Name: _resend")
        print("   Value: resend-verify=e41414b2-5346-4f")
    
    dkim_records = subdomain_results.get('resend._domainkey', [])
    if not dkim_records:
        print("2. ❌ Add resend._domainkey TXT record:")
        print("   Name: resend._domainkey")
        print("   Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwVECt5ddQRksgdoDfEWTLLCtI0fy69Nri974x5yPPkLmTJjTOXOGQq1+veHvohLrfqxG7mnAgi7FLo9IffYWbCFl8mEc5R6N7uqhica+IEkcAa03nNYgV5DioQfD9sMOHxPdRZrhTjBcwE3jWHL8OmOTyFNs1zmXShA7CjiKn3wIDAQAB")
    
    dmarc_records = subdomain_results.get('_dmarc', [])
    if dmarc_records:
        for record in dmarc_records:
            if '{payload.domain}' in record:
                print("3. ❌ Fix DMARC record template variable:")
                print("   Current: v=DMARC1; p=none; rua=mailto:dmarc@{payload.domain}")
                print("   Should be: v=DMARC1; p=none; rua=mailto:dmarc@billbytekot.in")
    
    # Check for duplicate/conflicting records
    if len(dkim_records) > 1:
        print("4. ⚠️  Multiple DKIM records found - remove duplicates")
    
    if len(dmarc_records) > 1:
        print("5. ⚠️  Multiple DMARC records found - remove duplicates")
    
    print(f"\n⏰ Next Steps:")
    print("1. Make the DNS changes above in GoDaddy")
    print("2. Wait 15-30 minutes for DNS propagation")
    print("3. Run this script again to verify changes")
    print("4. Try domain verification in Resend dashboard")
    
    # Save results to file
    all_results = {
        'main_domain': results,
        'subdomains': subdomain_results,
        'issues': issues,
        'timestamp': datetime.now().isoformat()
    }
    
    with open('dns_check_results.json', 'w') as f:
        json.dump(all_results, f, indent=2)
    
    print(f"\n💾 Results saved to: dns_check_results.json")

if __name__ == "__main__":
    main()