#!/usr/bin/env python3
"""
Check DNSSEC Status for billbytekot.in
"""

import dns.resolver
import subprocess
import sys

def check_dnssec_status(domain):
    """Check if DNSSEC is enabled for the domain"""
    print(f"🔐 Checking DNSSEC Status for: {domain}")
    print("=" * 50)
    
    # Method 1: Check for DNSKEY records
    try:
        answers = dns.resolver.resolve(domain, 'DNSKEY')
        dnskey_count = len(answers)
        print(f"  ❌ DNSSEC ENABLED - Found {dnskey_count} DNSKEY records")
        
        for i, answer in enumerate(answers, 1):
            key_info = str(answer)[:60] + "..."
            print(f"      Key {i}: {key_info}")
        
        return True  # DNSSEC is enabled
        
    except dns.resolver.NoAnswer:
        print(f"  ✅ DNSSEC DISABLED - No DNSKEY records found")
        return False  # DNSSEC is disabled
    except Exception as e:
        print(f"  ⚠️  Cannot determine DNSSEC status: {e}")
        return None

def check_ds_records(domain):
    """Check for DS records at the parent zone"""
    print(f"\n🔗 Checking DS Records (Parent Zone)")
    print("-" * 40)
    
    try:
        answers = dns.resolver.resolve(domain, 'DS')
        ds_count = len(answers)
        print(f"  ❌ DS records found: {ds_count}")
        
        for i, answer in enumerate(answers, 1):
            print(f"      DS {i}: {str(answer)}")
        
        return True  # DS records exist
        
    except dns.resolver.NoAnswer:
        print(f"  ✅ No DS records found")
        return False  # No DS records
    except Exception as e:
        print(f"  ⚠️  Cannot check DS records: {e}")
        return None

def test_dnssec_validation(domain):
    """Test DNSSEC validation using dig if available"""
    print(f"\n🧪 Testing DNSSEC Validation")
    print("-" * 40)
    
    try:
        # Try to use dig command to test DNSSEC
        result = subprocess.run(['dig', '+dnssec', domain], 
                              capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            output = result.stdout
            if 'RRSIG' in output:
                print(f"  ❌ DNSSEC signatures found in response")
                return True
            else:
                print(f"  ✅ No DNSSEC signatures in response")
                return False
        else:
            print(f"  ⚠️  dig command failed")
            return None
            
    except FileNotFoundError:
        print(f"  ⚠️  dig command not available")
        return None
    except Exception as e:
        print(f"  ⚠️  Error testing DNSSEC: {e}")
        return None

def main():
    """Main function"""
    domain = "billbytekot.in"
    
    print("🔐 DNSSEC STATUS CHECKER")
    print("=" * 60)
    print(f"Domain: {domain}")
    print("=" * 60)
    
    # Check DNSSEC status
    dnssec_enabled = check_dnssec_status(domain)
    ds_records = check_ds_records(domain)
    dnssec_validation = test_dnssec_validation(domain)
    
    # Summary
    print(f"\n📊 DNSSEC STATUS SUMMARY")
    print("=" * 40)
    
    if dnssec_enabled:
        print("❌ DNSSEC: ENABLED")
        print("   This may cause Resend verification delays")
    elif dnssec_enabled is False:
        print("✅ DNSSEC: DISABLED")
        print("   Should not interfere with Resend verification")
    else:
        print("⚠️  DNSSEC: UNKNOWN")
        print("   Cannot determine status")
    
    if ds_records:
        print("❌ DS Records: PRESENT")
        print("   Domain is signed at parent level")
    elif ds_records is False:
        print("✅ DS Records: ABSENT")
        print("   Domain not signed at parent level")
    
    # Recommendations
    print(f"\n🎯 RECOMMENDATIONS")
    print("=" * 30)
    
    if dnssec_enabled or ds_records:
        print("1. DNSSEC is still active")
        print("2. This explains why Resend verification is stuck")
        print("3. Options:")
        print("   a) Wait 24-72 hours for DNSSEC-compatible verification")
        print("   b) Temporarily disable DNSSEC in GoDaddy")
        print("   c) Contact Resend support about DNSSEC domains")
        
        print(f"\n📞 To disable DNSSEC in GoDaddy:")
        print("1. Log into GoDaddy account")
        print("2. Go to DNS Management for billbytekot.in")
        print("3. Look for 'DNSSEC' or 'Security' settings")
        print("4. Disable DNSSEC")
        print("5. Wait 2-4 hours for changes to propagate")
        print("6. Try Resend verification again")
        
    else:
        print("✅ DNSSEC appears to be disabled")
        print("✅ Should not interfere with Resend verification")
        print("✅ Try 'Restart Verification' in Resend dashboard")

if __name__ == "__main__":
    main()