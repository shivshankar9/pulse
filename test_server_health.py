#!/usr/bin/env python3
"""
Test server responsiveness and health
"""

import requests
import time

def test_server_health():
    print('🔍 Testing server responsiveness...')
    
    # Test health endpoint with longer timeout
    try:
        print('Testing health endpoint with 30s timeout...')
        response = requests.get('https://pulse-iisx.onrender.com/health', timeout=30)
        print(f'✅ Health check: {response.status_code}')
        
        if response.status_code == 200:
            data = response.json()
            print(f'Status: {data.get("status")}')
            print(f'Database: {data.get("database")}')
            
            db_details = data.get('database_details', {})
            if 'collections' in db_details:
                collections = db_details['collections']
                print(f'Messages in DB: {collections.get("messages", 0)}')
                print(f'Users in DB: {collections.get("users", 0)}')
            
            return True
        else:
            print(f'❌ Unexpected status: {response.status_code}')
            return False
            
    except requests.exceptions.Timeout:
        print('❌ Health check timed out after 30 seconds')
        return False
    except Exception as e:
        print(f'❌ Health check failed: {e}')
        return False

def test_webhook_verification():
    print('\n🔗 Testing webhook verification...')
    
    try:
        url = 'https://pulse-iisx.onrender.com/api/webhooks/whatsapp-business/b175df83-350d-49f0-9eef-e2f1b2a5164e'
        params = {
            'hub.mode': 'subscribe', 
            'hub.challenge': '12345', 
            'hub.verify_token': 'pulse_crm_verify'
        }
        
        response = requests.get(url, params=params, timeout=15)
        print(f'✅ Webhook verification: {response.status_code}')
        print(f'Response: {response.text}')
        
        return response.status_code == 200
        
    except requests.exceptions.Timeout:
        print('❌ Webhook verification timed out')
        return False
    except Exception as e:
        print(f'❌ Webhook verification failed: {e}')
        return False

def test_simple_debug():
    print('\n🧪 Testing debug simulation with longer timeout...')
    
    try:
        url = 'https://pulse-iisx.onrender.com/api/debug/simulate-inbound/b175df83-350d-49f0-9eef-e2f1b2a5164e'
        params = {
            'phone': '+918210066921',
            'message': f'Server test at {time.strftime("%H:%M:%S")}'
        }
        
        response = requests.post(url, params=params, timeout=30)
        print(f'✅ Debug simulation: {response.status_code}')
        
        if response.status_code == 200:
            data = response.json()
            print(f'Message created: {data.get("message_id")}')
            return True
        else:
            print(f'Response: {response.text}')
            return False
            
    except requests.exceptions.Timeout:
        print('❌ Debug simulation timed out after 30 seconds')
        return False
    except Exception as e:
        print(f'❌ Debug simulation failed: {e}')
        return False

def main():
    print('🚀 Server Health Check')
    print('=' * 50)
    
    health_ok = test_server_health()
    webhook_ok = test_webhook_verification()
    debug_ok = test_simple_debug()
    
    print('\n' + '=' * 50)
    print('📊 RESULTS')
    print('=' * 50)
    
    print(f'Health endpoint: {"✅ OK" if health_ok else "❌ FAIL"}')
    print(f'Webhook verification: {"✅ OK" if webhook_ok else "❌ FAIL"}')
    print(f'Debug simulation: {"✅ OK" if debug_ok else "❌ FAIL"}')
    
    if not any([health_ok, webhook_ok, debug_ok]):
        print('\n❌ SERVER APPEARS TO BE DOWN OR UNRESPONSIVE')
        print('💡 Possible causes:')
        print('   1. Server is sleeping (free hosting plans often sleep)')
        print('   2. Database connection issues')
        print('   3. Server overload or crash')
        print('   4. Network connectivity issues')
        print('\n🔧 Recommended actions:')
        print('   1. Check Render dashboard for server status')
        print('   2. Check server logs for errors')
        print('   3. Try restarting the service')
        print('   4. Wait a few minutes and try again (server may be waking up)')
    elif health_ok:
        print('\n✅ SERVER IS RESPONSIVE')
        print('💡 The timeout issues in previous tests may have been temporary')
        print('   The server is now responding normally')
    else:
        print('\n⚠️ PARTIAL SERVER RESPONSE')
        print('💡 Some endpoints work, others may have issues')

if __name__ == '__main__':
    main()