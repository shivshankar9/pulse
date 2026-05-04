#!/usr/bin/env python3
"""
OpenClaw Lead Scraper for CRM Integration
Scrapes business directories and sends leads to CRM via webhook
"""

import requests
import json
import time
import logging
from datetime import datetime
from typing import List, Dict, Optional
import os
from urllib.parse import urljoin

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CRMLeadScraper:
    def __init__(self, crm_webhook_url: str):
        """
        Initialize the lead scraper
        
        Args:
            crm_webhook_url: URL of your CRM webhook endpoint
        """
        self.crm_webhook_url = crm_webhook_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def scrape_yellow_pages(self, search_term: str, location: str, max_results: int = 50) -> List[Dict]:
        """
        Scrape Yellow Pages for business leads
        
        Args:
            search_term: Business type to search for (e.g., "restaurants", "dentists")
            location: Location to search in (e.g., "New York, NY")
            max_results: Maximum number of results to return
            
        Returns:
            List of lead dictionaries
        """
        leads = []
        
        try:
            # This is a simplified example - in reality you'd use proper web scraping
            # with tools like BeautifulSoup, Selenium, or specialized scraping libraries
            
            logger.info(f"Scraping Yellow Pages for '{search_term}' in '{location}'")
            
            # Simulate scraping results (replace with actual scraping logic)
            sample_leads = [
                {
                    "company_name": f"Sample {search_term.title()} Co {i}",
                    "phone": f"(555) 123-{1000 + i:04d}",
                    "address": f"{100 + i} Main St, {location}",
                    "website": f"https://sample{i}.com",
                    "category": search_term,
                    "location": location
                }
                for i in range(min(max_results, 10))  # Limit to 10 for demo
            ]
            
            for lead_data in sample_leads:
                # Enrich lead data
                enriched_lead = self.enrich_lead_data(lead_data)
                if enriched_lead:
                    leads.append(enriched_lead)
                
                # Rate limiting
                time.sleep(0.5)
            
            logger.info(f"Successfully scraped {len(leads)} leads")
            return leads
            
        except Exception as e:
            logger.error(f"Error scraping Yellow Pages: {str(e)}")
            return []
    
    def enrich_lead_data(self, lead_data: Dict) -> Optional[Dict]:
        """
        Enrich lead data with additional information
        
        Args:
            lead_data: Raw lead data from scraping
            
        Returns:
            Enriched lead data or None if invalid
        """
        try:
            # Basic validation
            if not lead_data.get('company_name') or not lead_data.get('phone'):
                return None
            
            # Add metadata
            enriched = {
                **lead_data,
                "source": "Yellow Pages Scraping",
                "scraped_at": datetime.now().isoformat(),
                "tags": ["scraped", "yellow-pages", lead_data.get('category', 'business')],
                "status": "new",
                "lead_score": self.calculate_lead_score(lead_data)
            }
            
            # Try to find email if website is available
            if lead_data.get('website'):
                email = self.find_contact_email(lead_data['website'])
                if email:
                    enriched['email'] = email
            
            return enriched
            
        except Exception as e:
            logger.error(f"Error enriching lead data: {str(e)}")
            return None
    
    def calculate_lead_score(self, lead_data: Dict) -> int:
        """
        Calculate a lead score based on available data
        
        Args:
            lead_data: Lead information
            
        Returns:
            Lead score (0-100)
        """
        score = 50  # Base score
        
        # Has website
        if lead_data.get('website'):
            score += 20
        
        # Has complete address
        if lead_data.get('address') and len(lead_data['address']) > 20:
            score += 15
        
        # Business category scoring
        high_value_categories = ['technology', 'finance', 'healthcare', 'legal']
        if any(cat in lead_data.get('category', '').lower() for cat in high_value_categories):
            score += 15
        
        return min(score, 100)
    
    def find_contact_email(self, website: str) -> Optional[str]:
        """
        Try to find contact email from website
        
        Args:
            website: Website URL
            
        Returns:
            Email address if found
        """
        try:
            # This is a simplified example - in reality you'd scrape the contact page
            # or use email finding services like Hunter.io
            
            # Simulate email finding
            domain = website.replace('https://', '').replace('http://', '').split('/')[0]
            common_emails = [
                f"info@{domain}",
                f"contact@{domain}",
                f"hello@{domain}",
                f"sales@{domain}"
            ]
            
            # Return first common email (in reality, you'd verify these exist)
            return common_emails[0]
            
        except Exception as e:
            logger.error(f"Error finding email for {website}: {str(e)}")
            return None
    
    def send_leads_to_crm(self, leads: List[Dict]) -> bool:
        """
        Send scraped leads to CRM via webhook
        
        Args:
            leads: List of lead dictionaries
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not leads:
                logger.warning("No leads to send to CRM")
                return True
            
            payload = {
                "leads": leads,
                "scraping_session": {
                    "timestamp": datetime.now().isoformat(),
                    "total_leads": len(leads),
                    "source": "OpenClaw Lead Scraper"
                }
            }
            
            logger.info(f"Sending {len(leads)} leads to CRM webhook: {self.crm_webhook_url}")
            
            response = self.session.post(
                self.crm_webhook_url,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Successfully sent leads to CRM. Processed: {result.get('processed', 0)}")
                return True
            else:
                logger.error(f"CRM webhook returned status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending leads to CRM: {str(e)}")
            return False
    
    def run_scraping_session(self, search_configs: List[Dict]) -> Dict:
        """
        Run a complete scraping session with multiple search configurations
        
        Args:
            search_configs: List of search configuration dictionaries
                           Each should have: search_term, location, max_results
        
        Returns:
            Session results summary
        """
        session_start = datetime.now()
        total_leads = 0
        successful_searches = 0
        
        logger.info(f"Starting scraping session with {len(search_configs)} search configurations")
        
        for config in search_configs:
            try:
                search_term = config.get('search_term')
                location = config.get('location')
                max_results = config.get('max_results', 50)
                
                logger.info(f"Scraping: {search_term} in {location}")
                
                leads = self.scrape_yellow_pages(search_term, location, max_results)
                
                if leads:
                    success = self.send_leads_to_crm(leads)
                    if success:
                        total_leads += len(leads)
                        successful_searches += 1
                
                # Rate limiting between searches
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"Error in search configuration {config}: {str(e)}")
        
        session_duration = (datetime.now() - session_start).total_seconds()
        
        results = {
            "session_start": session_start.isoformat(),
            "session_duration_seconds": session_duration,
            "total_searches": len(search_configs),
            "successful_searches": successful_searches,
            "total_leads_scraped": total_leads,
            "leads_per_minute": round((total_leads / session_duration) * 60, 2) if session_duration > 0 else 0
        }
        
        logger.info(f"Scraping session completed: {results}")
        return results

def main():
    """
    Main function to run the lead scraper
    """
    # Configuration
    CRM_WEBHOOK_URL = os.getenv('CRM_WEBHOOK_URL', 'https://your-crm.com/api/webhooks/openclaw/leads')
    
    # Search configurations
    search_configs = [
        {"search_term": "restaurants", "location": "New York, NY", "max_results": 25},
        {"search_term": "dentists", "location": "Los Angeles, CA", "max_results": 20},
        {"search_term": "law firms", "location": "Chicago, IL", "max_results": 15},
        {"search_term": "accounting", "location": "Houston, TX", "max_results": 20},
    ]
    
    # Initialize scraper
    scraper = CRMLeadScraper(CRM_WEBHOOK_URL)
    
    # Run scraping session
    results = scraper.run_scraping_session(search_configs)
    
    # Print results
    print("\n" + "="*50)
    print("SCRAPING SESSION RESULTS")
    print("="*50)
    print(f"Total Searches: {results['total_searches']}")
    print(f"Successful Searches: {results['successful_searches']}")
    print(f"Total Leads Scraped: {results['total_leads_scraped']}")
    print(f"Session Duration: {results['session_duration_seconds']:.1f} seconds")
    print(f"Leads per Minute: {results['leads_per_minute']}")
    print("="*50)

if __name__ == "__main__":
    main()