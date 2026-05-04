#!/usr/bin/env python3
"""
Comprehensive Resend Domain Diagnostic Tool
Checks for all common issues that prevent domain verification
"""

import dns.resolver
import requests
import time
from datetime import datetime

def check_nameservers(domain):
    """Check which nameservers control the domain"""
    print(f"🔍 Checking Nameservers for {domain}")
    print("-" * 40)
    
    try:
        answers = dns.resolver.resolve(domain, 'NS')
        nameservers = []
        for answer in answers:
            ns = str(answer).rstrip('.')
            nameservers.append(ns)
            print(f"  📡 {ns}")
        
        # Check if using GoDaddy nameservers
        godaddy_ns = any('domaincontrol.com' in ns for ns in nameservers)
        if godaddy_ns:
            print(f"  ✅ Using GoDaddy nameservers - records should be added in GoDaddy")
        else:
            print(f"  ⚠️  Not using GoDaddy nameservers - check where DNS is actually managed")
        
        return nameservers
        
    except Exception as e:
        print(f"  ❌ Error checking nameservers: {e}")
        return []

def check_dns_propagation(domain):
    """Check DNS propagation across multiple servers"""
    print(f"\n🌐 Checking DNS Propagation")
    print("-" * 40)
    
    # Test different DNS servers
    dns_servers = [
        ('Google', '8.8.8.8'),
        ('Cloudflare', '1.1.1.1'),
        ('OpenDNS', '208.67.222.222'),
        ('Quad9', '9.9.9.9')
    ]
    
    propagation_results = {}
    
    for server_name, server_ip in dns_servers:
        try:
            resolver = dns.resolver.Resolver()
            resolver.nameservers = [server_ip]
            
            # Check _resend record
            try:
                answers = resolver.resolve(f"_resend.{domain}", 'TXT')
                resend_found = any('resend-verify=' in str(answer) for answer in answers)
                propagation_results[server_name] = resend_found
                status = "✅" if resend_found else "❌"
                print(f"  {status} {server_name} ({server_ip}): {'Found' if resend_found else 'Not found'}")
            except:
                propagation_results[server_name] = False
                print(f"  ❌ {server_name} ({server_ip}): Not found")
                
        except Exception as e:
            print(f"  ❌ {server_name}: Error - {e}")
            propagation_results[server_name] = False
    
    # Check propagation percentage
    successful = sum(propagation_results.values())
    total = len(propagation_results)
    percentage = (successful / total) * 100 if total > 0 else 0
    
    print(f"\n  📊 Propagation: {successful}/{total} servers ({percentage:.0f}%)")
    
    if percentage < 100:
        print(f"  ⚠️  DNS not fully propagated - wait 15-30 minutes and try again")
    
    return propagation_results

def check_record_formatting(domain):
    """Check for common DNS record formatting issues"""
    print(f"\n🔧 Checking Record Formatting Issues")
    print("-" * 40)
    
    issues = []
    
    # Check for double domain appending in DKIM
    try:
        dkim_domain = f"resend._domainkey.{domain}"
        answers = dns.resolver.resolve(dkim_domain, 'TXT')
        
        # Check if there's a double domain issue
        double_domain = f"resend._domainkey.{domain}.{domain}"
        try:
            dns.resolver.resolve(double_domain, 'TXT')
            issues.append("❌ DKIM record has double domain appending - DNS provider auto-appended domain")
            print(f"  ❌ Found DKIM at: {double_domain} (should be {dkim_domain})")
        except:
            print(f"  ✅ DKIM record location correct: {dkim_domain}")
            
    except Exception as e:
        issues.append(f"❌ Cannot resolve DKIM record: {e}")
    
    # Check MX record for trailing dot issues
    try:
        answers = dns.resolver.resolve(domain, 'MX')
        for answer in answers:
            mx_record = str(answer)
            if 'inbound.resend.com' in mx_record:
                if mx_record.endswith(f'.{domain}'):
                    issues.append("❌ MX record has domain auto-appended - add trailing dot")
                    print(f"  ❌ MX record: {mx_record} (domain auto-appended)")
                else:
                    print(f"  ✅ MX record format correct: {mx_record}")
    except Exception as e:
        issues.append(f"❌ Cannot resolve MX record: {e}")
    
    return issues

