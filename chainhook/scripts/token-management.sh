#!/bin/bash

# Token Generation and Management Script
# Generates and manages metrics authentication tokens securely

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

show_help() {
  cat << EOF
Chainhook Metrics Token Management Script

Usage: $0 <command> [options]

Commands:
  generate              Generate a new random token
  validate <token>      Validate token format
  rotate                Rotate token in environment
  store <token>         Store token in secure location
  retrieve              Retrieve stored token
  test <url> <token>    Test metrics endpoint with token
  help                  Show this help message

Examples:
  $0 generate
  $0 validate "abc123def456..."
  $0 test http://localhost:3100 "abc123def456..."

EOF
}

# Generate secure random token
generate_token() {
  echo -e "${BLUE}Generating new secure token...${NC}"
  
  # Generate 32 bytes of random data, base64 encoded
  TOKEN=$(openssl rand -base64 32)
  
  echo -e "${GREEN}✓ Token generated${NC}"
  echo ""
  echo "Token (copy and save securely):"
  echo "$TOKEN"
  echo ""
  echo "Token length: ${#TOKEN} characters"
  echo ""
  echo "Next steps:"
  echo "1. Store token in secure vault (Vault, Secrets Manager, etc.)"
  echo "2. Update application environment: METRICS_AUTH_TOKEN=$TOKEN"
  echo "3. Restart service: systemctl restart chainhook"
  echo "4. Test with: $0 test http://localhost:3100 \"$TOKEN\""
  
  return 0
}

