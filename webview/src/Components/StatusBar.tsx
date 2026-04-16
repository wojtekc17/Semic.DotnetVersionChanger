import type { OperationStatus, ProjectError, ProjectUpdateResult } from "../Types";

interface StatusBarProps {
  status: OperationStatus;
  message: string;
  projectCount: number;
  selectedCount: number;
  errors: ProjectError[];
  results: ProjectUpdateResult[];
}

export function StatusBar({
  status,
  message,
  projectCount,
  selectedCount,
  errors,
  results
}: StatusBarProps) {
  const latestFailures = results.filter((result) => !result.success).slice(0, 3);

  return (
    <footer className={`statusBar status-${status}`}>
      <div className="statusPrimary">
        <strong>{message || "Ready."}</strong>
        <span>{projectCount} projects</span>
        <span>{selectedCount} selected</span>
      </div>
      <div className="statusSecondary">
        {latestFailures.map((failure) => (
          <span key={failure.projectId} className="statusIssue">
            {failure.path}: {failure.message}
          </span>
        ))}
        {latestFailures.length === 0 &&
          errors.slice(0, 2).map((error) => (
            <span key={`${error.projectPath}-${error.message}`} className="statusIssue">
              {error.projectPath || "Workspace"}: {error.message}
            </span>
          ))}
      </div>
    </footer>
  );
}