def check_exact_record_values(domain):
    """Check if record values match exactly what Resend expects"""
    print(f"\n📋 Checking Exact Record Values")
    print("-" * 40)
    
    issues = []
    
    # Expected values for billbytekot.in
    expected_records = {
        '_resend': 'resend-verify=e41414b2-5346-4f',
        'spf': 'v=spf1 include:_spf.resend.com ~all',
        'dkim': 'p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwVECt5ddQRksgdoDfEWTLLCtI0fy69Nri974x5yPPkLmTJjTOXOGQq1+veHvohLrfqxG7mnAgi7FLo9IffYWbCFl8mEc5R6N7uqhica+IEkcAa03nNYgV5DioQfD9sMOHxPdRZrhTjBcwE3jWHL8OmOTyFNs1zmXShA7CjiKn3wIDAQAB',
        'mx': '10 inbound.resend.com.'
    }
    
    # Check _resend verification token
    try:
        answers = dns.resolver.resolve(f"_resend.{domain}", 'TXT')
        found_resend = False
        for answer in answers:
            record = str(answer).strip('"')
            if record == expected_records['_resend']:
                print(f"  ✅ _resend record: EXACT MATCH")
                found_resend = True
            elif 'resend-verify=' in record:
                print(f"  ⚠️  _resend record: {record}")
                print(f"      Expected: {expected_records['_resend']}")
                issues.append("⚠️ _resend record value doesn't match exactly")
        
        if not found_resend:
            issues.append("❌ _resend verification token not found")
            
    except Exception as e:
        issues.append(f"❌ Cannot check _resend record: {e}")
    
    # Check SPF record
    try:
        answers = dns.resolver.resolve(domain, 'TXT')
        found_spf = False
        for answer in answers:
            record = str(answer).strip('"')
            if record == expected_records['spf']:
                print(f"  ✅ SPF record: EXACT MATCH")
                found_spf = True
            elif record.startswith('v=spf1') and 'resend.com' in record:
                print(f"  ⚠️  SPF record: {record}")
                print(f"      Expected: {expected_records['spf']}")
                issues.append("⚠️ SPF record value doesn't match exactly")
        
        if not found_spf:
            issues.append("❌ SPF record not found or incorrect")
            
    except Exception as e:
        issues.append(f"❌ Cannot check SPF record: {e}")
    
    # Check DKIM record
    try:
        answers = dns.resolver.resolve(f"resend._domainkey.{domain}", 'TXT')
        found_dkim = False
        for answer in answers:
            record = str(answer).strip('"')
            if record == expected_records['dkim']:
                print(f"  ✅ DKIM record: EXACT MATCH")
                found_dkim = True
            elif record.startswith('p='):
                print(f"  ⚠️  DKIM record: {record[:50]}...")
                print(f"      Expected: {expected_records['dkim'][:50]}...")
                if len(record) != len(expected_records['dkim']):
                    issues.append("⚠️ DKIM record length doesn't match - may be truncated")
                else:
                    issues.append("⚠️ DKIM record value doesn't match exactly")
        
        if not found_dkim:
            issues.append("❌ DKIM record not found or incorrect")
            
    except Exception as e:
        issues.append(f"❌ Cannot check DKIM record: {e}")
    
    # Check MX record
    try:
        answers = dns.resolver.resolve(domain, 'MX')
        found_mx = False
        for answer in answers:
            record = str(answer)
            if record == expected_records['mx']:
                print(f"  ✅ MX record: EXACT MATCH")
                found_mx = True
            elif 'inbound.resend.com' in record:
                print(f"  ⚠️  MX record: {record}")
                print(f"      Expected: {expected_records['mx']}")
                issues.append("⚠️ MX record format doesn't match exactly")
        
        if not found_mx:
            issues.append("❌ MX record not found or incorrect")
            
    except Exception as e:
        issues.append(f"❌ Cannot check MX record: {e}")
    
    return issues