# Validate token format
validate_token() {
  local token="$1"
  
  if [ -z "$token" ]; then
    echo -e "${RED}✗ No token provided${NC}"
    return 1
  fi
  
  echo -e "${BLUE}Validating token format...${NC}"
  echo ""
  
  # Check if token is base64-like
  if [[ "$token" =~ ^[A-Za-z0-9+/=]+$ ]]; then
    echo -e "${GREEN}✓ Token contains valid base64 characters${NC}"
  else
    echo -e "${RED}✗ Token contains invalid characters${NC}"
    return 1
  fi
  
  # Check token length (minimum 32 bytes base64 ≈ 43 characters)
  if [ ${#token} -ge 40 ]; then
    echo -e "${GREEN}✓ Token length is acceptable (${#token} characters)${NC}"
  else
    echo -e "${RED}✗ Token is too short (${#token} characters, minimum 40 recommended)${NC}"
    return 1
  fi
  
  # Try to decode
  if echo "$token" | base64 -d > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Token can be decoded as base64${NC}"
    DECODED_LEN=$(echo "$token" | base64 -d | wc -c)
    echo "  Decoded length: $DECODED_LEN bytes"
  else
    echo -e "${YELLOW}⚠ Token does not appear to be base64-encoded${NC}"
  fi
  
  echo ""
  echo -e "${GREEN}✓ Token validation passed${NC}"
  return 0
}

# Rotate token
rotate_token() {
  echo -e "${BLUE}Rotating metrics token...${NC}"
  echo ""
  
  # Generate new token
  NEW_TOKEN=$(openssl rand -base64 32)
  
  # Get old token
  OLD_TOKEN="${METRICS_AUTH_TOKEN:-}"
  
  echo "Old token: ${OLD_TOKEN:0:10}..."
  echo "New token: ${NEW_TOKEN:0:10}..."
  echo ""
  
  # Show next steps
  echo "Next steps to complete rotation:"
  echo "1. Update environment variable:"
  echo "   export METRICS_AUTH_TOKEN=\"$NEW_TOKEN\""
  echo ""
  echo "2. Update all monitoring systems:"
  echo "   - Prometheus configuration"
  echo "   - Grafana data sources"
  echo "   - Custom monitoring scripts"
  echo ""
  echo "3. Restart service:"
  echo "   systemctl restart chainhook"
  echo ""
  echo "4. Verify all systems are working:"
  echo "   $0 test http://localhost:3100 \"$NEW_TOKEN\""
  echo ""
  echo "5. Log rotation in audit:"
  echo "   echo '\$(date -u) - Token rotated' >> /var/log/chainhook-audit.log"
}

# Store token securely
store_token() {
  local token="$1"
  
  if [ -z "$token" ]; then
    echo -e "${RED}✗ No token provided${NC}"
    echo "Usage: $0 store <token>"
    return 1
  fi
  
  echo -e "${BLUE}Storing token securely...${NC}"
  echo ""
  echo "Supported storage methods:"
  echo ""
  echo "1. Vault:"
  echo "   vault kv put secret/chainhook/metrics METRICS_AUTH_TOKEN=\"$token\""
  echo ""
  echo "2. AWS Secrets Manager:"
  echo "   aws secretsmanager create-secret --name chainhook/metrics-token --secret-string '$token'"
  echo ""
  echo "3. Environment file:"
  echo "   echo \"METRICS_AUTH_TOKEN=$token\" > /etc/chainhook/.env.production"
  echo "   chmod 600 /etc/chainhook/.env.production"
  echo ""
  echo "4. Kubernetes Secret:"
  echo "   kubectl create secret generic chainhook-metrics --from-literal=METRICS_AUTH_TOKEN='$token'"
  echo ""
  echo "⚠ Never commit tokens to version control!"
}

# Test metrics endpoint
test_endpoint() {
  local url="$1"
  local token="$2"
  
  if [ -z "$url" ] || [ -z "$token" ]; then
    echo -e "${RED}✗ Missing parameters${NC}"
    echo "Usage: $0 test <url> <token>"
    echo "Example: $0 test http://localhost:3100 \"abc123...\""
    return 1
  fi
  
  echo -e "${BLUE}Testing metrics endpoint...${NC}"
  echo "URL: $url"
  echo ""
  
  # Test without token
  echo -n "Test 1: Request without token... "
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url/metrics")
  if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}PASS (401)${NC}"
  elif [ "$HTTP_CODE" = "200" ]; then
    echo -e "${YELLOW}WARN (200 - metrics are open)${NC}"
  else
    echo -e "${RED}FAIL ($HTTP_CODE)${NC}"
  fi
  echo ""
  
  # Test with token
  echo -n "Test 2: Request with valid token... "
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $token" "$url/metrics")
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}PASS (200)${NC}"
  else
    echo -e "${RED}FAIL ($HTTP_CODE)${NC}"
  fi
  echo ""
  
  # Test with invalid token
  echo -n "Test 3: Request with invalid token... "
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer invalid-token" "$url/metrics")
  if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}PASS (401)${NC}"
  else
    echo -e "${RED}FAIL ($HTTP_CODE)${NC}"
  fi
  echo ""
  
  # Get metrics
  echo -n "Test 4: Retrieving metrics data... "
  RESPONSE=$(curl -s -H "Authorization: Bearer $token" "$url/metrics")
  if echo "$RESPONSE" | jq . > /dev/null 2>&1; then
    echo -e "${GREEN}PASS (valid JSON)${NC}"
    echo ""
    echo "Metrics preview:"
    echo "$RESPONSE" | jq '.' | head -15
  else
    echo -e "${RED}FAIL (invalid JSON)${NC}"
  fi
}

# Main
if [ $# -eq 0 ]; then
  show_help
  exit 0
fi

COMMAND="$1"
shift

case "$COMMAND" in
  generate)
    generate_token
    ;;
  validate)
    validate_token "$@"
    ;;
  rotate)
    rotate_token
    ;;
  store)
    store_token "$@"
    ;;
  test)
    test_endpoint "$@"
    ;;
  help|-h|--help)
    show_help
    ;;
  *)
    echo -e "${RED}✗ Unknown command: $COMMAND${NC}"
    show_help
    exit 1
    ;;
esac
