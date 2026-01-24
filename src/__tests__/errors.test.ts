import { describe, it, expect } from "vitest";
import { RegistryError, NetworkError, ComponentNotFoundError } from "../errors/errors.js";

describe("errors", () => {
  it("RegistryError should store message and cause", () => {
    const cause = new Error("cause");
    const error = new RegistryError("message", cause);
    expect(error.message).toBe("message");
    expect(error.cause).toBe(cause);
    expect(error.name).toBe("RegistryError");
  });

  it("NetworkError should have correct name", () => {
    const error = new NetworkError("network error");
    expect(error.name).toBe("NetworkError");
    expect(error.message).toBe("network error");
  });

  it("ComponentNotFoundError should format message correctly", () => {
    const error = new ComponentNotFoundError("my-comp");
    expect(error.name).toBe("ComponentNotFoundError");
    expect(error.message).toBe('Component "my-comp" not found');
  });
});
