#!/usr/bin/env python3
"""
Test script to verify Resend webhook is working correctly
"""
import requests
import json

# Your configuration
BACKEND_URL = "https://puls1.onrender.com"  # Change if different
USER_ID = "b175df83-350d-49f0-9eef-e2f1b2a5164e"
WEBHOOK_URL = f"{BACKEND_URL}/api/webhooks/resend/{USER_ID}"

# Test payload simulating what Resend sends
test_payload = {
    "data": {
        "from": "customer@example.com",
        "to": ["support@yourdomain.com"],
        "subject": "Test Support Request",
        "text": "This is a test email to verify the webhook is working correctly.",
        "html": "<p>This is a test email to verify the webhook is working correctly.</p>",
        "message_id": "test-message-123",
        "created_at": "2024-01-15T10:30:00Z"
    }
}

# Alternative payload format (Resend might send data directly)
test_payload_direct = {
    "from": {"email": "customer@example.com", "name": "Test Customer"},
    "to": ["support@yourdomain.com"],
    "subject": "Test Support Request Direct",
    "text": "This is a test email with direct format.",
    "html": "<p>This is a test email with direct format.</p>",
    "message_id": "test-message-456",
    "created_at": "2024-01-15T10:35:00Z"
}

def test_webhook(payload, description):
    """Test the webhook with a given payload"""
    print(f"\n{'='*60}")
    print(f"Testing: {description}")
    print(f"{'='*60}")
    print(f"URL: {WEBHOOK_URL}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            WEBHOOK_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ SUCCESS: Webhook processed successfully!")
            result = response.json()
            print(f"Email ID: {result.get('email_id')}")
            print(f"User ID: {result.get('user_id')}")
        else:
            print(f"❌ FAILED: Status {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR: Cannot reach the backend server")
        print("   - Check if the backend is running")
        print("   - Verify the BACKEND_URL is correct")
    except requests.exceptions.Timeout:
        print("❌ TIMEOUT: Request took too long")
    except Exception as e:
        print(f"❌ ERROR: {e}")

def check_backend_health():
    """Check if backend is accessible"""
    print(f"\n{'='*60}")
    print("Checking Backend Health")
    print(f"{'='*60}")
    
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        print(f"✅ Backend is accessible: {response.status_code}")
    except Exception as e:
        print(f"❌ Backend is not accessible: {e}")
        return False
    return True

def main():
    print("Resend Webhook Test Script")
    print("="*60)
    
    # Check backend health first
    if not check_backend_health():
        print("\n⚠️  Backend is not accessible. Please check:")
        print("   1. Is the backend deployed and running?")
        print("   2. Is the BACKEND_URL correct?")
        print("   3. Are there any firewall/network issues?")
        return
    
    # Test with wrapped payload
    test_webhook(test_payload, "Wrapped Payload (data field)")
    
    # Test with direct payload
    test_webhook(test_payload_direct, "Direct Payload")
    
    print("\n" + "="*60)
    print("Testing Complete")
    print("="*60)
    print("\nNext Steps:")
    print("1. If tests passed, check your Resend dashboard webhook logs")
    print("2. Verify the webhook URL in Resend matches exactly:")
    print(f"   {WEBHOOK_URL}")
    print("3. Check that Resend is sending to the correct endpoint")
    print("4. Look at backend logs for any errors")
    print("\nResend Webhook Configuration:")
    print("- Go to Resend Dashboard > Webhooks")
    print("- Add webhook URL (if not already added):")
    print(f"  {WEBHOOK_URL}")
    print("- Select events: 'email.received' or 'email.delivered'")
    print("- Save and test from Resend dashboard")

if __name__ == "__main__":
    main()
