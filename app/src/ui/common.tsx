import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import catalogJson from "../../public/art/catalog.json";
import { HolderIcon, type HolderKind } from "./icons";

// ---------------------------------------------------------------------------
// Engravings (GAME_DESIGN.md §13.2)
// ---------------------------------------------------------------------------

export type ArtCredit = { title: string; author: string; date?: string; source: string; license: string };
type ArtAsset = {
  tag: string;
  kind: "portrait" | "scene" | "vignette";
  description: string;
  /** Processed engraving in public/art/, once sourced. */
  file?: string;
  /** Where a narrow frame centres on the plate, as fractions [x, y]. */
  focus?: [number, number];
  credit?: ArtCredit;
};

export const ART: ArtAsset[] = (catalogJson as { assets: ArtAsset[] }).assets;
const BY_TAG = new Map(ART.map((a) => [a.tag, a]));

export function artFor(tag: string): ArtAsset | undefined {
  return BY_TAG.get(tag);
}

export function artUrl(file: string): string {
  return `${import.meta.env.BASE_URL}art/${file}`;
}

function captionFor(tag: string): string {
  return tag.replace(/^(portrait|scene|vignette)-/, "").replace(/-/g, " ");
}

/** A placeholder plate in the engraver's manner: hatching and a silhouette. */
function Plate({ kind }: { kind: ArtAsset["kind"] }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className="plate" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id={`h${id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="var(--sepia)" strokeWidth="0.8" strokeOpacity="0.42" />
        </pattern>
        <pattern id={`x${id}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="var(--ink)" strokeWidth="0.7" strokeOpacity="0.35" />
        </pattern>
        <radialGradient id={`v${id}`} cx="50%" cy="45%" r="70%">
          <stop offset="55%" stopColor="var(--paper)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--sepia)" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <rect width="300" height="200" fill={`url(#h${id})`} />
      {kind === "portrait" && (
        <g>
          <ellipse cx="150" cy="100" rx="78" ry="92" fill="var(--paper-deep)" stroke="var(--ink)" strokeWidth="1.2" />
          <ellipse cx="150" cy="100" rx="70" ry="84" fill={`url(#h${id})`} />
          <path
            d="M150 46c-17 0-28 13-28 30 0 13 6 23 14 28-17 5-34 17-41 40-3 9-4 24-4 46h118c0-22-1-37-4-46-7-23-24-35-41-40 8-5 14-15 14-28 0-17-11-30-28-30z"
            fill={`url(#x${id})`}
            stroke="var(--ink)"
            strokeWidth="1"
          />
        </g>
      )}
      {kind === "scene" && (
        <g stroke="var(--ink)" strokeWidth="0.9" strokeOpacity="0.55" fill="none">
          <path d="M0 150 L300 150" />
          {[-200, -120, -60, 0, 60, 120, 200, 300, 400].map((x) => (
            <path key={x} d={`M150 120 L${150 + x} 200`} />
          ))}
          <rect x="105" y="40" width="90" height="80" fill={`url(#x${id})`} />
          <path d="M105 40 L150 18 L195 40" />
          <path d="M20 150 V60 h40 v90 M240 150 V70 h40 v80" />
        </g>
      )}
      {kind === "vignette" && (
        <g>
          <circle cx="150" cy="100" r="64" fill="var(--paper-deep)" stroke="var(--ink)" strokeWidth="1.2" />
          <circle cx="150" cy="100" r="40" fill={`url(#x${id})`} stroke="var(--ink)" strokeWidth="0.8" />
        </g>
      )}
      <rect width="300" height="200" fill={`url(#v${id})`} />
    </svg>
  );
}

/** A framed engraving: the real plate when it has been sourced, else a placeholder. */
export function Engraving(props: { tag: string; height?: number; children?: ReactNode; className?: string; caption?: boolean }) {
  const asset = artFor(props.tag);
  const [loaded, setLoaded] = useState(false);
  const kind = asset?.kind ?? (props.tag.startsWith("portrait") ? "portrait" : props.tag.startsWith("scene") ? "scene" : "vignette");
  return (
    <figure
      className={`engraving ${kind} ${props.className ?? ""}`}
      style={props.height ? { height: props.height } : undefined}
      aria-label={asset?.description ?? captionFor(props.tag)}
    >
      {asset?.file ? (
        <img
          src={artUrl(asset.file)}
          alt=""
          className={loaded ? "loaded" : ""}
          style={asset.focus ? { objectPosition: `${asset.focus[0] * 100}% ${asset.focus[1] * 100}%` } : undefined}
          onLoad={() => setLoaded(true)}
          draggable={false}
        />
      ) : (
        <Plate kind={kind} />
      )}
      {props.children}
      {/* The tag's caption labels a placeholder; a real plate needs none. */}
      {props.caption !== false && !asset?.file && <figcaption>{captionFor(props.tag)}</figcaption>}
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Ornaments
// ---------------------------------------------------------------------------

/** A Strand-style rule with a central fleuron; draws itself in. */
export function Ornament(props: { className?: string }) {
  return (
    <div className={`ornament ${props.className ?? ""}`} aria-hidden="true">
      <span className="ornament-line" />
      <svg viewBox="0 0 40 16" width="40" height="16">
        <path
          d="M20 2c-2.5 3-6 4-9 3 2 2 2.5 4.5 0 6 3-1 6.5 0 9 3 2.5-3 6-4 9-3-2.5-1.5-2-4 0-6-3 1-6.5 0-9-3z"
          fill="currentColor"
        />
      </svg>
      <span className="ornament-line" />
    </div>
  );
}

export function Fleuron() {
  return <Ornament />;
}

// ---------------------------------------------------------------------------
// Patience (§9.1)
// ---------------------------------------------------------------------------

export function PatienceMeter(props: { holder: string; kind: HolderKind; patience: number; max?: number }) {
  const max = props.max ?? 3;
  return (
    <div className="patience" aria-label={`${props.holder}'s patience: ${props.patience} of ${max}`}>
      <span className="pips">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`pip ${i < props.patience ? "lit" : "spent"}`}>
            <HolderIcon kind={props.kind} size={18} />
          </span>
        ))}
      </span>
      <span className="smallcaps holder">{props.holder.replace(/^(Inspector|Miss|Mr\.|Mrs\.|Colonel|Dr\.) /, "")}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sheet (a drawer from the bottom edge)
