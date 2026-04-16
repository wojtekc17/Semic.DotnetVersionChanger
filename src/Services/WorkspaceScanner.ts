import * as vscode from "vscode";
import { type OptionsState, type ProjectInfo, type ProjectsLoadedPayload } from "../Types/SharedTypes";
import { CsprojReader } from "./CsprojReader";

const CsprojExcludeGlob = "**/{bin,obj,node_modules,.git,.vs}/**";
const ScanBatchSize = 30;

export class WorkspaceScanner {
  public constructor(private readonly csprojReader: CsprojReader) {}

  public async ScanProjects(
    options: OptionsState,
    previousSelection: ReadonlySet<string>,
    lastSelectedProjectId?: string
  ): Promise<ProjectsLoadedPayload> {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      return {
        projects: [],
        errors: [
          {
            projectPath: "",
            message: "Open a workspace or folder before scanning for .csproj files."
          }
        ],
        lastSelectedProjectId,
        status: "error",
        message: "No workspace is open."
      };
    }

    const projectUris = await vscode.workspace.findFiles("**/*.csproj", CsprojExcludeGlob);
    const projects: ProjectInfo[] = [];
    const errors: ProjectsLoadedPayload["errors"] = [];

    for (let index = 0; index < projectUris.length; index += ScanBatchSize) {
      const batch = projectUris.slice(index, index + ScanBatchSize);
      const results = await Promise.all(batch.map((projectUri) => this.csprojReader.ReadProject(projectUri)));

      results.forEach((result) => {
        if (result.project) {
          projects.push({
            ...result.project,
            selected: options.defaultSelectAllAfterRefresh || previousSelection.has(result.project.id)
          });
        }

        if (result.error) {
          errors.push(result.error);
        }
      });

      await YieldToEventLoop();
    }

    projects.sort((left, right) => left.relativePath.localeCompare(right.relativePath, undefined, { sensitivity: "base" }));

    return {
      projects,
      errors,
      lastSelectedProjectId,
      status: errors.length > 0 && projects.length === 0 ? "error" : "success",
      message:
        projects.length === 0
          ? "No .csproj files were found in the current workspace."
          : `Loaded ${projects.length} project(s).`
    };
  }
}

function YieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
