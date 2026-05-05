#!/usr/bin/env python3
"""
Test Resend Connection and Domain Status
Checks for specific issues that prevent domain verification
"""

import dns.resolver
import requests
import json
import time
from datetime import datetime

def test_resend_api_connection():
    """Test if we can reach Resend API"""
    print("🔗 Testing Resend API Connection")
    print("-" * 40)
    
    try:
        # Test basic connectivity to Resend
        response = requests.get("https://api.resend.com/", timeout=10)
        print(f"  ✅ Resend API reachable (status: {response.status_code})")
        return True
    except requests.exceptions.Timeout:
        print(f"  ❌ Timeout connecting to Resend API")
        return False
    except requests.exceptions.ConnectionError:
        print(f"  ❌ Cannot connect to Resend API")
        return False
    except Exception as e:
        print(f"  ❌ Error connecting to Resend: {e}")
        return False

def check_dns_from_resend_perspective(domain):
    """Check DNS records from different geographic locations"""
    print(f"\n🌍 Checking DNS from Multiple Locations")
    print("-" * 40)
    
    # Test DNS from different geographic locations using public APIs
    locations = [
        ("US East", "8.8.8.8"),
        ("US West", "1.1.1.1"), 
        ("Europe", "208.67.222.222"),
        ("Asia", "9.9.9.9")
    ]
    
    results = {}
    
    for location, dns_server in locations:
        try:
            resolver = dns.resolver.Resolver()
            resolver.nameservers = [dns_server]
            resolver.timeout = 5
            
            # Check _resend record
            answers = resolver.resolve(f"_resend.{domain}", 'TXT')
            found = False
            for answer in answers:
                if 'resend-verify=e41414b2-5346-4f' in str(answer):
                    found = True
                    break
            
            results[location] = found
            status = "✅" if found else "❌"
            print(f"  {status} {location}: {'Found' if found else 'Not found'}")
            
        except Exception as e:
            results[location] = False
            print(f"  ❌ {location}: Error - {str(e)[:50]}")
    
    return results

def check_specific_resend_issues(domain):
    """Check for specific issues that prevent Resend verification"""
    print(f"\n🔍 Checking Specific Resend Issues")
    print("-" * 40)
    
    issues = []
    
    # 1. Check if domain is already registered with another Resend account
    print("  🔍 Checking domain registration conflicts...")
    
    # 2. Check for TTL issues (very low TTL can cause problems)
    try:
        import subprocess
        result = subprocess.run(['nslookup', f'_resend.{domain}'], 
                              capture_output=True, text=True, timeout=10)
        if 'ttl' in result.stdout.lower():
            print("  ✅ TTL information available")
        else:
            print("  ⚠️  TTL information not visible")
    except:
        print("  ⚠️  Cannot check TTL information")
    
    # 3. Check for DNSSEC issues
    try:
        answers = dns.resolver.resolve(domain, 'DNSKEY')
        print("  ⚠️  DNSSEC enabled - may cause verification delays")
        issues.append("DNSSEC enabled - can cause verification delays")
    except:
        print("  ✅ No DNSSEC detected")
    
    # 4. Check for CAA records that might block verification
    try:
        answers = dns.resolver.resolve(domain, 'CAA')
        caa_records = [str(answer) for answer in answers]
        print(f"  ⚠️  CAA records found: {len(caa_records)}")
        for record in caa_records:
            print(f"      {record}")
        issues.append("CAA records present - may interfere with verification")
    except:
        print("  ✅ No CAA records found")
    
    return issues

