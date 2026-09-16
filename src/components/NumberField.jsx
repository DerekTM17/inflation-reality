import { useState } from "react";

/**
 * A text box for a number. Keeps what the person is typing ("4.", "-") as a draft
 * while every keystroke commits the parsed, clamped value, so nothing is lost if the
 * box unmounts mid-edit. On blur the box shows the committed value again.
 */
export default function NumberField({ id, value, parse, onCommit, inputMode, className, describedBy }) {
  const [draft, setDraft] = useState(null);
  return (
    <input
      id={id}
      className={className}
      type="text"
      inputMode={inputMode}
      autoComplete="off"
      aria-describedby={describedBy}
      value={draft ?? (value == null ? "" : String(value))}
      onChange={(e) => {
        setDraft(e.target.value);
        onCommit(parse(e.target.value));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}