// ---------------------------------------------------------------------------

export function Sheet(props: { onClose: () => void; children: ReactNode; className?: string }) {
  return (
    <>
      <div className="sheet-backdrop" onClick={props.onClose} />
      <div className={`sheet ${props.className ?? ""}`} role="dialog" aria-modal="true">
        <button className="sheet-handle" aria-label="Close" onClick={props.onClose} />
        <div className="sheet-body">{props.children}</div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Hold to Declare (§8.1)
// ---------------------------------------------------------------------------

const HOLD_MS = 600;

/** Press and hold for 0.6 s to submit, so a stray tap can't cost Patience. */
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

// ---------------------------------------------------------------------------
// By Candlelight (§12)
// ---------------------------------------------------------------------------

/**
 * A candle burning down the edge of the Mind Palace. When it gutters it calls
 * `onGutter` and relights; the deduction continues.
 */
export function Candle(props: { seconds: number; onGutter: () => void }) {
  const [left, setLeft] = useState(1);
  const [lit, setLit] = useState(0);
  const started = useRef(performance.now());
  const gutter = useRef(props.onGutter);
  gutter.current = props.onGutter;

  useEffect(() => {
    started.current = performance.now();
    let frame = 0;
    const tick = () => {
      const fraction = 1 - (performance.now() - started.current) / (props.seconds * 1000);
      if (fraction <= 0) {
        gutter.current();
        setLit((n) => n + 1);
        return;
      }
      setLeft(fraction);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [props.seconds, lit]);

  return (
    <div className="candle" aria-label={`Candle: ${Math.ceil(left * props.seconds)} seconds left`} role="timer">
      <div className="candle-flame" key={lit} />
      <div className="candle-wax" style={{ height: `${Math.max(2, left * 100)}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wax seals for Watson's grade (§9.3), pressed in ink, never in colour.
// ---------------------------------------------------------------------------

const SEAL_LETTER = { masterful: "M", workmanlike: "W", untidy: "U" } as const;

function scallop(cx: number, cy: number, r: number, bumps: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= bumps * 2; i++) {
    const a = (i / (bumps * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.9;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

export function GradeSeal(props: { grade: keyof typeof SEAL_LETTER; stamped?: boolean; className?: string }) {
  const sheen = `wax-${useId().replace(/:/g, "")}`;
  return (
    <svg className={`seal ${props.stamped ? "stamped" : ""} ${props.className ?? ""}`} viewBox="0 0 64 64" aria-label={`Grade: ${props.grade}`}>
      <defs>
        <radialGradient id={sheen} cx="38%" cy="32%" r="70%">
          <stop offset="0" stopColor="var(--wax-light)" />
          <stop offset="1" stopColor="var(--wax)" />
        </radialGradient>
      </defs>
      <path d={scallop(32, 32, 30, 14)} fill={`url(#${sheen})`} />
      <circle cx="32" cy="32" r="21" fill="none" stroke="var(--paper)" strokeOpacity="0.45" strokeWidth="1" />
      <circle cx="32" cy="32" r="19" fill="none" stroke="var(--wax-dark)" strokeOpacity="0.6" strokeWidth="1.2" />
      <text
        x="32"
        y="39"
        textAnchor="middle"
        fontFamily="IM Fell English SC, serif"
        fontSize="22"
        fill="var(--paper)"
      >
        {SEAL_LETTER[props.grade]}
      </text>
    </svg>
  );
}

/** Corner flourish for engraved frames. */
export function Corner(props: { pos: "tl" | "tr" | "bl" | "br" }) {
  return (
    <svg className={`corner ${props.pos}`} viewBox="0 0 26 26" aria-hidden="true">
      <path d="M2 24V8a6 6 0 0 1 6-6h16" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M6 24V12a6 6 0 0 1 6-6h12" fill="none" stroke="currentColor" strokeWidth="0.6" />
      <circle cx="9" cy="9" r="1.6" fill="currentColor" />
    </svg>
  );
}
