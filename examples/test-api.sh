#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Health Check ==="
curl -s "$BASE_URL/health" | jq '.'
echo -e "\n"

echo "=== Envoi d'un pageview ==="
curl -s -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId": "test-site",
    "domain": "example.com",
    "type": "pageview",
    "href": "https://example.com/page1",
    "referrer": "https://google.com",
    "viewport": { "width": 1920, "height": 1080 },
    "visitorId": "visitor-123",
    "sessionId": "session-123",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  }' | jq '.'
echo -e "\n"

echo "=== Envoi d'un événement custom ==="
curl -s -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId": "test-site",
    "domain": "example.com",
    "type": "custom",
    "href": "https://example.com/page1",
    "visitorId": "visitor-123",
    "sessionId": "session-123",
    "extraData": {
      "eventName": "button_click",
      "button": "subscribe",
      "plan": "premium"
    }
  }' | jq '.'
echo -e "\n"

echo "=== Envoi d'un événement identify ==="
curl -s -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId": "test-site",
    "domain": "example.com",
    "type": "identify",
    "href": "https://example.com/page1",
    "visitorId": "visitor-123",
    "sessionId": "session-123",
    "user_id": "user-456",
    "extraData": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }' | jq '.'
echo -e "\n"

echo "=== Envoi d'un événement payment ==="
curl -s -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId": "test-site",
    "domain": "example.com",
    "type": "payment",
    "href": "https://example.com/checkout",
    "visitorId": "visitor-123",
    "sessionId": "session-123",
    "email": "customer@example.com",
    "payment_id": "pay_123456",
    "amount": 99.99,
    "currency": "USD"
  }' | jq '.'
echo -e "\n"

echo "=== Test: Bot détecté ==="
curl -s -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId": "test-site",
    "domain": "example.com",
    "type": "pageview",
    "href": "https://example.com/page1",
    "visitorId": "visitor-123",
    "sessionId": "session-123",
    "userAgent": "HeadlessChrome/1.0"
  }' | jq '.'
echo -e "\n"

echo "=== Test: Identify sans user_id (doit être ignoré) ==="
curl -s -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId": "test-site",
    "domain": "example.com",
    "type": "identify",
    "href": "https://example.com/page1",
    "visitorId": "visitor-123",
    "sessionId": "session-123"
  }' | jq '.'
echo -e "\n"

echo "=== Liste des événements ==="
curl -s "$BASE_URL/events?websiteId=test-site&limit=10" | jq '.'
echo -e "\n"

echo "=== Statistiques ==="
START_DATE=$(date -u -v-30d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "30 days ago" +"%Y-%m-%dT00:00:00Z" 2>/dev/null || echo "2024-01-01T00:00:00Z")
END_DATE=$(date -u +"%Y-%m-%dT23:59:59Z" 2>/dev/null || echo "2024-12-31T23:59:59Z")
curl -s "$BASE_URL/stats?websiteId=test-site&startDate=$START_DATE&endDate=$END_DATE" | jq '.'

