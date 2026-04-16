import type { ProjectInfo, SortDirection, SortField } from "../Types";
import { ProjectRow } from "./ProjectRow";

interface ProjectTableProps {
  projects: ProjectInfo[];
  selectedProjectId?: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onToggleProject: (projectId: string) => void;
  onToggleAll: (selected: boolean) => void;
  onActivateProject: (projectId: string) => void;
  onSort: (field: SortField) => void;
}

export function ProjectTable({
  projects,
  selectedProjectId,
  sortField,
  sortDirection,
  onToggleProject,
  onToggleAll,
  onActivateProject,
  onSort
}: ProjectTableProps) {
  const allSelected = projects.length > 0 && projects.every((project) => project.selected);
  const selectedCount = projects.filter((project) => project.selected).length;

  return (
    <section className="tableShell">
      <div className="tableToolbar">
        <label className="selectAll">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) => onToggleAll(event.target.checked)}
            aria-label="Select or unselect all visible projects"
          />
          <span>Select/Unselect All</span>
        </label>
        <span className="mutedLabel">{selectedCount} selected</span>
      </div>
      <div className="tableScroller">
        <table className="projectTable">
          <thead>
            <tr>
              <th className="checkboxCell">Sel</th>
              <th>
                <button className="sortButton" onClick={() => onSort("name")} type="button">
                  Name {sortField === "name" ? SortGlyph(sortDirection) : ""}
                </button>
              </th>
              <th>
                <button className="sortButton" onClick={() => onSort("version")} type="button">
                  Version {sortField === "version" ? SortGlyph(sortDirection) : ""}
                </button>
              </th>
              <th>
                <button className="sortButton" onClick={() => onSort("fileVersion")} type="button">
                  File Version {sortField === "fileVersion" ? SortGlyph(sortDirection) : ""}
                </button>
              </th>
              <th>
                <button className="sortButton" onClick={() => onSort("assemblyVersion")} type="button">
                  Assembly Version {sortField === "assemblyVersion" ? SortGlyph(sortDirection) : ""}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={5} className="emptyStateCell">
                  No projects match the current filter.
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  isActive={selectedProjectId === project.id}
                  onToggleProject={onToggleProject}
                  onActivate={onActivateProject}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SortGlyph(direction: SortDirection) {
  return direction === "asc" ? "^" : "v";
}
