#!/usr/bin/env python3
"""
Resend Domain Verification Checker
Specifically checks if billbytekot.in is ready for Resend verification
"""

import dns.resolver
import requests
import time
from datetime import datetime

def check_resend_requirements(domain):
    """Check all Resend domain verification requirements"""
    
    print(f"🔍 Checking Resend Requirements for: {domain}")
    print("=" * 60)
    
    requirements = {
        'verification_token': False,
        'spf_record': False,
        'dkim_record': False,
        'dmarc_record': False,
        'mx_record': False
    }
    
    issues = []
    
    # 1. Check _resend verification token
    try:
        print("1️⃣ Checking _resend verification token...")
        answers = dns.resolver.resolve(f"_resend.{domain}", 'TXT')
        for answer in answers:
            record = str(answer).strip('"')
            if 'resend-verify=e41414b2-5346-4f' in record:
                print(f"   ✅ Found: {record}")
                requirements['verification_token'] = True
                break
        
        if not requirements['verification_token']:
            issues.append("❌ Missing or incorrect _resend verification token")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        issues.append("❌ Cannot resolve _resend subdomain")
    
    # 2. Check SPF record
    try:
        print("\n2️⃣ Checking SPF record...")
        answers = dns.resolver.resolve(domain, 'TXT')
        for answer in answers:
            record = str(answer).strip('"')
            if record.startswith('v=spf1') and 'resend.com' in record:
                print(f"   ✅ Found: {record}")
                requirements['spf_record'] = True
                break
        
        if not requirements['spf_record']:
            issues.append("❌ Missing or incorrect SPF record")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        issues.append("❌ Cannot resolve SPF record")
    
    # 3. Check DKIM record
    try:
        print("\n3️⃣ Checking DKIM record...")
        answers = dns.resolver.resolve(f"resend._domainkey.{domain}", 'TXT')
        for answer in answers:
            record = str(answer).strip('"')
            if record.startswith('p=') and 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ' in record:
                print(f"   ✅ Found: {record[:60]}...")
                requirements['dkim_record'] = True
                break
        
        if not requirements['dkim_record']:
            issues.append("❌ Missing or incorrect DKIM record")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        issues.append("❌ Cannot resolve DKIM record")
    
    # 4. Check DMARC record (and look for duplicates)
    try:
        print("\n4️⃣ Checking DMARC record...")
        answers = dns.resolver.resolve(f"_dmarc.{domain}", 'TXT')
        dmarc_records = []
        
        for answer in answers:
            record = str(answer).strip('"')
            dmarc_records.append(record)
            print(f"   📋 Found: {record}")
        
        # Check for valid DMARC record
        valid_dmarc = False
        for record in dmarc_records:
            if record.startswith('v=DMARC1') and 'billbytekot.in' in record:
                valid_dmarc = True
                requirements['dmarc_record'] = True
                break
        
        if len(dmarc_records) > 1:
            issues.append(f"⚠️ Multiple DMARC records found ({len(dmarc_records)}) - should have only one")
        
        if not valid_dmarc:
            issues.append("❌ Missing valid DMARC record")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        issues.append("❌ Cannot resolve DMARC record")
    
    # 5. Check MX record
    try:
        print("\n5️⃣ Checking MX record...")
        answers = dns.resolver.resolve(domain, 'MX')
        for answer in answers:
            record = str(answer)
            if 'inbound.resend.com' in record:
                print(f"   ✅ Found: {record}")
                requirements['mx_record'] = True
                break
        
        if not requirements['mx_record']:
            issues.append("❌ Missing or incorrect MX record")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        issues.append("❌ Cannot resolve MX record")
    
    return requirements, issues

def test_resend_api_verification(domain):
    """Test if Resend can verify the domain"""
    
    print(f"\n🧪 Testing Resend API Verification...")
    print("=" * 40)
    
    # Note: This would require Resend API key to actually test
    # For now, we'll just simulate the check
    
    print("   ℹ️  To test actual verification:")
    print("   1. Log into resend.com dashboard")
    print("   2. Go to Domains section")
    print(f"   3. Find {domain} and click 'Verify'")
    print("   4. Check if all records show as verified")

def print_verification_summary(requirements, issues):
    """Print a summary of verification status"""
    
    print(f"\n📊 VERIFICATION SUMMARY")
    print("=" * 50)
    
    total_requirements = len(requirements)
    met_requirements = sum(requirements.values())
    
    print(f"Requirements Met: {met_requirements}/{total_requirements}")
    
    for req, status in requirements.items():
        status_icon = "✅" if status else "❌"
        req_name = req.replace('_', ' ').title()
        print(f"  {status_icon} {req_name}")
    
    if met_requirements == total_requirements:
        print(f"\n🎉 ALL REQUIREMENTS MET!")
        print("Your domain should now verify successfully in Resend!")
    else:
        print(f"\n⚠️  {total_requirements - met_requirements} requirements still need attention")
    
    if issues:
        print(f"\n🔧 ISSUES TO FIX:")
        for issue in issues:
            print(f"  {issue}")

def main():
    """Main verification function"""
    
    domain = "billbytekot.in"
    
    print("🌐 Resend Domain Verification Checker")
    print("=" * 60)
    print(f"Domain: {domain}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check all requirements
    requirements, issues = check_resend_requirements(domain)
    
    # Test API verification
    test_resend_api_verification(domain)
    
    # Print summary
    print_verification_summary(requirements, issues)
    
    # Next steps
    print(f"\n⏭️  NEXT STEPS:")
    print("=" * 30)
    
    if all(requirements.values()):
        print("1. ✅ Go to Resend dashboard")
        print("2. ✅ Click 'Verify' on your domain")
        print("3. ✅ Domain should verify successfully!")
        print("4. ✅ Test sending emails from your domain")
    else:
        print("1. 🔧 Fix the issues listed above")
        print("2. ⏰ Wait 15-30 minutes for DNS propagation")
        print("3. 🔄 Run this script again")
        print("4. ✅ Try verification in Resend dashboard")
    
    print(f"\n💡 TIP: If DNS changes were just made, wait 15-30 minutes before testing verification.")

if __name__ == "__main__":
    main()