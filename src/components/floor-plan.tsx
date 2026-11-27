/**
 * A schematic floor plan drawn from the trip's rooms and beds, in the v4 blueprint
 * style: 8px lake grid, 2px exterior walls, 1px interior walls, dashed door arcs,
 * numbered mono room tags, beds with pillows and a 14px initial label.
 *
 * It is a diagram of what's in each room, not the house's real layout: rooms are
 * packed two to a row in the order the organizer listed them. Because the app has
 * no measurements, the dimension line reads NOT TO SCALE rather than a made-up
 * width. The water strip shows only when the caller says the stay is on water.
 */

export type BedState = "open" | "mine" | "taken" | "requested" | "held";

export interface PlanBed {
  id: string;
  bedType: string;
  state: BedState;
  /** Short label inside the bed: each sleeper's initials (one per line), else the holding party's, else blank. */
  label: string;
  /** Initials of each person sleeping here, when known. Two fit; more read "JC +2". */
  people?: string[];
  /** Shown under the bed when a room has two of the same type: "1", "2". */
  number?: string;
}

export interface PlanRoom {
  code: string;
  name: string;
  anchor: string;
  beds: PlanBed[];
  groundFloor: boolean;
  stepFree: boolean;
}

const W = 350;
const ROW = 132;
const PAD = 1;
/** Room above the house for the dimension line, and below it for the entry and water. */
const DIM = 26;
const ENTRY = 34;
const WATER = 24;
const MONO_CH = 8.6; // Geist Mono 14px advance, with letter-spacing

const bedSize: Record<string, [number, number, number]> = {
  // width, height, pillows
  king: [70, 54, 2],
  queen: [60, 50, 2],
  full: [52, 48, 2],
  twin: [32, 50, 1],
  bunk: [32, 50, 1],
  sofa_bed: [60, 30, 0],
  couch: [64, 26, 0],
  air_mattress: [46, 34, 1],
};

/** "Family bedroom" → FAMILY, "Ground-floor suite" → SUITE, "Bedroom 2" → BEDROOM 2. */
function tag(name: string): string {
  const words = name.split(/\s+/).filter((word) => !/^(bed)?room$/i.test(word));
  const pick = words.length && !/^\d+$/.test(words[words.length - 1] ?? "") ? words[words.length - 1] : name;
  return (pick ?? name).toUpperCase();
}

function Bed({ bed, x, y }: { bed: PlanBed; x: number; y: number }) {
  const [w, h, pillows] = bedSize[bed.bedType] ?? [40, 44, 1];
  const fill =
    bed.state === "mine" ? "var(--accent-tint)" : bed.state === "taken" || bed.state === "held" ? "var(--bg-sunken)" : "var(--bg-surface)";
  const stroke =
    bed.state === "mine" || bed.state === "requested" ? "var(--accent)" : bed.state === "taken" || bed.state === "held" ? "var(--line-strong)" : "var(--ink-2)";
  const text = bed.state === "mine" ? "var(--accent-ink)" : bed.state === "taken" || bed.state === "held" ? "var(--ink-3)" : "var(--ink-2)";
  const lift = bed.state === "mine" ? -2 : 0;
  const pw = pillows === 2 ? (w - 14) / 2 : w - 10;
  const people = bed.people ?? [];
  const lines = people.length > 2 ? [people[0] ?? "", `+${people.length - 1}`] : people.length ? people : bed.label ? [bed.label] : [];
  // Centre the block of lines in the part of the bed below the pillows.
  const body = pillows ? 13 : 0;
  const top = body + (h - body) / 2 + 5 - ((lines.length - 1) * 15) / 2;
  return (
    <g transform={`translate(${x}, ${y + lift})`} className={bed.state === "mine" ? "ft-bed-lift" : undefined}>
      <rect width={w} height={h} rx="3" strokeWidth="1.25" strokeDasharray={bed.state === "requested" ? "4 3" : undefined} style={{ fill: fill, stroke: stroke }} />
      {Array.from({ length: pillows }, (_, i) => (
        <rect key={i} x={5 + i * (pw + 4)} y="5" width={pw} height="8" rx="2" strokeWidth="1" style={{ fill: "var(--bg-surface)", stroke: stroke }} />
      ))}
      {lines.length ? (
        <text textAnchor="middle" className="ft-svg-ui" fontSize="14" fontWeight="600" style={{ fill: text }}>
          {lines.map((line, i) => (
            <tspan key={i} x={w / 2} y={top + i * 15}>
              {line}
            </tspan>
          ))}
        </text>
      ) : null}
      {bed.number ? (
        <text x={w / 2} y={h + 17} textAnchor="middle" className="ft-svg-mono" fontSize="14" style={{ fill: "var(--ink-3)" }}>
          {bed.number}
        </text>
      ) : null}
    </g>
  );
}

