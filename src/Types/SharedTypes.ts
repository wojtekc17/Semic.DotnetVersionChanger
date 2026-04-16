export type VersionFieldKey = "version" | "fileVersion" | "assemblyVersion";

export type ProjectKind = "sdk-style" | "legacy" | "maui" | "xamarin" | "unknown";
export type OperationStatus = "idle" | "loading" | "saving" | "success" | "error";
export type SortField = "name" | "version" | "fileVersion" | "assemblyVersion";
export type SortDirection = "asc" | "desc";

export interface ProjectVersionInfo {
  version: string;
  assemblyVersion: string;
  fileVersion: string;
  applicationDisplayVersion: string;
  applicationVersion: string;
  informationalVersion: string;
  packageVersion: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  directoryName: string;
  selected: boolean;
  projectKind: ProjectKind;
  versions: ProjectVersionInfo;
}

export interface UpdateFieldValues {
  version?: string;
  assemblyVersion?: string;
  fileVersion?: string;
  applicationDisplayVersion?: string;
  applicationVersion?: string;
  informationalVersion?: string;
  packageVersion?: string;
}

export interface OptionsState {
  createMissingTags: boolean;
  updateDuplicateEntries: boolean;
  confirmBeforeSave: boolean;
  preserveFormatting: boolean;
  backupBeforeSave: boolean;
  defaultSelectAllAfterRefresh: boolean;
}

export interface ValidationResult {
  field: VersionFieldKey | "general";
  isValid: boolean;
  message: string;
}

export interface UpdateRequest {
  projectIds: string[];
  values: UpdateFieldValues;
  options: OptionsState;
}

export interface ProjectError {
  projectPath: string;
  message: string;
}

export interface ProjectUpdateResult {
  projectId: string;
  path: string;
  success: boolean;
  message: string;
  backupPath?: string;
  updatedFields: VersionFieldKey[];
}

export interface ProjectsLoadedPayload {
  projects: ProjectInfo[];
  errors: ProjectError[];
  lastSelectedProjectId?: string;
  status: OperationStatus;
  message: string;
}

export interface UpdateResultPayload {
  projects: ProjectInfo[];
  results: ProjectUpdateResult[];
  errors: ProjectError[];
  lastSelectedProjectId?: string;
  status: OperationStatus;
  message: string;
}

export interface BusyStatePayload {
  status: OperationStatus;
  message: string;
}

export interface ErrorPayload {
  message: string;
  details?: string;
}

export interface PanelClientState {
  projects: Pick<ProjectInfo, "id" | "selected">[];
  options: OptionsState;
  draftValues: UpdateFieldValues;
  lastSelectedProjectId?: string;
}

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "loadProjects" }
  | { type: "refreshProjects" }
  | { type: "updateProjects"; payload: UpdateRequest }
  | { type: "syncState"; payload: PanelClientState };

export type ExtensionToWebviewMessage =
  | { type: "busyState"; payload: BusyStatePayload }
  | { type: "projectsLoaded"; payload: ProjectsLoadedPayload }
  | { type: "updateResult"; payload: UpdateResultPayload }
  | { type: "stateChanged"; payload: PanelClientState }
  | { type: "error"; payload: ErrorPayload };

export const DefaultProjectVersionInfo: ProjectVersionInfo = {
  version: "",
  assemblyVersion: "",
  fileVersion: "",
  applicationDisplayVersion: "",
  applicationVersion: "",
  informationalVersion: "",
  packageVersion: ""
};

export const DefaultOptionsState: OptionsState = {
  createMissingTags: true,
  updateDuplicateEntries: false,
  confirmBeforeSave: true,
  preserveFormatting: true,
  backupBeforeSave: false,
  defaultSelectAllAfterRefresh: false
};

export const VersionFieldLabels: Record<VersionFieldKey, string> = {
  version: "Version",
  fileVersion: "File Version",
  assemblyVersion: "Assembly Version"
};

export const VersionFieldTagMap: Record<VersionFieldKey, string> = {
  version: "Version",
  fileVersion: "FileVersion",
  assemblyVersion: "AssemblyVersion"
};