def check_multiple_records(domain):
    """Check for multiple conflicting records"""
    print(f"\n🔄 Checking for Multiple/Conflicting Records")
    print("-" * 40)
    
    issues = []
    
    # Check for multiple DMARC records
    try:
        answers = dns.resolver.resolve(f"_dmarc.{domain}", 'TXT')
        dmarc_records = [str(answer).strip('"') for answer in answers]
        
        if len(dmarc_records) > 1:
            print(f"  ⚠️  Found {len(dmarc_records)} DMARC records:")
            for i, record in enumerate(dmarc_records, 1):
                print(f"      {i}. {record}")
            issues.append(f"⚠️ Multiple DMARC records found ({len(dmarc_records)}) - should have only one")
        else:
            print(f"  ✅ Single DMARC record found")
            
    except Exception as e:
        print(f"  ❌ Cannot check DMARC records: {e}")
    
    # Check for multiple MX records with different regions
    try:
        answers = dns.resolver.resolve(domain, 'MX')
        mx_records = [str(answer) for answer in answers]
        
        regions = set()
        for record in mx_records:
            if 'amazonses.com' in record:
                # Extract region from amazonses record
                parts = record.split('.')
                for part in parts:
                    if part in ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1']:
                        regions.add(part)
        
        if len(regions) > 1:
            issues.append(f"⚠️ Multiple AWS regions detected in MX records: {regions}")
            print(f"  ⚠️  Multiple regions: {regions}")
        elif regions:
            print(f"  ✅ Single region detected: {list(regions)[0]}")
        else:
            print(f"  ✅ Using Resend MX (no region conflicts)")
            
    except Exception as e:
        print(f"  ❌ Cannot check MX regions: {e}")
    
    return issues

def main():
    """Main diagnostic function"""
    
    domain = "billbytekot.in"
    
    print("🔍 RESEND DOMAIN DIAGNOSTIC TOOL")
    print("=" * 60)
    print(f"Domain: {domain}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    all_issues = []
    
    # Run all diagnostic checks
    nameservers = check_nameservers(domain)
    propagation = check_dns_propagation(domain)
    formatting_issues = check_record_formatting(domain)
    value_issues = check_exact_record_values(domain)
    multiple_issues = check_multiple_records(domain)
    
    # Combine all issues
    all_issues.extend(formatting_issues)
    all_issues.extend(value_issues)
    all_issues.extend(multiple_issues)
    
    # Print final summary
    print(f"\n📊 DIAGNOSTIC SUMMARY")
    print("=" * 50)
    
    if not all_issues:
        print("🎉 NO ISSUES FOUND!")
        print("Your DNS configuration appears correct.")
        print("\nIf verification is still pending:")
        print("1. Wait 15-30 minutes for DNS propagation")
        print("2. Click 'Restart Verification' in Resend dashboard")
        print("3. Contact Resend support if still failing after 24 hours")
    else:
        print(f"❌ {len(all_issues)} ISSUES FOUND:")
        for issue in all_issues:
            print(f"  {issue}")
    
    # Check propagation status
    successful_propagation = sum(propagation.values())
    total_servers = len(propagation)
    
    if successful_propagation < total_servers:
        print(f"\n⏰ DNS PROPAGATION: {successful_propagation}/{total_servers} servers")
        print("Wait 15-30 minutes and run this diagnostic again")
    
    print(f"\n🔧 RECOMMENDED ACTIONS:")
    print("=" * 30)
    
    if formatting_issues:
        print("1. Fix DNS record formatting issues in GoDaddy")
    if value_issues:
        print("2. Verify exact record values match Resend requirements")
    if multiple_issues:
        print("3. Remove duplicate/conflicting records")
    
    print("4. Wait 15-30 minutes for DNS propagation")
    print("5. Click 'Restart Verification' in Resend dashboard")
    print("6. Run this diagnostic again to verify fixes")

if __name__ == "__main__":
    main()