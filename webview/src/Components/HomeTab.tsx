import { VersionFieldLabels, type UpdateFieldValues, type ValidationResult, type VersionFieldKey } from "../Types";

interface HomeTabProps {
  values: UpdateFieldValues;
  validationResults: ValidationResult[];
  selectedCount: number;
  isLoading: boolean;
  isSaving: boolean;
  onChange: (field: VersionFieldKey, value: string) => void;
  onUpdate: () => void;
}

const FieldOrder: VersionFieldKey[] = ["version", "fileVersion", "assemblyVersion"];

export function HomeTab({
  values,
  validationResults,
  selectedCount,
  isLoading,
  isSaving,
  onChange,
  onUpdate
}: HomeTabProps) {
  const canUpdate = selectedCount > 0 && !isLoading && !isSaving;

  return (
    <section className="sideCard">
      <div className="cardHeader">
        <div className="titleRow">
          <h3>Bulk Update</h3>
        </div>
        <div className="buttonRow">
          <button className="primaryButton" type="button" onClick={onUpdate} disabled={!canUpdate}>
            {isSaving ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
      {selectedCount === 0 ? <p className="actionWarning">Select at least one project before updating.</p> : null}
      <div className="fieldStack">
        {FieldOrder.map((field) => {
          const validation = validationResults.find((result) => result.field === field);

          return (
            <label key={field} className="fieldControl">
              <span>{VersionFieldLabels[field]}</span>
              <input
                className={`textInput ${validation ? "hasValidationError" : ""}`}
                value={values[field] ?? ""}
                onChange={(event) => onChange(field, event.target.value)}
                placeholder={`Leave blank to keep current ${VersionFieldLabels[field]}`}
              />
              {validation ? <small className="validationText">{validation.message}</small> : null}
            </label>
          );
        })}
      </div>
    </section>
  );
}
