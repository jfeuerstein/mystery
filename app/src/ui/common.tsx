import { useEffect, useRef, useState, type ReactNode } from "react";

/** Turns an art tag like "portrait-young-woman" into a caption. */
function caption(tag: string): string {
  return tag
    .replace(/^(portrait|scene|vignette)-/, "")
    .replace(/-/g, " ");
}

/**
 * A framed engraving. Until the public-domain art catalog exists
 * (GAME_DESIGN.md §13.2), this draws a cross-hatched plate with a caption.
 */
export function Engraving(props: { tag: string; height?: number; children?: ReactNode; className?: string }) {
  return (
    <figure
      className={`engraving ${props.className ?? ""}`}
      style={props.height ? { height: props.height } : undefined}
      aria-label={caption(props.tag)}
    >
      {props.children}
      <figcaption>{caption(props.tag)}</figcaption>
    </figure>
  );
}

export function PatienceMeter(props: { holder: string; patience: number; max?: number }) {
  const max = props.max ?? 3;
  const pips = "●".repeat(Math.max(0, props.patience)) + "○".repeat(Math.max(0, max - props.patience));
  return (
    <div className="patience" aria-label={`${props.holder}'s patience: ${props.patience} of ${max}`}>
      <span className="pips">{pips}</span>
      <span className="smallcaps">{props.holder.replace(/^(Inspector|Miss|Mr\.|Mrs\.|Colonel) /, "")}</span>
    </div>
  );
}

export function Sheet(props: { onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div className="sheet-backdrop" onClick={props.onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <button className="sheet-handle" aria-label="Close" onClick={props.onClose} />
        <div className="sheet-body">{props.children}</div>
      </div>
    </>
  );
}

const HOLD_MS = 600;

/**
 * Press and hold for 0.6 s to submit, so a stray tap can't cost Patience
 * (GAME_DESIGN.md §8.1).
 */
export function HoldToDeclare(props: { disabled?: boolean; onDeclare: () => void; label?: string }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const stop = () => {
    window.clearTimeout(timer.current);
    setHolding(false);
  };
  const start = () => {
    if (props.disabled) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      setHolding(false);
      props.onDeclare();
    }, HOLD_MS);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <button
      className={`declare ${holding ? "holding" : ""}`}
      disabled={props.disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      data-testid="declare"
    >
      <span className="fill" />
      <span className="label">{props.label ?? (holding ? "Holmes declares…" : "Hold to declare")}</span>
    </button>
  );
}

export function Fleuron() {
  return (
    <div className="fleuron" aria-hidden="true">
      ❦
    </div>
  );
}
