import { SearchBar } from "./SearchBar";
import { VersionFieldLabels, type UpdateFieldValues, type ValidationResult, type VersionFieldKey } from "../Types";

interface HomeTabProps {
  searchTerm: string;
  values: UpdateFieldValues;
  validationResults: ValidationResult[];
  isLoading: boolean;
  isSaving: boolean;
  onSearchChange: (value: string) => void;
  onChange: (field: VersionFieldKey, value: string) => void;
  onRefresh: () => void;
  onUpdate: () => void;
}

const FieldOrder: VersionFieldKey[] = ["version", "fileVersion", "assemblyVersion"];

export function HomeTab({
  searchTerm,
  values,
  validationResults,
  isLoading,
  isSaving,
  onSearchChange,
  onChange,
  onRefresh,
  onUpdate
}: HomeTabProps) {
  return (
    <section className="sideCard">
      <div className="cardHeader">
        <div className="titleRow">
          <h3>Bulk Update</h3>
          <div className="headerSearch">
            <SearchBar value={searchTerm} onChange={onSearchChange} />
          </div>
        </div>
        <div className="buttonRow">
          <button className="secondaryButton" type="button" onClick={onRefresh} disabled={isLoading || isSaving}>
            Refresh
          </button>
          <button className="primaryButton" type="button" onClick={onUpdate} disabled={isLoading || isSaving}>
            {isSaving ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
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
