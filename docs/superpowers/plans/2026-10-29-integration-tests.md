# Integration Tests for Critical Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the most critical business flows (Shipments, Caja, Conversations, MercadoPago) are covered by deterministic integration tests running against a real database.

**Architecture:**

- Use `vitest` with the `TEST_DB=1` pattern.
- Implement a `TestDbHelper` to manage idempotent setup and teardown of test data.
- Each test file will focus on a specific API domain, creating its own necessary leads/orders/conversations to avoid cross-test contamination.

**Tech Stack:** Vitest, Prisma, NextRequest (for API mocking).

**Spec:** Issue #2 - "Completar tests de integración de rutas críticas"

## Global Constraints

- All tests must be gated by `process.env.TEST_DB === "1"`.
- No hardcoded IDs; always create fresh data per test or test suite.
- All tests must be idempotent (cleanup after themselves).

## Review Focus

- **MercadoPago Webhook Idempotency:** Sending the same event twice should not create duplicate orders or double-count payments. (Test in Task 4)
- **Shipment State Transitions:** Ensuring an order cannot move to `DELIVERED` without being `SHIPPED` or `PICKED_UP`. (Test in Task 1)
- **Caja Balance Integrity:** Ensuring a `CLOSE_CASH` operation correctly sums all entries and creates a record without modifying existing entries. (Test in Task 2)
- **Conversation Status Flow:** Moving a conversation to `SHIPPED` should be possible only if a linked shipment exists and is in transit. (Test in Task 3)
- **Payment Order Linkage:** Ensuring a shipment correctly links to its `PaymentOrder` and `Lead`. (Test in Task 1)

---

### Task 1: Shipments API Integration Tests

**Files:**

- Create: `src/app/api/shipments/__tests__/shipments.integration.test.ts`

**Interfaces:**

- Consumes: `/api/shipments` routes.
- Produces: Verified shipment lifecycle.

- [ ] **Step 1: Write tests for Shipment creation and state transitions.**
  - Test: Create shipment $\rightarrow$ verify DB $\rightarrow$ Update to `READY` $\rightarrow$ Update to `PICKED_UP` $\rightarrow$ verify `shippedAt` is set.
- [ ] **Step 2: Write tests for Shipment deletion and constraints.**
  - Test: Attempt to delete shipment linked to a paid order (if constraints exist) or verify soft-delete/hard-delete behavior.
- [ ] **Step 3: Run tests with `TEST_DB=1 npx vitest` and verify PASS.**
- [ ] **Step 4: Commit.**

### Task 2: Caja (Cashier) API Integration Tests

**Files:**

- Create: `src/app/api/caja/__tests__/caja.integration.test.ts`

**Interfaces:**

- Consumes: `/api/caja` routes.
- Produces: Verified cash flow and closing.

- [ ] **Step 1: Write tests for Entry/Exit creation.**
  - Test: Create `INCOME` entry $\rightarrow$ Create `EXPENSE` entry $\rightarrow$ Verify total balance.
- [ ] **Step 2: Write tests for Caja Closing (`close`).**
  - Test: Create multiple entries $\rightarrow$ Call `/api/caja/close` $\rightarrow$ Verify `CajaClose` record matches sum of entries.
- [ ] **Step 3: Run tests with `TEST_DB=1 npx vitest` and verify PASS.**
- [ ] **Step 4: Commit.**

### Task 3: Conversations API Integration Tests

**Files:**

- Create: `src/app/api/conversations/__tests__/conversations.integration.test.ts`

**Interfaces:**

- Consumes: `/api/conversations` routes.
- Produces: Verified conversation state management.

- [ ] **Step 1: Write tests for status updates.**
  - Test: Change status `NEW` $\rightarrow$ `ATTENTION` $\rightarrow$ `AWAITING_PAYMENT` $\rightarrow$ `PAID`.
- [ ] **Step 2: Write tests for bulk status updates.**
  - Test: Update multiple conversations to `CLOSED` and verify count.
- [ ] **Step 3: Run tests with `TEST_DB=1 npx vitest` and verify PASS.**
- [ ] **Step 4: Commit.**

### Task 4: MercadoPago Webhook Integration Tests

**Files:**

- Create: `src/app/api/webhooks/mercadopago/__tests__/mercadopago.integration.test.ts`

**Interfaces:**

- Consumes: `/api/webhooks/mercadopago` route.
- Produces: Verified payment processing and idempotency.

- [ ] **Step 1: Write tests for Payment Approved event.**
  - Test: Send `payment.created` with `status: approved` $\rightarrow$ Verify `PaymentOrder` status becomes `PAID`.
- [ ] **Step 2: Write tests for Idempotency.**
  - Test: Send the same `payment_id` twice $\rightarrow$ Verify only one `PaymentOrder` update occurs and no duplicate logs.
- [ ] **Step 3: Write tests for Payment Rejected event.**
  - Test: Send `status: rejected` $\rightarrow$ Verify `PaymentOrder` status becomes `CANCELLED` or similar.
- [ ] **Step 4: Run tests with `TEST_DB=1 npx vitest` and verify PASS.**
- [ ] **Step 5: Commit.**

### Task 5: Shared Test Helper (Refactor)

**Files:**

- Create: `src/app/api/__tests__/test-utils.ts`

**Interfaces:**

- Produces: `createTestLead`, `createTestOrder`, `createTestConversation` helpers.

- [ ] **Step 1: Extract common setup logic from Tasks 1-4 into a shared utility file.**
- [ ] **Step 2: Update all tests to use the helpers.**
- [ ] **Step 3: Run all integration tests to ensure no regressions.**
- [ ] **Step 4: Commit.**
