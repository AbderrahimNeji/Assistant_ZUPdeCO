import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { MessageMarkdown } from "@/features/chat/components/message-markdown";

describe("MessageMarkdown", () => {
  it("renders markdown content", () => {
    render(<MessageMarkdown content="**Hello** world" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
