// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginForm from "@/components/LoginForm";

afterEach(cleanup);

describe("LoginForm", () => {
  it("renders a GitHub sign-in submit button inside a form", () => {
    const { container } = render(<LoginForm action={vi.fn()} />);
    const button = screen.getByRole("button", { name: "GitHub로 로그인" });
    expect(button).toHaveAttribute("type", "submit");
    expect(container.querySelector("form")).toContainElement(button);
  });
});
