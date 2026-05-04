#!/usr/bin/env python3
"""
Pulse CRM Automation Setup Script
Automates the setup of OpenClaw + n8n integration
"""

import os
import sys
import json
import subprocess
import requests
import time
from pathlib import Path
from typing import Dict, List, Optional

class AutomationSetup:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.config = {}
        self.services_status = {}
    
    def print_banner(self):
        """Print setup banner"""
        banner = """
╔══════════════════════════════════════════════════════════════╗
║                 Pulse CRM Automation Setup                   ║
║              OpenClaw + n8n Integration                      ║
╚══════════════════════════════════════════════════════════════╝
        """
        print(banner)
    
    def check_prerequisites(self) -> bool:
        """Check if all prerequisites are installed"""
        print("🔍 Checking prerequisites...")
        
        prerequisites = {
            'docker': 'docker --version',
            'docker-compose': 'docker-compose --version',
            'python': 'python --version',
            'pip': 'pip --version'
        }
        
        missing = []
        for name, command in prerequisites.items():
            try:
                result = subprocess.run(command.split(), capture_output=True, text=True)
                if result.returncode == 0:
                    print(f"  ✅ {name}: {result.stdout.strip()}")
                else:
                    missing.append(name)
            except FileNotFoundError:
                missing.append(name)
        
        if missing:
            print(f"❌ Missing prerequisites: {', '.join(missing)}")
            print("Please install the missing tools and run setup again.")
            return False
        
        print("✅ All prerequisites found!")
        return True
    
    def collect_configuration(self):
        """Collect configuration from user"""
        print("\n📝 Configuration Setup")
        print("Please provide the following configuration values:")
        
        config_items = [
            {
                'key': 'CRM_API_TOKEN',
                'prompt': 'CRM API Token (generate in Settings > Integrations)',
                'required': True
            },
            {
                'key': 'OPENAI_API_KEY',
                'prompt': 'OpenAI API Key (for AI ticket analysis)',
                'required': False
            },
            {
                'key': 'HUNTER_API_KEY',
                'prompt': 'Hunter.io API Key (for email finding)',
                'required': False
            },
            {
                'key': 'CLEARBIT_API_KEY',
                'prompt': 'Clearbit API Key (for lead enrichment)',
                'required': False
            },
            {
                'key': 'COMPANY_NAME',
                'prompt': 'Your Company Name',
                'default': 'Pulse CRM',
                'required': False
            },
            {
                'key': 'N8N_PASSWORD',
                'prompt': 'n8n Admin Password',
                'default': 'automation123',
                'required': False
            },
            {
                'key': 'SCRAPING_INTERVAL',
                'prompt': 'Lead scraping interval (hours)',
                'default': '24',
                'required': False
            },
            {
                'key': 'MAX_LEADS_PER_RUN',
                'prompt': 'Maximum leads per scraping run',
                'default': '50',
                'required': False
            }
        ]
        
        for item in config_items:
            while True:
                default_text = f" (default: {item.get('default')})" if item.get('default') else ""
                required_text = " *required*" if item.get('required') else ""
                
                value = input(f"  {item['prompt']}{default_text}{required_text}: ").strip()
                
                if not value and item.get('default'):
                    value = item['default']
                
                if not value and item.get('required'):
                    print("    ❌ This field is required!")
                    continue
                
                if value:
                    self.config[item['key']] = value
                break
        
        print("✅ Configuration collected!")
    
    def create_env_file(self):
        """Create .env file for Docker Compose"""
        print("\n📄 Creating environment file...")
        
        env_content = []
        for key, value in self.config.items():
            env_content.append(f"{key}={value}")
        
        # Add additional required variables
        additional_vars = {
            'MONGO_USERNAME': 'admin',
            'MONGO_PASSWORD': 'password',
            'GRAFANA_PASSWORD': 'admin123',
            'COMPETITOR_MONITORING_INTERVAL': '6'
        }
        
        for key, value in additional_vars.items():
            if key not in self.config:
                env_content.append(f"{key}={value}")
        
        env_file = self.base_dir / '.env.automation'
        with open(env_file, 'w') as f:
            f.write('\n'.join(env_content))
        
        print(f"✅ Environment file created: {env_file}")
    
    def create_directories(self):
        """Create necessary directories"""
        print("\n📁 Creating directories...")
        
        directories = [
            'scripts',
            'config',
            'logs',
            'data/openclaw',
            'data/competitor',
            'config/grafana/dashboards',
            'config/grafana/datasources'
        ]
        
        for directory in directories:
            dir_path = self.base_dir / directory
            dir_path.mkdir(parents=True, exist_ok=True)
            print(f"  ✅ Created: {directory}")
    
    def create_config_files(self):
        """Create configuration files"""
        print("\n⚙️ Creating configuration files...")
        
        # Competitors configuration
        competitors_config = {
            "competitors": [
                {
                    "name": "Competitor A",
                    "url": "https://competitor-a.com/pricing",
                    "selectors": {
                        "prices": ".price",
                        "products": ".product-name"
                    }
                },
                {
                    "name": "Competitor B", 
                    "url": "https://competitor-b.com/products",
                    "selectors": {
                        "prices": ".pricing",
                        "features": ".feature-list"
                    }
                }
            ]
        }
        
        with open(self.base_dir / 'config/competitors.json', 'w') as f:
            json.dump(competitors_config, f, indent=2)
        
        # Prometheus configuration
        prometheus_config = """
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'pulse-crm'
    static_configs:
      - targets: ['crm:8000']
  
  - job_name: 'n8n'
    static_configs:
      - targets: ['n8n:5678']
  
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
"""
        
        with open(self.base_dir / 'config/prometheus.yml', 'w') as f:
            f.write(prometheus_config)
        
        print("✅ Configuration files created!")
    
    def install_python_dependencies(self):
        """Install Python dependencies"""
        print("\n📦 Installing Python dependencies...")
        
        try:
            subprocess.run([
                sys.executable, '-m', 'pip', 'install', '-r', 'requirements-automation.txt'
            ], check=True)
            print("✅ Python dependencies installed!")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install dependencies: {e}")
            return False
        
        return True
    
    def start_services(self):
        """Start Docker services"""
        print("\n🚀 Starting automation services...")
        
        try:
            # Start services
            subprocess.run([
                'docker-compose', '-f', 'docker-compose.automation.yml', 
                '--env-file', '.env.automation', 'up', '-d'
            ], check=True)
            
            print("✅ Services started!")
            
            # Wait for services to be ready
            print("⏳ Waiting for services to be ready...")
            time.sleep(30)
            
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to start services: {e}")
            return False
    
    def check_service_health(self):
        """Check health of all services"""
        print("\n🏥 Checking service health...")
        
        services = {
            'CRM Backend': 'http://localhost:8000/health',
            'n8n': 'http://localhost:5678/healthz',
            'Grafana': 'http://localhost:3001/api/health',
            'Prometheus': 'http://localhost:9090/-/healthy'
        }
        
        for service, url in services.items():
            try:
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    print(f"  ✅ {service}: Healthy")
                    self.services_status[service] = 'healthy'
                else:
                    print(f"  ⚠️ {service}: Unhealthy (status: {response.status_code})")
                    self.services_status[service] = 'unhealthy'
            except requests.RequestException:
                print(f"  ❌ {service}: Not responding")
                self.services_status[service] = 'not_responding'
    
    def import_n8n_workflows(self):
        """Import workflows into n8n"""
        print("\n🔄 Importing n8n workflows...")
        
        try:
            # Wait a bit more for n8n to be fully ready
            time.sleep(10)
            
            # Load workflows
            with open(self.base_dir / 'scripts/n8n_workflows.json', 'r') as f:
                workflows_data = json.load(f)
            
            n8n_base_url = 'http://localhost:5678'
            auth = ('admin', self.config.get('N8N_PASSWORD', 'automation123'))
            
            for workflow_config in workflows_data['workflows']:
                workflow = workflow_config['workflow']
                
                # Import workflow
                response = requests.post(
                    f"{n8n_base_url}/rest/workflows",
                    json=workflow,
                    auth=auth,
                    timeout=30
                )
                
                if response.status_code in [200, 201]:
                    print(f"  ✅ Imported: {workflow['name']}")
                else:
                    print(f"  ❌ Failed to import: {workflow['name']} (status: {response.status_code})")
            
            print("✅ Workflow import completed!")
            
        except Exception as e:
            print(f"❌ Failed to import workflows: {e}")
            print("You can manually import workflows from scripts/n8n_workflows.json")
    
    def print_summary(self):
        """Print setup summary"""
        print("\n" + "="*60)
        print("🎉 AUTOMATION SETUP COMPLETE!")
        print("="*60)
        
        print("\n📊 Service Status:")
        for service, status in self.services_status.items():
            status_icon = "✅" if status == 'healthy' else "⚠️" if status == 'unhealthy' else "❌"
            print(f"  {status_icon} {service}: {status}")
        
        print("\n🌐 Access URLs:")
        print(f"  • CRM Backend: http://localhost:8000")
        print(f"  • n8n Workflows: http://localhost:5678")
        print(f"  • Grafana Dashboard: http://localhost:3001")
        print(f"  • Prometheus Metrics: http://localhost:9090")
        
        print("\n🔑 Default Credentials:")
        print(f"  • n8n: admin / {self.config.get('N8N_PASSWORD', 'automation123')}")
        print(f"  • Grafana: admin / admin123")
        
        print("\n📚 Next Steps:")
        print("  1. Access n8n at http://localhost:5678 and activate workflows")
        print("  2. Configure your CRM webhook URLs in Settings > Automation")
        print("  3. Test the integration by running a lead scraping script")
        print("  4. Monitor automation metrics in Grafana dashboard")
        print("  5. Review the integration guide: N8N_OPENCLAW_INTEGRATION_GUIDE.md")
        
        print("\n🛠️ Management Commands:")
        print("  • Stop services: docker-compose -f docker-compose.automation.yml down")
        print("  • View logs: docker-compose -f docker-compose.automation.yml logs -f")
        print("  • Restart services: docker-compose -f docker-compose.automation.yml restart")
        
        print("\n" + "="*60)
    
    def run_setup(self):
        """Run the complete setup process"""
        self.print_banner()
        
        if not self.check_prerequisites():
            return False
        
        self.collect_configuration()
        self.create_env_file()
        self.create_directories()
        self.create_config_files()
        
        if not self.install_python_dependencies():
            return False
        
        if not self.start_services():
            return False
        
        self.check_service_health()
        self.import_n8n_workflows()
        self.print_summary()
        
        return True

def main():
    """Main function"""
    setup = AutomationSetup()
    
    try:
        success = setup.run_setup()
        if success:
            print("\n🎉 Setup completed successfully!")
            return 0
        else:
            print("\n❌ Setup failed. Please check the errors above.")
            return 1
    except KeyboardInterrupt:
        print("\n\n⚠️ Setup interrupted by user.")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error during setup: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())