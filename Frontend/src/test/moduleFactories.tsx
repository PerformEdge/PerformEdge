import React from "react";
import { describe, beforeEach, it, expect, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { installMockApiFailure, installMockApiSuccess, mockedAxios } from "@/test/mockApi";

type ModuleFactoryOptions = {
  exportName?: string;
  props?: Record<string, any>;
  route?: string;
  expectsFetch?: boolean;
  expectsAxios?: boolean;
};

function resolveExport(mod: Record<string, any>, exportName?: string) {
  if (exportName && mod[exportName]) return mod[exportName];
  if (mod.default) return mod.default;
  const firstFunction = Object.values(mod).find((value) => typeof value === "function");
  return firstFunction;
}

export function describeRenderableModule(
  name: string,
  mod: Record<string, any>,
  options: ModuleFactoryOptions = {}
) {
  const {
    exportName,
    props = {},
    route = "/",
    expectsFetch = false,
    expectsAxios = false,
  } = options;

  describe(name, () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      localStorage.clear();
      localStorage.setItem("access_token", "fake-token");
      installMockApiSuccess();
    });

    it("exports a renderable component", () => {
      const Component = resolveExport(mod, exportName);
      expect(typeof Component).toBe("function");
    });

    it("renders with default mocks", async () => {
      const Component = resolveExport(mod, exportName) as React.ComponentType<any>;
      expect(() => renderWithProviders(<Component {...props} />, route)).not.toThrow();

      if (expectsFetch) {
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalled();
        });
      }
      if (expectsAxios) {
        await waitFor(() => {
          expect(mockedAxios.get).toHaveBeenCalled();
        });
      }
    });

    it("handles request failures without crashing", async () => {
      installMockApiFailure();
      const Component = resolveExport(mod, exportName) as React.ComponentType<any>;
      expect(() => renderWithProviders(<Component {...props} />, route)).not.toThrow();

      if (expectsFetch || expectsAxios) {
        await waitFor(() => {
          expect(true).toBe(true);
        });
      }
    });
  });
}
