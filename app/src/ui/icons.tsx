// Line-art icons in the engraving's hand: single colour (currentColor), drawn
// to sit beside Caslon-style type. No emoji, no colour (GAME_DESIGN.md §13.1).
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 22, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Back = (p: P) => (
  <Svg {...p}>
    <path d="M15 5 8 12l7 7" />
  </Svg>
);

export const Notebook = (p: P) => (
  <Svg {...p}>
    <path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6z" />
    <path d="M6 3v18M9 7h6M9 10h6" />
    <path d="M14 21v-3l1.5 1 1.5-1v3" fill="currentColor" stroke="none" />
  </Svg>
);

/** An open book: the story so far. */
export const OpenBook = (p: P) => (
  <Svg {...p}>
    <path d="M12 6.5C9.5 5 6.5 4.7 3.5 5.5v13c3-.8 6-.5 8.5 1 2.5-1.5 5.5-1.8 8.5-1v-13c-3-.8-6-.5-8.5 1z" />
    <path d="M12 6.5v13" />
    <path d="M6 9c1.4-.3 2.8-.2 4 .3M6 12c1.4-.3 2.8-.2 4 .3M14 9.3c1.2-.5 2.6-.6 4-.3" strokeWidth={1} />
  </Svg>
);

export const Folder = (p: P) => (
  <Svg {...p}>
    <path d="M3 7V5.5A1.5 1.5 0 0 1 4.5 4H9l2 2h8.5A1.5 1.5 0 0 1 21 7.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z" />
    <path d="M3 9h18" />
  </Svg>
);

export const Lens = (p: P) => (
  <Svg {...p}>
    <circle cx="10" cy="10" r="6" />
    <path d="m14.5 14.5 6 6" strokeWidth={2.2} />
    <path d="M7 8.5a3.5 3.5 0 0 1 2.5-2" />
  </Svg>
);

export const Turn = (p: P) => (
  <Svg {...p}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 3v4.5h4.5" />
  </Svg>
);

export const Cog = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
  </Svg>
);

export const Ledger = (p: P) => (
  <Svg {...p}>
    <path d="M5 3h12l2 2v16H5z" />
    <path d="M8 8h8M8 11h8M8 14h5" />
    <path d="M17 3v2h2" />
  </Svg>
);

// ---- Patience-holders (§9.1) --------------------------------------------

export const BowlerHat = (p: P) => (
  <Svg {...p}>
    <path d="M6.5 15c0-5.5 2.3-9 5.5-9s5.5 3.5 5.5 9" fill="currentColor" fillOpacity={0.12} />
    <path d="M3 16.5c2.5 1.6 15.5 1.6 18 0" />
    <path d="M6.6 13.5c3.4.9 7.4.9 10.8 0" />
  </Svg>
);

export const Teacup = (p: P) => (
  <Svg {...p}>
    <path d="M5 9h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" fill="currentColor" fillOpacity={0.12} />
    <path d="M16 10.5h1.5a2 2 0 0 1 0 4H16" />
    <path d="M3.5 20.5h14" />
    <path d="M9 3.5c-1 1 1 2 0 3.5M12 3.5c-1 1 1 2 0 3.5" strokeWidth={1} />
  </Svg>
);

export const ClockFace = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity={0.12} />
    <path d="M12 7v5l3.5 2" />
  </Svg>
);

export type HolderKind = "bowler" | "teacup" | "clock";

/** Lestrade and the Yard wear bowlers; Mycroft keeps the clock; clients pour tea. */
export function holderKind(person: { id: string; role: string } | undefined): HolderKind {
  if (!person) return "teacup";
  if (person.id === "mycroft") return "clock";
  if (/scotland yard|inspector|constable|police/i.test(`${person.role} ${person.id}`)) return "bowler";
  return "teacup";
}

export function HolderIcon({ kind, ...p }: P & { kind: HolderKind }) {
  if (kind === "bowler") return <BowlerHat {...p} />;
  if (kind === "clock") return <ClockFace {...p} />;
  return <Teacup {...p} />;
}
