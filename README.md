# Economap
[![Watch the demo](https://youtu.be/G9PU7EiYc_I)

Overview
Economap is a high-precision web scraping utility designed to track and compare fresh produce and grocery pricing across major retailers in the Fort Myers area. The system normalizes "Unit Pricing" (Target/Walmart) against "Bulk Pricing" (Sam's Club) to provide a true cost-per-volume analysis.

Technical Stack
Runtime: Node.js v22 (MacBook Air Optimized)

Scraping Engine: Playwright-Extra with Stealth Plugin

Browsers: Chromium (Primary) & Firefox Gecko (Fallback)

Database: Supabase (PostgreSQL)

Automation: GitHub Actions (for headless cloud execution)

Key Features
1. 2026 Bot-Shield Bypass
To counter Akamai and PerimeterX protections used by Walmart and Sam's Club in 2026, the scraper utilizes:

Dual-Engine Failover: If Chromium triggers a CAPTCHA or serves a "Ghost Price" ($205.00/ea), the system automatically pivots to the Firefox Gecko engine.

Hardware Fingerprinting: Spoofs hardwareConcurrency and deviceMemory to mimic a standard consumer laptop.

2. Precise Geo-Location Injection
The scraper "teleports" to Fort Myers stores by bypassing IP-based geolocation:

Walmart: Injects locDataV3 and vtc cookies for the Colonial Blvd Supercenter (4770).

Sam's Club: Targets the South Cleveland Ave Club (8130) via direct clubId URL parameters.

Target: Automates the Store Locator to "Shop this Store" at ZIP 33912.

3. Smart-Guard Validator
A custom parseRetailPrice helper protects the database from "Junk Data":

Outlier Detection: Automatically identifies and corrects 2026 "hydration placeholders" (e.g., misreading 20¢ as $205.00).

Unit Normalization: Converts 12ct egg prices or single-fruit prices to match Sam's Club bulk volumes using specific NormalizationFactors.

Execution
To run a specific market analysis from the terminal:

Bash
# Analyze Bananas (Default)
npm run scrape

# Analyze Eggs (Normalized to 24ct)
SEARCH_ITEM="eggs" npm run scrape

# Analyze Beef (Normalized to 5lbs)
SEARCH_ITEM="ground beef 80/20" npm run scrape
Database Schema
The extracted data is persisted to the price_history table in Supabase:

item_name: The search query used.

store_name: Target, Walmart, or Sam's Club.

unit_price: The raw price found on the shelf.

bulk_matched_price: The normalized cost for direct comparison.
