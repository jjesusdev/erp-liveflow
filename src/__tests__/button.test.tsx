import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders children text", () => {
    render(<Button>Hola</Button>);
    expect(screen.getByRole("button", { name: /hola/i })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Disabled
      </Button>
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies variant class", () => {
    render(<Button variant="destructive">Del</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-destructive");
  });

  it("applies size class", () => {
    render(<Button size="sm">Sm</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("h-7");
  });

  it("forwards aria-label", () => {
    render(<Button aria-label="Cerrar">X</Button>);
    expect(screen.getByRole("button", { name: /cerrar/i })).toBeInTheDocument();
  });
});
