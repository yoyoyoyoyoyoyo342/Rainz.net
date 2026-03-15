import { describe, it, expect, beforeEach } from "vitest";

// Mock localStorage before importing module
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  get length() { return Object.keys(mockStorage).length; },
  key: (index: number) => Object.keys(mockStorage)[index] ?? null,
};

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("queryClient", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("should export queryClient with correct defaults", async () => {
    const { queryClient } = await import("../queryClient");
    const defaults = queryClient.getDefaultOptions();

    expect(defaults.queries?.staleTime).toBe(1000 * 60 * 5); // 5 min
    expect(defaults.queries?.gcTime).toBe(1000 * 60 * 60 * 24); // 24 hours
    expect(defaults.queries?.retry).toBe(1);
    expect(defaults.mutations?.retry).toBe(false);
  });

  it("should export a queryPersister that writes to localStorage", async () => {
    const { queryPersister } = await import("../queryClient");

    expect(queryPersister).toBeDefined();
    expect(typeof queryPersister.persistClient).toBe("function");
    expect(typeof queryPersister.restoreClient).toBe("function");
    expect(typeof queryPersister.removeClient).toBe("function");
  });

  it("persister writes data to localStorage under the correct key", async () => {
    const { queryPersister } = await import("../queryClient");

    const mockState = {
      timestamp: Date.now(),
      clientState: { queries: [], mutations: [] },
      buster: "",
    };

    await queryPersister.persistClient(mockState as any);

    // Verify data was written to localStorage under the correct key
    const stored = localStorageMock.getItem("rainz-query-cache");
    expect(stored).toBeDefined();
    expect(stored).toContain("clientState");
  });

  it("gcTime is long enough to survive between sessions (>= 12 hours)", async () => {
    const { queryClient } = await import("../queryClient");
    const gcTime = queryClient.getDefaultOptions().queries?.gcTime ?? 0;
    expect(gcTime).toBeGreaterThanOrEqual(1000 * 60 * 60 * 12);
  });
});
