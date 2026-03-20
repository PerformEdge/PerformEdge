import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { ThemeProvider } from "@/context/theme";

export function renderWithProviders(ui: React.ReactElement, route = "/") {
  return render(
    <ThemeProvider defaultTheme="dark">
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </ThemeProvider>
  );
}
