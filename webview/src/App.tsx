import { useEffect, useMemo, useState } from "react";
import { BottomPanel } from "./Components/BottomPanel";
import { ProjectTable } from "./Components/ProjectTable";
import { StatusBar } from "./Components/StatusBar";
import { UseVsCodeApi } from "./Hooks/UseVsCodeApi";
import { DefaultOptionsState, type ExtensionToWebviewMessage, type OptionsState, type PanelClientState, type ProjectError, type ProjectInfo, type ProjectUpdateResult, type SortDirection, type SortField, type UpdateFieldValues, type UpdateRequest, type ValidationResult } from "./Types";

export function App() {
  const vscode = UseVsCodeApi();
  const persistedState = vscode.getState();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [options, setOptions] = useState<OptionsState>(persistedState?.options ?? DefaultOptionsState);
  const [draftValues, setDraftValues] = useState<UpdateFieldValues>(persistedState?.draftValues ?? {});
  const [lastSelectedProjectId, setLastSelectedProjectId] = useState<string | undefined>(persistedState?.lastSelectedProjectId);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("Ready.");
  const [errors, setErrors] = useState<ProjectError[]>([]);
  const [results, setResults] = useState<ProjectUpdateResult[]>([]);
  const validationResults = useMemo(() => BuildValidationResults(draftValues), [draftValues]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const message = event.data;

      switch (message.type) {
        case "stateChanged":
          setOptions(message.payload.options);
          setDraftValues(message.payload.draftValues);
          setLastSelectedProjectId(message.payload.lastSelectedProjectId);
          break;
        case "busyState":
          setStatus(message.payload.status);
          setStatusMessage(message.payload.message);
          break;
        case "projectsLoaded":
          setProjects(message.payload.projects);
          setDraftValues((currentValues) => BuildDefaultDraftValues(currentValues, message.payload.projects));
          setErrors(message.payload.errors);
          setResults([]);
          setStatus(message.payload.status);
          setStatusMessage(message.payload.message);
          setLastSelectedProjectId(message.payload.lastSelectedProjectId ?? message.payload.projects.find((project) => project.selected)?.id ?? message.payload.projects[0]?.id);
          break;
        case "updateResult":
          setProjects(message.payload.projects);
          setDraftValues((currentValues) => BuildDefaultDraftValues(currentValues, message.payload.projects));
          setErrors(message.payload.errors);
          setResults(message.payload.results);
          setStatus(message.payload.status);
          setStatusMessage(message.payload.message);
          setLastSelectedProjectId(message.payload.lastSelectedProjectId ?? message.payload.projects.find((project) => project.selected)?.id ?? message.payload.projects[0]?.id);
          break;
        case "error":
          setStatus("error");
          setStatusMessage(message.payload.message);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    vscode.postMessage({ type: "ready" });

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [vscode]);

  useEffect(() => {
    const clientState: PanelClientState = {
      projects: projects.map((project) => ({
        id: project.id,
        selected: project.selected
      })),
      options,
      draftValues,
      lastSelectedProjectId
    };

    vscode.setState(clientState);
    vscode.postMessage({
      type: "syncState",
      payload: clientState
    });
  }, [draftValues, lastSelectedProjectId, options, projects, vscode]);

  const filteredProjects = useMemo(() => {
    const loweredFilter = searchTerm.trim().toLowerCase();
    const visibleProjects = projects.filter((project) => {
      if (loweredFilter.length === 0) {
        return true;
      }

      return project.name.toLowerCase().includes(loweredFilter) || project.relativePath.toLowerCase().includes(loweredFilter);
    });

    visibleProjects.sort((left, right) => {
      const leftValue = GetSortableValue(left, sortField);
      const rightValue = GetSortableValue(right, sortField);
      const comparison = leftValue.localeCompare(rightValue, undefined, {
        numeric: true,
        sensitivity: "base"
      });

      return sortDirection === "asc" ? comparison : comparison * -1;
    });

    return visibleProjects;
  }, [projects, searchTerm, sortDirection, sortField]);

  const selectedCount = projects.filter((project) => project.selected).length;
  const isLoading = status === "loading";
  const isSaving = status === "saving";

  const handleToggleProject = (projectId: string) => {
    setProjects((currentProjects) =>
      currentProjects.map((project) => (project.id === projectId ? { ...project, selected: !project.selected } : project))
    );
  };

  const handleToggleAll = (selected: boolean) => {
    const visibleIds = new Set(filteredProjects.map((project) => project.id));

    setProjects((currentProjects) =>
      currentProjects.map((project) => (visibleIds.has(project.id) ? { ...project, selected } : project))
    );
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  };

  const handleRefresh = () => {
    setStatus("loading");
    setStatusMessage("Scanning workspace for .csproj files...");
    vscode.postMessage({ type: "refreshProjects" });
  };

  const handleUpdate = () => {
    if (validationResults.length > 0) {
      setStatus("error");
      setStatusMessage(validationResults.map((result) => result.message).join(" "));
      return;
    }

    const request: UpdateRequest = {
      projectIds: projects.filter((project) => project.selected).map((project) => project.id),
      values: draftValues,
      options
    };

    vscode.postMessage({
      type: "updateProjects",
      payload: request
    });
  };

  const handleOptionToggle = (key: keyof OptionsState) => {
    setOptions((currentOptions) => ({
      ...currentOptions,
      [key]: !currentOptions[key]
    }));
  };

  const handleDraftValueChange = (field: keyof UpdateFieldValues, value: string) => {
    setDraftValues((currentValues) => ({
      ...currentValues,
      [field]: value
    }));
  };

  return (
    <div className="appShell">
      <div className="workspaceLayout">
        <div className="tableColumn">
          <ProjectTable
            projects={filteredProjects}
            selectedProjectId={lastSelectedProjectId}
            sortField={sortField}
            sortDirection={sortDirection}
            onToggleProject={handleToggleProject}
            onToggleAll={handleToggleAll}
            onActivateProject={setLastSelectedProjectId}
            onSort={handleSort}
          />
        </div>
        <BottomPanel
          searchTerm={searchTerm}
          options={options}
          values={draftValues}
          validationResults={validationResults}
          isLoading={isLoading}
          isSaving={isSaving}
          onSearchChange={setSearchTerm}
          onValueChange={handleDraftValueChange}
          onOptionToggle={handleOptionToggle}
          onRefresh={handleRefresh}
          onUpdate={handleUpdate}
        />
      </div>
      <StatusBar
        status={status}
        message={statusMessage}
        projectCount={projects.length}
        selectedCount={selectedCount}
        errors={errors}
        results={results}
      />
    </div>
  );
}

function BuildValidationResults(values: UpdateFieldValues): ValidationResult[] {
  const results: ValidationResult[] = [];
  const strictVersionPattern = /^\d+(\.\d+){1,3}$/;
  const lenientVersionPattern = /^\d+(\.\d+){1,3}([\-+][0-9A-Za-z.-]+)?$/;

  if (values.version && !lenientVersionPattern.test(values.version.trim())) {
    results.push({
      field: "version",
      isValid: false,
      message: "Version should look like 1.2.3 or 1.2.3-beta."
    });
  }

  if (values.assemblyVersion && !strictVersionPattern.test(values.assemblyVersion.trim())) {
    results.push({
      field: "assemblyVersion",
      isValid: false,
      message: "Assembly Version should look like 1.2.3.4."
    });
  }

  if (values.fileVersion && !strictVersionPattern.test(values.fileVersion.trim())) {
    results.push({
      field: "fileVersion",
      isValid: false,
      message: "File Version should look like 1.2.3.4."
    });
  }

  return results;
}

function GetSortableValue(project: ProjectInfo, field: SortField): string {
  switch (field) {
    case "name":
      return project.name;
    case "version":
      return project.versions.version;
    case "fileVersion":
      return project.versions.fileVersion;
    case "assemblyVersion":
      return project.versions.assemblyVersion;
  }
}

function BuildDefaultDraftValues(currentValues: UpdateFieldValues, projects: ProjectInfo[]): UpdateFieldValues {
  return {
    version: currentValues.version?.trim() ? currentValues.version : GetMaxProjectVersion(projects, "version"),
    fileVersion: currentValues.fileVersion?.trim() ? currentValues.fileVersion : GetMaxProjectVersion(projects, "fileVersion"),
    assemblyVersion: currentValues.assemblyVersion?.trim() ? currentValues.assemblyVersion : GetMaxProjectVersion(projects, "assemblyVersion")
  };
}

function GetMaxProjectVersion(projects: ProjectInfo[], field: "version" | "fileVersion" | "assemblyVersion"): string {
  return projects
    .map((project) => project.versions[field].trim())
    .filter((value) => value.length > 0)
    .sort(CompareVersionStrings)
    .at(-1) ?? "";
}

function CompareVersionStrings(left: string, right: string): number {
  const leftParts = TokenizeVersion(left);
  const rightParts = TokenizeVersion(right);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (typeof leftPart === "number" && typeof rightPart === "number" && leftPart !== rightPart) {
      return leftPart - rightPart;
    }

    const textComparison = String(leftPart).localeCompare(String(rightPart), undefined, {
      numeric: true,
      sensitivity: "base"
    });

    if (textComparison !== 0) {
      return textComparison;
    }
  }

  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function TokenizeVersion(version: string): Array<number | string> {
  return version
    .split(/[\.\-\+]/)
    .filter((part) => part.length > 0)
    .map((part) => {
      const numericValue = Number(part);
      return Number.isNaN(numericValue) ? part : numericValue;
    });
}
