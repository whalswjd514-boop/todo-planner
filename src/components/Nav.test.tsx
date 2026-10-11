// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Nav from "@/components/Nav";

const pathname = vi.fn<() => string>();
vi.mock("next/navigation", () => ({ usePathname: () => pathname() }));

afterEach(cleanup);

async function activeLabels(path: string) {
  pathname.mockReturnValue(path);
  render(<Nav />);
  await screen.findByRole("link", { name: "주간 계획" });
  return screen
    .getAllByRole("link")
    .filter((a) => a.getAttribute("aria-current") === "page")
    .map((a) => a.textContent);
}

describe("Nav active state", () => {
  it.each([
    ["/", "대시보드"],
    ["/week/2026-10-05", "주간 계획"],
    ["/goals", "1년 목표"],
  ])("marks only the current page at %s", async (path, label) => {
    expect(await activeLabels(path)).toEqual([label]);
  });

  it("renders nothing on the login page and shows the footer elsewhere", () => {
    pathname.mockReturnValue("/login");
    const { container, unmount } = render(<Nav footer={<span>사용자 메뉴</span>} />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    pathname.mockReturnValue("/");
    render(<Nav footer={<span>사용자 메뉴</span>} />);
    expect(screen.getByText("사용자 메뉴")).toBeInTheDocument();
  });

  it("styles the active link bold with a distinct color, and others normal", async () => {
    await activeLabels("/goals");
    const active = screen.getByRole("link", { name: "1년 목표" });
    const other = screen.getByRole("link", { name: "대시보드" });
    expect(active.className).toContain("font-bold");
    expect(active.className).toContain("text-sky-300");
    expect(other.className).toContain("font-normal");
    expect(other.className).not.toContain("text-sky-300");
    await waitFor(() => expect(screen.getByRole("navigation", { name: "주 메뉴" })).toBeInTheDocument());
  });
});
