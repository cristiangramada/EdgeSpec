import { PresetItem } from '../types';

export const PRESET_OPTIONS: PresetItem[] = [
  {
    id: 'fintech_transfer',
    title: 'Fintech Bank Transfer',
    format: 'user_story',
    badge: 'User Story',
    description: 'Funds transfer between accounts with balance limits and recipient validation.',
    text: `As a verified retail banking user,
I want to transfer funds between $1.00 and $5,000.00 from my checking account to an external recipient via their verified email address,
So that I can pay invoices safely.

Acceptance Criteria:
- Minimum transfer amount is $1.00, maximum is $5,000.00 per transaction.
- Recipient email must be a valid, RFC-compliant email address.
- Transfer memo is optional, up to 140 alphanumeric characters.
- Must require a valid JWT token with 'transfer:write' permission and enforce Idempotency-Key.
- Daily cumulative transfer cap cannot exceed $10,000.00.`,
  },
  {
    id: 'profile_avatar_upload',
    title: 'Avatar Media Upload',
    format: 'api_spec',
    badge: 'REST API',
    description: 'Multipart file upload with MIME whitelist, dimensions, and size caps.',
    text: `POST /api/v2/users/me/avatar
Content-Type: multipart/form-data

Parameters:
- avatarFile: File (required). Max file size: 5,242,880 bytes (5MB). Allowed formats: image/jpeg, image/png, image/webp.
- cropX: integer (min: 0, max: 4096)
- cropY: integer (min: 0, max: 4096)
- cropWidth: integer (min: 50, max: 2048)
- cropHeight: integer (min: 50, max: 2048)
- altText: string (optional, max length: 200 chars)

Security:
- Requires Bearer token. Prevent SVG injection, EXIF GPS leaks, and path traversal in originalFilename.`,
  },
  {
    id: 'discount_coupon_api',
    title: 'Coupon Validation API',
    format: 'json_schema',
    badge: 'JSON Schema',
    description: 'Voucher redemption schema with min/max amounts, uuid, and currency enum.',
    text: `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CouponApplicationRequest",
  "type": "object",
  "required": ["couponCode", "cartSubtotal", "currency"],
  "properties": {
    "couponCode": {
      "type": "string",
      "minLength": 4,
      "maxLength": 20,
      "pattern": "^[A-Z0-9_-]+$"
    },
    "cartSubtotal": {
      "type": "number",
      "minimum": 0.01,
      "maximum": 999999.99
    },
    "currency": {
      "type": "string",
      "enum": ["USD", "EUR", "GBP", "CAD"]
    },
    "userId": {
      "type": "string",
      "format": "uuid"
    },
    "itemsCount": {
      "type": "integer",
      "minimum": 1,
      "maximum": 500
    }
  }
}`,
  },
  {
    id: 'gherkin_checkout',
    title: 'E-Commerce Hold Cart',
    format: 'gherkin',
    badge: 'Gherkin BDD',
    description: 'High-volume inventory reservation and checkout concurrency scenario.',
    text: `Feature: High-Volume Checkout
  Scenario: Customer completes checkout with inventory reservation
    Given a customer with ID "cust_9921" has a cart total of $89.50
    And inventory has 3 units of SKU "SKU-4920" in stock
    When the customer submits checkout with quantity 2
    And provides payment token "tok_visa_4242"
    Then the inventory should decrement to 1 unit
    And a receipt confirmation should be emailed within 30 seconds
    And duplicate submissions within 5 seconds should return HTTP 409 Conflict`,
  },
];