function Level({
  title,
  rooms,
  dimension = false,
  water = false,
}: {
  title: string;
  rooms: PlanRoom[];
  dimension?: boolean;
  water?: boolean;
}) {
  const rows = Math.ceil(rooms.length / 2);
  const H = rows * ROW;
  const id = title.replace(/\W/g, "");
  const top = dimension ? DIM : 0;
  // Step-free entry: a door in the bottom wall under the first step-free room that sits on the bottom row.
  const entryIndex = rooms.findIndex((room, i) => room.stepFree && Math.floor(i / 2) === rows - 1);
  const entry = entryIndex >= 0 ? entryX(entryIndex, rooms.length) : null;
  const below = (entry !== null ? ENTRY : 0) + (water ? WATER : 0);
  const total = top + H + 2 + below;
  const dimLabel = "NOT TO SCALE";
  const dimW = dimLabel.length * MONO_CH + 12;
  return (
    <figure>
      <figcaption className="ft-lbl ink mb-2">{title}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${total}`}
        className="block w-full"
        role="img"
        aria-label={`${title}${entry !== null ? ", step-free entry" : ""}: ${rooms.map((room) => `${room.code} ${room.name}`).join(", ")}`}
      >
        <defs>
          <pattern id={`ft-grid-${id}`} width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M8 0H0V8" strokeOpacity="0.07" strokeWidth="1" style={{ fill: "none", stroke: "var(--lake)" }} />
          </pattern>
        </defs>
        {dimension ? (
          <g aria-hidden>
            <g strokeWidth="0.75" style={{ stroke: "var(--ink-3)" }}>
              <line x1={PAD + 1} x2={W - PAD - 1} y1="10" y2="10" />
              <line x1={PAD + 1} x2={PAD + 1} y1="5" y2="15" />
              <line x1={W - PAD - 1} x2={W - PAD - 1} y1="5" y2="15" />
            </g>
            <rect x={(W - dimW) / 2} y="1" width={dimW} height="18" style={{ fill: "var(--bg-canvas)" }} />
            <text x={W / 2} y="15" textAnchor="middle" className="ft-svg-mono" fontSize="14" letterSpacing="0.6" style={{ fill: "var(--ink-3)" }}>
              {dimLabel}
            </text>
          </g>
        ) : null}
        <g transform={`translate(0, ${top})`}>
          <rect x={PAD} y={PAD} width={W - PAD * 2} height={H} style={{ fill: "var(--bg-surface)" }} />
          <rect x={PAD} y={PAD} width={W - PAD * 2} height={H} fill={`url(#ft-grid-${id})`} />
          {rooms.map((room, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const alone = i === rooms.length - 1 && rooms.length % 2 === 1;
            const rw = alone ? W - PAD * 2 : (W - PAD * 2) / 2;
            const rx = PAD + col * rw;
            const ry = PAD + row * ROW;
            // Beds sit on a baseline, centred as a group.
            const sizes = room.beds.map((bed) => bedSize[bed.bedType] ?? [40, 44, 1]);
            const gap = 10;
            const width = sizes.reduce((sum, [w]) => sum + w, 0) + gap * Math.max(0, sizes.length - 1);
            const scale = width > rw - 24 ? (rw - 24) / width : 1;
            let cursor = rx + (rw - width * scale) / 2;
            return (
              <a key={room.code} href={`#${room.anchor}`} aria-label={`${room.code} ${room.name}`}>
                {/* interior walls: 1px */}
                {col === 1 ? <line x1={rx} x2={rx} y1={ry} y2={ry + ROW} strokeWidth="1" style={{ stroke: "var(--ink-1)" }} /> : null}
                {row > 0 ? <line x1={rx} x2={rx + rw} y1={ry} y2={ry} strokeWidth="1" style={{ stroke: "var(--ink-1)" }} /> : null}
                {/* door: a gap in the wall with a dashed swing arc */}
                {row > 0 ? (
                  <g>
                    {/* hinged on the right so the swing clears the room tag */}
                    <line x1={rx + rw - 46} x2={rx + rw - 18} y1={ry} y2={ry} strokeWidth="3" style={{ stroke: "var(--bg-surface)" }} />
                    <path d={`M${rx + rw - 18},${ry} A28,28 0 0 0 ${rx + rw - 46},${ry + 28}`} strokeWidth="1" strokeDasharray="2 3" style={{ fill: "none", stroke: "var(--ink-3)" }} />
                  </g>
                ) : null}
                <text x={rx + 12} y={ry + 24} className="ft-svg-mono" fontSize="14" fontWeight="500" letterSpacing="0.84">
                  <tspan style={{ fill: "var(--accent-ink)" }}>{room.code}</tspan>
                  <tspan dx="7" style={{ fill: "var(--ink-1)" }}>
                    {tag(room.name).slice(0, alone ? 18 : 10)}
                  </tspan>
                </text>
                <g transform={`translate(0, ${ry + 44})`}>
                  {room.beds.map((bed, b) => {
                    const [w] = sizes[b] ?? [40];
                    const x = cursor;
                    cursor += (w + gap) * scale;
                    return (
                      <g key={bed.id} transform={`translate(${x}, 0) scale(${scale})`}>
                        <Bed bed={bed} x={0} y={0} />
                      </g>
                    );
                  })}
                </g>
              </a>
            );
          })}
          {/* exterior walls: 2px */}
          <rect x={PAD} y={PAD} width={W - PAD * 2} height={H} strokeWidth="2" style={{ fill: "none", stroke: "var(--ink-1)" }} />
          {entry !== null ? <Entry x={entry} y={PAD + H} /> : null}
        </g>
        {water ? (
          <g aria-hidden transform={`translate(0, ${top + H + 2 + (entry !== null ? ENTRY : 0)})`}>
            <rect x="0" y="0" width={W} height={WATER - 2} style={{ fill: "color-mix(in srgb, var(--lake) 12%, var(--bg-surface))" }} />
            <line x1="0" x2={W} y1="0" y2="0" strokeWidth="1" style={{ stroke: "var(--lake)" }} />
            <path d={`M6 ${WATER / 2} ${"q8 -3 16 0 ".repeat(1)}${"t16 0 ".repeat(20)}`} strokeWidth="0.75" style={{ fill: "none", stroke: "var(--lake-60)" }} />
          </g>
        ) : null}
      </svg>
    </figure>
  );
}

/** Centre x of a bottom-row room's wall, for its entry door. */
function entryX(index: number, count: number): number {
  const alone = index === count - 1 && count % 2 === 1;
  if (alone) return W / 2;
  const rw = (W - PAD * 2) / 2;
  return PAD + (index % 2) * rw + rw / 2;
}

/** A 46px door notch in the bottom wall, a accent arrow in, and the mono label beside it. */
function Entry({ x, y }: { x: number; y: number }) {
  const label = "STEP-FREE ENTRY";
  const labelW = label.length * MONO_CH;
  const right = x + 31 + labelW <= W - 4;
  return (
    <g>
      <line x1={x - 23} x2={x + 23} y1={y} y2={y} strokeWidth="3" style={{ stroke: "var(--bg-surface)" }} />
      <path d={`M${x - 23} ${y} v12 h46 v-12`} strokeWidth="1" style={{ fill: "none", stroke: "var(--ink-1)" }} />
      <path d={`M${x} ${y + 30} v-12 M${x - 4} ${y + 22} l4 -5 l4 5`} strokeWidth="1.25" style={{ fill: "none", stroke: "var(--accent)" }} />
      <text
        x={right ? x + 31 : x - 31}
        y={y + 27}
        textAnchor={right ? "start" : "end"}
        className="ft-svg-mono"
        fontSize="14"
        fontWeight="500"
        letterSpacing="0.84" style={{ fill: "var(--ink-1)" }}>
        {label}
      </text>
    </g>
  );
}

export function FloorPlan({ rooms, water = false }: { rooms: PlanRoom[]; water?: boolean }) {
  const ground = rooms.filter((room) => room.groundFloor);
  const up = rooms.filter((room) => !room.groundFloor);
  const split = ground.length > 0 && up.length > 0;
  return (
    <div className="grid gap-6">
      {split ? (
        <>
          <Level title="Level 2 · Upstairs" rooms={up} dimension />
          <Level title="Level 1 · Ground" rooms={ground} water={water} />
        </>
      ) : (
        <Level title="The house" rooms={rooms} dimension water={water} />
      )}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-ink-2" aria-label="Key">
        <li className="flex items-center gap-1.5">
          <i className="ft-key border border-ink-2 bg-card" aria-hidden /> Open
        </li>
        <li className="flex items-center gap-1.5">
          <i className="ft-key border border-accent bg-accent-tint" aria-hidden /> Yours
        </li>
        <li className="flex items-center gap-1.5">
          <i className="ft-key border border-line-strong bg-chip" aria-hidden /> Taken
        </li>
        <li className="flex items-center gap-1.5">
          <i className="ft-key border border-dashed border-accent bg-card" aria-hidden /> Requested
        </li>
      </ul>
    </div>
  );
}
