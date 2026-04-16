import * as vscode from "vscode";
import {
  type OptionsState,
  type ProjectError,
  type ProjectInfo,
  type ProjectUpdateResult,
  type UpdateFieldValues,
  type UpdateRequest,
  type UpdateResultPayload,
  type ValidationResult,
  type VersionFieldKey
} from "../Types/SharedTypes";
import { WorkspaceScanner } from "./WorkspaceScanner";
import { CsprojWriter } from "./CsprojWriter";

const StrictVersionPattern = /^\d+(\.\d+){1,3}$/;
const LenientVersionPattern = /^\d+(\.\d+){1,3}([\-+][0-9A-Za-z.-]+)?$/;

export class VersionService {
  public constructor(
    private readonly workspaceScanner: WorkspaceScanner,
    private readonly csprojWriter: CsprojWriter
  ) {}

  public async LoadProjects(
    options: OptionsState,
    previousSelection: ReadonlySet<string>,
    lastSelectedProjectId?: string
  ) {
    return this.workspaceScanner.ScanProjects(options, previousSelection, lastSelectedProjectId);
  }

  public ValidateUpdateRequest(request: UpdateRequest): ValidationResult[] {
    const validations: ValidationResult[] = [];
    const normalizedValues = this.NormalizeUpdateValues(request.values, request.options);

    if (request.projectIds.length === 0) {
      validations.push({
        field: "general",
        isValid: false,
        message: "Select at least one project before updating."
      });
    }

    if (Object.keys(normalizedValues).length === 0) {
      validations.push({
        field: "general",
        isValid: false,
        message: "Fill at least one version field before updating."
      });
    }

    this.ValidateField("version", normalizedValues.version, LenientVersionPattern, "Use a version like 1.2.3 or 1.2.3-beta.", validations);
    this.ValidateField("fileVersion", normalizedValues.fileVersion, StrictVersionPattern, "File Version must be numeric, for example 1.2.3.4.", validations);
    this.ValidateField("assemblyVersion", normalizedValues.assemblyVersion, StrictVersionPattern, "Assembly Version must be numeric, for example 1.2.3.4.", validations);

    return validations;
  }

  public NormalizeUpdateValues(values: UpdateFieldValues, options: OptionsState): UpdateFieldValues {
    const normalizedValues: UpdateFieldValues = {};

    (Object.entries(values) as Array<[VersionFieldKey, string | undefined]>).forEach(([field, value]) => {
      const trimmed = value?.trim();

      if (!trimmed) {
        return;
      }

      normalizedValues[field] = trimmed;
    });

    return normalizedValues;
  }

  public async UpdateProjects(
    request: UpdateRequest,
    currentProjects: ProjectInfo[],
    lastSelectedProjectId?: string
  ): Promise<UpdateResultPayload> {
    const normalizedValues = this.NormalizeUpdateValues(request.values, request.options);
    const results: ProjectUpdateResult[] = [];
    const errors: ProjectError[] = [];
    const selectedProjects = currentProjects.filter((project) => request.projectIds.includes(project.id));

    for (const project of selectedProjects) {
      const result = await this.csprojWriter.UpdateProject(project.path, normalizedValues, request.options);
      results.push(result);

      if (!result.success) {
        errors.push({
          projectPath: result.path,
          message: result.message
        });
      }
    }

    const refreshed = await this.LoadProjects(request.options, new Set(request.projectIds), lastSelectedProjectId);
    const successCount = results.filter((result) => result.success).length;

    return {
      projects: refreshed.projects,
      results,
      errors: [...refreshed.errors, ...errors],
      lastSelectedProjectId: refreshed.lastSelectedProjectId,
      status: successCount === results.length ? "success" : errors.length > 0 ? "error" : "success",
      message: results.length === 0 ? "No projects were updated." : `Updated ${successCount} of ${results.length} selected project(s).`
    };
  }

  public async ConfirmUpdate(options: OptionsState, projectCount: number): Promise<boolean> {
    if (!options.confirmBeforeSave) {
      return true;
    }

    const answer = await vscode.window.showWarningMessage(
      `Update ${projectCount} selected project(s)?`,
      { modal: true },
      "Update"
    );

    return answer === "Update";
  }

  private ValidateField(
    field: VersionFieldKey,
    value: string | undefined,
    pattern: RegExp,
    message: string,
    validations: ValidationResult[]
  ): void {
    if (!value) {
      return;
    }

    if (!pattern.test(value)) {
      validations.push({
        field,
        isValid: false,
        message
      });
    }
  }
}
