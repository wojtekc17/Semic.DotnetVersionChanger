import type { MouseEvent } from "react";
import type { ProjectInfo } from "../Types";

interface ProjectRowProps {
  project: ProjectInfo;
  isActive: boolean;
  onToggleProject: (projectId: string) => void;
  onActivate: (projectId: string) => void;
}

export function ProjectRow({
  project,
  isActive,
  onToggleProject,
  onActivate
}: ProjectRowProps) {
  const handleCheckboxClick = (event: MouseEvent<HTMLInputElement>) => {
    event.stopPropagation();
  };

  return (
    <tr
      className={`projectRow ${project.selected ? "isSelected" : ""} ${isActive ? "isActive" : ""}`}
      onClick={() => {
        onToggleProject(project.id);
        onActivate(project.id);
      }}
    >
      <td className="checkboxCell">
        <input
          type="checkbox"
          checked={project.selected}
          onClick={handleCheckboxClick}
          onChange={() => onToggleProject(project.id)}
          aria-label={`Select ${project.name}`}
        />
      </td>
      <td>
        <div className="projectNameCell">
          <span className="projectName">{project.name}</span>
          <span className="projectMeta">{project.relativePath}</span>
        </div>
      </td>
      <td>{project.versions.version || "—"}</td>
      <td>{project.versions.fileVersion || "—"}</td>
      <td>{project.versions.assemblyVersion || "—"}</td>
    </tr>
  );
}
