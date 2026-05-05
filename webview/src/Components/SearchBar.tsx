import type { ChangeEvent } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="searchBar">
      <input
        className="textInput searchInput"
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Filter projects by name or path"
        aria-label="Filter projects"
      />
    </div>
  );
}
