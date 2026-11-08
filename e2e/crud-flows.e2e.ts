import { test, expect } from "@playwright/test";

test.describe("Flujo de Lead → Orden de Pago → Envío", () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada test
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@erp.local");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("Crear lead y verificar en lista", async ({ page }) => {
    // Navegar a leads
    await page.goto("/leads");

    // Verificar que la página cargó
    await expect(page.locator("h1")).toContainText("Leads");

    // Buscar lead de prueba
    await page.fill('[placeholder*="Buscar"]', "5512345678");

    // Verificar resultados
    await expect(page.locator('[data-testid="lead-row"]')).toBeVisible({ timeout: 5000 });
  });

  test("Crear orden de pago desde conversación", async ({ page }) => {
    // Navegar a conversaciones
    await page.goto("/conversaciones");

    // Seleccionar una conversación
    const conversation = await page.locator('[data-testid="conversation-row"]').first();
    await conversation.click();

    // Verificar detalle de conversación
    await expect(page.locator('[data-testid="conversation-detail"]')).toBeVisible();

    // Hacer clic en "Crear orden de pago"
    await page.click("text=Crear orden de pago");

    // Completar formulario
    await page.fill('[name="amount"]', "1500");
    await page.selectOption('[name="provider"]', "TRANSFER");
    await page.click("text=Crear orden");

    // Verificar redirección o mensaje de éxito
    await page.waitForSelector('[data-testid="payment-order-confirmation"]', { timeout: 5000 });
  });

  test("Crear envío desde orden de pago", async ({ page }) => {
    // Necesitaríamos una orden de pago existente
    // Este test asume que hay datos de seed
    await page.goto("/shipments");

    // Verificar que la página cargó
    await expect(page.locator("h1")).toContainText(/envío|shipment/i);

    // Intentar crear envío
    await page.click("text=Crear envío");

    // Verificar formulario
    await expect(page.locator('[name="paymentOrderId"]')).toBeVisible();
  });
});

test.describe("Autenticación", () => {
  test("Login con credenciales válidas", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "admin@erp.local");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/dashboard");
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test("Login con credenciales inválidas", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "admin@wrong.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="alert"]')).toContainText("credenciales");
  });
});

test.describe("Estado del Sistema", () => {
  test("Verificar panel de estado", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@erp.local");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // Navegar a configuración
    await page.goto("/config");

    // Verificar tab de estado del sistema
    await page.click("text=Estado del Sistema");

    // Verificar componentes
    await expect(page.locator('[data-testid="whatsapp-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="db-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="workers-status"]')).toBeVisible();
  });
});
