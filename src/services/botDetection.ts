export class BotDetectionService {
  private readonly botPatterns = [
    // Headless browsers
    /headless/i,
    /phantom/i,
    /puppeteer/i,
    /selenium/i,
    /webdriver/i,
    /playwright/i,
    /chromium/i,
    
    // Crawlers and bots
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    
    // Automation tools
    /automation/i,
    /test/i,
    /monitoring/i,
    
    // Specific known bots (non-exhaustive list)
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i,
    
    // HTTP clients (not browsers)
    /^curl\//i,
    /^wget/i,
    /^python-requests/i,
    /^go-http-client/i,
    /^java\/\d/i,
    /^apache-httpclient/i,
  ];

  isBot(userAgent?: string): boolean {
    if (!userAgent || userAgent.trim() === '') {
      // Missing user agent is suspicious
      return true;
    }

    return this.botPatterns.some(pattern => pattern.test(userAgent));
  }
}

