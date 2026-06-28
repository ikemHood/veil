import { FiDelete } from "react-icons/fi";

export function PinPad({
  error,
  onChange,
  onComplete,
  value,
}: {
  error: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  value: string;
}) {
  const press = (digit: string) => {
    if (value.length >= 4) return;
    const next = `${value}${digit}`;
    onChange(next);
    if (next.length === 4) onComplete(next);
  };

  return (
    <div className="pin-pad">
      <div className="pin-dots">
        {[0, 1, 2, 3].map((index) => (
          <span className={index < value.length ? "filled" : ""} key={index} />
        ))}
      </div>
      <div className="keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map((key) =>
          key === "" ? (
            <span key="spacer" />
          ) : (
            <button
              className="key-button"
              key={key}
              onClick={() => {
                if (key === "back") onChange(value.slice(0, -1));
                else press(key);
              }}
              type="button"
              aria-label={key === "back" ? "Delete digit" : `Digit ${key}`}
            >
              {key === "back" ? <FiDelete /> : key}
            </button>
          ),
        )}
      </div>
      {error && <p className="pin-error">{error}</p>}
    </div>
  );
}
