import { test, expect } from "@playwright/test";

test.describe("Flujo de Lead → Orden de Pago → Envío", () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada test
    await page.goto("/login");
    await page.fill('[data-testid="login-email"]', "admin@erp.local");
    await page.fill('[data-testid="login-password"]', "admin123");
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL("**/config", { timeout: 10000 });
  });

  test("Login con credenciales válidas", async ({ page }) => {
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test("Verificar panel de estado del sistema", async ({ page }) => {
    // Navegar a configuración (ya estamos allí tras el login)
    await page.goto("/config");

    // Hacer clic en la pestaña Estado del Sistema
    await page.click("text=Estado del Sistema");

    // Verificar componentes de estado
    await expect(page.locator('[data-testid="whatsapp-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="db-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="workers-status"]')).toBeVisible();
  });

  test("Login con credenciales inválidas", async ({ page }) => {
    await page.goto("/login");
    await page.fill('[data-testid="login-email"]', "admin@wrong.com");
    await page.fill('[data-testid="login-password"]', "wrongpassword");
    await page.click('[data-testid="login-submit"]');

    await expect(page.locator('[role="alert"]')).toContainText("credenciales");
  });
});

test.describe("Leads", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('[data-testid="login-email"]', "admin@erp.local");
    await page.fill('[data-testid="login-password"]', "admin123");
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL("**/config");
  });

  test("Verificar lista de leads", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.locator("h1")).toContainText("Clientas");
  });
});

test.describe("Envíos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('[data-testid="login-email"]', "admin@erp.local");
    await page.fill('[data-testid="login-password"]', "admin123");
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL("**/config");
  });

  test("Verificar página de envíos", async ({ page }) => {
    await page.goto("/shipments");
    await expect(page.locator("h1")).toContainText(/envío|shipment/i);
  });
});
