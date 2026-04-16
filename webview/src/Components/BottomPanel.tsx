import type { OptionsState, UpdateFieldValues, ValidationResult } from "../Types";
import { useState } from "react";
import { HomeTab } from "./HomeTab";
import { OptionsTab } from "./OptionsTab";

type TabKey = "main" | "options" | "tips";

interface BottomPanelProps {
  searchTerm: string;
  options: OptionsState;
  values: UpdateFieldValues;
  validationResults: ValidationResult[];
  isLoading: boolean;
  isSaving: boolean;
  onSearchChange: (value: string) => void;
  onValueChange: (field: keyof UpdateFieldValues, value: string) => void;
  onOptionToggle: (key: keyof OptionsState) => void;
  onRefresh: () => void;
  onUpdate: () => void;
}

export function BottomPanel({
  searchTerm,
  options,
  values,
  validationResults,
  isLoading,
  isSaving,
  onSearchChange,
  onValueChange,
  onOptionToggle,
  onRefresh,
  onUpdate
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("main");

  return (
    <section className="sidePanelShell">
      <div className="tabsRow">
        <button className={`tabButton ${activeTab === "main" ? "isTabActive" : ""}`} type="button" onClick={() => setActiveTab("main")}>
          Main
        </button>
        <button className={`tabButton ${activeTab === "options" ? "isTabActive" : ""}`} type="button" onClick={() => setActiveTab("options")}>
          Options
        </button>
        <button className={`tabButton ${activeTab === "tips" ? "isTabActive" : ""}`} type="button" onClick={() => setActiveTab("tips")}>
          Tips
        </button>
      </div>
      <div className="sidePanelBody">
        {activeTab === "main" ? (
          <HomeTab
            searchTerm={searchTerm}
            values={values}
            validationResults={validationResults}
            isLoading={isLoading}
            isSaving={isSaving}
            onSearchChange={onSearchChange}
            onChange={onValueChange}
            onRefresh={onRefresh}
            onUpdate={onUpdate}
          />
        ) : activeTab === "tips" ? (
          <section className="sideCard">
            <div className="cardHeader">
              <h3>Tips</h3>
            </div>
            <div className="tipsList">
              <p>Empty field means keep the current value.</p>
              <p>Default values are taken from the highest versions found in the workspace.</p>
              <p>Select one or many projects in the table before clicking Update.</p>
            </div>
          </section>
        ) : (
          <OptionsTab options={options} onToggle={onOptionToggle} />
        )}
      </div>
    </section>
  );
}
