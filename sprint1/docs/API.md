# API v1

Base: `/api/v1`

## Public
- GET /stores/{merchantSlug}/branches
- GET /branches/{branchSlug}/menu
- POST /branches/{branchId}/orders
- POST /orders/{orderId}/payment-session
- GET /orders/{publicNumber}

## Merchant
- POST /auth/login
- GET /auth/me
- GET /merchant/branches
- GET /merchant/orders
- POST /merchant/orders/{id}/accept
- POST /merchant/orders/{id}/start
- POST /merchant/orders/{id}/ready
- POST /merchant/orders/{id}/complete
- GET /merchant/products
- POST /merchant/products
- PATCH /merchant/products/{id}

## Menu import
- POST /merchant/menu-imports
- GET /merchant/menu-imports/{id}
- PATCH /merchant/menu-imports/{id}/items/{itemId}
- POST /merchant/menu-imports/{id}/publish

## Payments
- POST /webhooks/payments/{provider}

## Admin
- POST /admin/merchants
- POST /admin/merchants/{merchantId}/branches
- GET /admin/orders
- GET /admin/payment-events
- GET /admin/settlements