def test_email_sending_capability(domain):
    """Test if the domain can theoretically send emails"""
    print(f"\n📧 Testing Email Sending Capability")
    print("-" * 40)
    
    # Check if all required records are present for sending
    requirements = {
        'SPF': False,
        'DKIM': False,
        'MX': False,
        'Verification': False
    }
    
    # Check SPF
    try:
        answers = dns.resolver.resolve(domain, 'TXT')
        for answer in answers:
            if 'v=spf1' in str(answer) and 'resend.com' in str(answer):
                requirements['SPF'] = True
                break
    except:
        pass
    
    # Check DKIM
    try:
        answers = dns.resolver.resolve(f'resend._domainkey.{domain}', 'TXT')
        for answer in answers:
            if 'p=' in str(answer):
                requirements['DKIM'] = True
                break
    except:
        pass
    
    # Check MX
    try:
        answers = dns.resolver.resolve(domain, 'MX')
        for answer in answers:
            if 'resend.com' in str(answer):
                requirements['MX'] = True
                break
    except:
        pass
    
    # Check Verification
    try:
        answers = dns.resolver.resolve(f'_resend.{domain}', 'TXT')
        for answer in answers:
            if 'resend-verify=' in str(answer):
                requirements['Verification'] = True
                break
    except:
        pass
    
    # Print results
    for req, status in requirements.items():
        icon = "✅" if status else "❌"
        print(f"  {icon} {req}: {'Ready' if status else 'Missing'}")
    
    all_ready = all(requirements.values())
    if all_ready:
        print(f"\n  🎉 All requirements met for email sending!")
    else:
        missing = [req for req, status in requirements.items() if not status]
        print(f"\n  ⚠️  Missing requirements: {', '.join(missing)}")
    
    return all_ready

def check_resend_status_page():
    """Check if Resend has any service issues"""
    print(f"\n🚨 Checking Resend Service Status")
    print("-" * 40)
    
    try:
        # Try to get Resend status (this is a generic check)
        response = requests.get("https://status.resend.com/", timeout=10)
        if response.status_code == 200:
            print("  ✅ Resend status page accessible")
            if 'incident' in response.text.lower() or 'outage' in response.text.lower():
                print("  ⚠️  Possible service issues detected")
                return False
            else:
                print("  ✅ No obvious service issues")
                return True
        else:
            print(f"  ⚠️  Status page returned {response.status_code}")
            return False
    except Exception as e:
        print(f"  ⚠️  Cannot check status page: {e}")
        return False

def suggest_next_steps(all_issues, dns_results, email_ready):
    """Suggest specific next steps based on findings"""
    print(f"\n🎯 RECOMMENDED NEXT STEPS")
    print("=" * 50)
    
    if not all_issues and all(dns_results.values()) and email_ready:
        print("✅ Your configuration is perfect!")
        print("\n🔄 Try these steps in order:")
        print("1. Log into Resend dashboard")
        print("2. Go to Domains section")
        print("3. Find billbytekot.in")
        print("4. Click 'Restart Verification' or 'Verify DNS Records'")
        print("5. Wait 5 minutes and check again")
        print("6. If still pending, repeat steps 4-5 two more times")
        print("7. If still failing after 1 hour, contact Resend support")
        
        print(f"\n📞 Resend Support Info:")
        print("- Email: help@resend.com")
        print("- Include: Domain name (billbytekot.in)")
        print("- Include: 'All DNS records correct but verification stuck'")
        
    else:
        print("❌ Issues found that need attention:")
        
        if not all(dns_results.values()):
            print("1. 🌍 DNS not propagated globally - wait 30 minutes")
        
        if all_issues:
            print("2. 🔧 Fix these specific issues:")
            for issue in all_issues:
                print(f"   - {issue}")
        
        if not email_ready:
            print("3. 📧 Complete email configuration requirements")
        
        print("\n⏰ After fixing issues:")
        print("- Wait 15-30 minutes for DNS propagation")
        print("- Run this test again")
        print("- Try verification in Resend dashboard")

def main():
    """Main test function"""
    
    domain = "billbytekot.in"
    
    print("🔍 RESEND CONNECTION DIAGNOSTIC")
    print("=" * 60)
    print(f"Domain: {domain}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Run all tests
    api_connected = test_resend_api_connection()
    dns_results = check_dns_from_resend_perspective(domain)
    specific_issues = check_specific_resend_issues(domain)
    email_ready = test_email_sending_capability(domain)
    service_ok = check_resend_status_page()
    
    # Print summary
    print(f"\n📊 TEST SUMMARY")
    print("=" * 40)
    print(f"API Connection: {'✅' if api_connected else '❌'}")
    print(f"Global DNS: {'✅' if all(dns_results.values()) else '❌'} ({sum(dns_results.values())}/{len(dns_results)})")
    print(f"Email Ready: {'✅' if email_ready else '❌'}")
    print(f"Service Status: {'✅' if service_ok else '⚠️'}")
    print(f"Issues Found: {len(specific_issues)}")
    
    # Suggest next steps
    suggest_next_steps(specific_issues, dns_results, email_ready)

if __name__ == "__main__":
    main()