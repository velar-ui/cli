import { describe, it, expect, vi, beforeEach } from "vitest";
import { Command } from "commander";
import registerListCommand from "../../commands/list.js";
import { ListService } from "../../services/ListService.js";

vi.mock("../../services/ListService.js");
vi.mock("../../utils/logger.js");

describe("list command", () => {
  let program: Command;
  let exitSpy: any;

  beforeEach(() => {
    program = new Command();
    registerListCommand(program);
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
  });

  it("should list components successfully", async () => {
    const mockRegistry = {
      components: [
        { name: "button", description: "A button" },
      ],
    };
    
    // Setup ListService mock as a class
    const mockListService = {
      fetchRegistry: vi.fn().mockResolvedValue(mockRegistry),
      sortComponents: vi.fn().mockReturnValue(mockRegistry.components),
      isComponentInstalled: vi.fn().mockResolvedValue(false),
    };
    vi.mocked(ListService).mockImplementation(function() {
      return mockListService as any;
    } as any);

    await program.parseAsync(["node", "velar", "list"]);

    expect(mockListService.fetchRegistry).toHaveBeenCalled();
    expect(mockListService.sortComponents).toHaveBeenCalled();
    expect(mockListService.isComponentInstalled).toHaveBeenCalledWith(mockRegistry.components[0]);
  });

  it("should show warning if no components found", async () => {
    const { logger } = await import("../../utils/logger.js");
    const mockListService = {
      fetchRegistry: vi.fn().mockResolvedValue({ components: [] }),
    };
    vi.mocked(ListService).mockImplementation(function() {
      return mockListService as any;
    } as any);

    await program.parseAsync(["node", "velar", "list"]);

    expect(logger.warning).toHaveBeenCalledWith("No components found in the registry.");
  });
});
