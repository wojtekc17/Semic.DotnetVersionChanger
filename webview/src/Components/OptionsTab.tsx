import type { OptionsState, WorkspaceSettingsState } from "../Types";

interface OptionsTabProps {
  options: OptionsState;
  workspaceSettings: WorkspaceSettingsState;
  onToggle: (key: keyof OptionsState) => void;
  onUseAllProjectsChange: (useAllProjects: boolean) => void;
  onWorkspaceSolutionChange: (solutionPath: string) => void;
}

const OptionDefinitions: Array<{ key: keyof OptionsState; label: string; description: string }> = [
  {
    key: "createMissingTags",
    label: "Create missing version tags automatically",
    description: "Adds version tags into a suitable PropertyGroup when they are missing."
  },
  {
    key: "updateDuplicateEntries",
    label: "Update all duplicate entries for a given property",
    description: "If disabled, only the first matching property is updated."
  },
  {
    key: "confirmBeforeSave",
    label: "Confirm before save",
    description: "Shows a confirmation dialog before writing changes."
  },
  {
    key: "preserveFormatting",
    label: "Preserve formatting as much as possible",
    description: "Keeps line endings and re-formats XML consistently after save."
  },
  {
    key: "backupBeforeSave",
    label: "Backup file before save",
    description: "Creates a .bak copy next to the original project file."
  },
  {
    key: "defaultSelectAllAfterRefresh",
    label: "Default select all after refresh",
    description: "Marks all scanned projects as selected after every refresh."
  }
];

export function OptionsTab({ options, workspaceSettings, onToggle, onUseAllProjectsChange, onWorkspaceSolutionChange }: OptionsTabProps) {
  return (
    <>
      <section className="sideCard">
        <div className="cardHeader">
          <h3>Workspace</h3>
        </div>
        <div className="optionsGrid">
          <label className="optionRow">
            <input type="checkbox" checked={workspaceSettings.useAllProjects} onChange={(event) => onUseAllProjectsChange(event.target.checked)} />
            <div>
              <span>Use all .csproj projects</span>
              <small>When enabled, projects are loaded from every .csproj in the workspace instead of a solution file.</small>
            </div>
          </label>
          <div className="workspaceOptionRow">
            <label className="fieldControl">
              <span>Solution</span>
              <select
                className="textInput"
                value={workspaceSettings.solutionPath}
                onChange={(event) => onWorkspaceSolutionChange(event.target.value)}
                disabled={workspaceSettings.useAllProjects || workspaceSettings.availableSolutions.length === 0}
              >
                {workspaceSettings.availableSolutions.length === 0 ? (
                  <option value="">No .sln or .slnx found</option>
                ) : (
                  workspaceSettings.availableSolutions.map((solutionPath) => (
                    <option key={solutionPath} value={solutionPath}>
                      {solutionPath}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>
        </div>
      </section>
      <section className="sideCard">
        <div className="cardHeader">
          <h3>Options</h3>
        </div>
        <div className="optionsGrid">
          {OptionDefinitions.map((option) => (
            <label key={option.key} className="optionRow">
              <input type="checkbox" checked={options[option.key]} onChange={() => onToggle(option.key)} />
              <div>
                <span>{option.label}</span>
                <small>{option.description}</small>
              </div>
            </label>
          ))}
        </div>
      </section>
    </>
  );
}
