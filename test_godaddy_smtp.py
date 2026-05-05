#!/usr/bin/env python3
"""
Test GoDaddy SMTP Settings
Find the correct SMTP configuration for your GoDaddy email
"""

import smtplib
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def test_smtp_connection(host, port, username, password, use_tls=True):
    """Test SMTP connection with given settings"""
    print(f"🔍 Testing SMTP: {host}:{port} (TLS: {use_tls})")
    
    try:
        # Test connection
        server = smtplib.SMTP(host, port, timeout=10)
        print(f"   ✅ Connected to {host}:{port}")
        
        # Test STARTTLS
        if use_tls:
            server.starttls()
            print(f"   ✅ TLS enabled")
        
        # Test authentication
        server.login(username, password)
        print(f"   ✅ Authentication successful")
        
        server.quit()
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"   ❌ Authentication failed: {e}")
        return False
    except smtplib.SMTPConnectError as e:
        print(f"   ❌ Connection failed: {e}")
        return False
    except smtplib.SMTPException as e:
        print(f"   ❌ SMTP error: {e}")
        return False
    except socket.timeout:
        print(f"   ❌ Connection timeout")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return False

def test_godaddy_smtp_variants():
    """Test different GoDaddy SMTP configurations"""
    
    print("🔍 GODADDY SMTP CONFIGURATION TESTER")
    print("=" * 60)
    
    # Get user credentials
    username = input("Enter your GoDaddy email address (e.g., support@billbytekot.in): ").strip()
    password = input("Enter your GoDaddy email password: ").strip()
    
    if not username or not password:
        print("❌ Username and password are required")
        return
    
    print(f"\n🧪 Testing SMTP configurations for: {username}")
    print("=" * 60)
    
    # Different GoDaddy SMTP configurations to test
    smtp_configs = [
        # Standard GoDaddy SMTP settings
        {"host": "smtpout.secureserver.net", "port": 587, "tls": True, "name": "GoDaddy Standard (TLS)"},
        {"host": "smtpout.secureserver.net", "port": 465, "tls": False, "name": "GoDaddy Standard (SSL)"},
        {"host": "smtpout.secureserver.net", "port": 25, "tls": True, "name": "GoDaddy Standard (Port 25)"},
        
        # Alternative GoDaddy SMTP settings
        {"host": "smtp.secureserver.net", "port": 587, "tls": True, "name": "GoDaddy Alt (TLS)"},
        {"host": "smtp.secureserver.net", "port": 465, "tls": False, "name": "GoDaddy Alt (SSL)"},
        {"host": "smtp.secureserver.net", "port": 25, "tls": True, "name": "GoDaddy Alt (Port 25)"},
        
        # Legacy GoDaddy settings
        {"host": "relay-hosting.secureserver.net", "port": 25, "tls": True, "name": "GoDaddy Legacy"},
    ]
    
    working_configs = []
    
    for config in smtp_configs:
        print(f"\n📧 Testing: {config['name']}")
        print("-" * 40)
        
        success = test_smtp_connection(
            config["host"], 
            config["port"], 
            username, 
            password, 
            config["tls"]
        )
        
        if success:
            working_configs.append(config)
            print(f"   🎉 SUCCESS! This configuration works.")
        else:
            print(f"   ❌ Failed")
    
    # Summary
    print(f"\n📊 RESULTS SUMMARY")
    print("=" * 60)
    
    if working_configs:
        print(f"✅ Found {len(working_configs)} working configuration(s):")
        
        for i, config in enumerate(working_configs, 1):
            print(f"\n{i}. {config['name']}")
            print(f"   Host: {config['host']}")
            print(f"   Port: {config['port']}")
            print(f"   TLS: {config['tls']}")
            print(f"   Username: {username}")
            print(f"   Password: [your password]")
        
        # Recommend the best one
        best_config = working_configs[0]
        print(f"\n🎯 RECOMMENDED CONFIGURATION:")
        print("=" * 40)
        print(f"SMTP Host: {best_config['host']}")
        print(f"Port: {best_config['port']}")
        print(f"TLS: {best_config['tls']}")
        print(f"Username: {username}")
        print(f"Password: [your password]")
        
        print(f"\n🔧 UPDATE YOUR CRM WITH THESE SETTINGS:")
        print("1. Go to Settings → Integrations → GoDaddy Email (SMTP)")
        print("2. Update the configuration with the recommended settings above")
        print("3. Test the connection again")
        
    else:
        print("❌ No working SMTP configurations found!")
        print("\n🔍 TROUBLESHOOTING STEPS:")
        print("1. Verify your GoDaddy email credentials are correct")
        print("2. Check if GoDaddy email service is active")
        print("3. Try logging into GoDaddy webmail first")
        print("4. Contact GoDaddy support for SMTP settings")
        print("5. Check if your hosting plan includes SMTP access")

def send_test_email(host, port, username, password, use_tls=True):
    """Send a test email to verify everything works"""
    
    print(f"\n📧 Sending test email...")
    
    try:
        # Create test message
        msg = MIMEMultipart()
        msg['From'] = f"Pulse CRM <{username}>"
        msg['To'] = username  # Send to yourself
        msg['Subject'] = "GoDaddy SMTP Test - Success!"
        
        body = """
        🎉 Congratulations!
        
        Your GoDaddy SMTP configuration is working perfectly!
        
        This test email was sent from your CRM using:
        - Custom domain email: {username}
        - Professional appearance
        - Reliable delivery
        
        Your email integration is now ready for production use.
        
        Best regards,
        Pulse CRM System
        """.format(username=username)
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email
        server = smtplib.SMTP(host, port)
        if use_tls:
            server.starttls()
        server.login(username, password)
        server.send_message(msg)
        server.quit()
        
        print(f"   ✅ Test email sent successfully!")
        print(f"   📬 Check your inbox: {username}")
        return True
        
    except Exception as e:
        print(f"   ❌ Failed to send test email: {e}")
        return False

def main():
    """Main function"""
    
    try:
        test_godaddy_smtp_variants()
        
        # Ask if user wants to send test email
        print(f"\n🧪 Would you like to send a test email? (y/n): ", end="")
        if input().lower().strip() == 'y':
            username = input("Email address: ").strip()
            password = input("Password: ").strip()
            
            # Use the recommended settings (try the most common first)
            send_test_email("smtpout.secureserver.net", 587, username, password, True)
        
    except KeyboardInterrupt:
        print(f"\n\n⚠️ Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()