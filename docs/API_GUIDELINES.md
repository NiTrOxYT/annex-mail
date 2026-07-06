# Annex Mail — API Implementation Guidelines

This guide standardizes the structure, validation parameters, and error processing loops for Annex Mail API endpoints.

## Request Validation
- Every API endpoint that handles incoming user data (via query strings or JSON bodies) must validate the inputs using a **Zod Schema**.
- Throw a `ValidationError` when input validation fails, which outputs a structured `400 Bad Request` payload.

## Response Formatting

All endpoints must return responses following one of these two structures:

### 1. Success Payload
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "name": "Sourik",
    "email": "sourik@annex-consultancy.com"
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120
  }
}
```

### 2. Failure Payload
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please enter a valid email address",
    "details": {
      "email": "Invalid email address format"
    }
  }
}
```

## Error Processing Loop
All route handlers should intercept exceptions and format them using the centralized `ApiResponse.failure(error)` helper:
```typescript
import { ApiResponse } from "@/utils/api";
import { NotFoundError } from "@/utils/errors";

export async function GET(request: Request) {
  try {
    const item = await findItem();
    if (!item) {
      throw new NotFoundError("Item not found");
    }
    return ApiResponse.success(item);
  } catch (error) {
    return ApiResponse.failure(error);
  }
}
```
