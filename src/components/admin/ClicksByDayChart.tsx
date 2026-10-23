import type { DayBucket } from "@/lib/click-analytics";

type Props = {
  days: DayBucket[];
  maxDay: number;
  avgPerDay?: number;
};

/**
 * SVG column chart — days on X, clicks on Y.
 * Server-rendered; hover via native <title>.
 */
export function ClicksByDayChart({ days, maxDay, avgPerDay = 0 }: Props) {
  const peak = Math.max(1, maxDay);
  const W = 640;
  const H = 220;
  const pad = { top: 16, right: 12, bottom: 36, left: 36 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const gap = days.length > 20 ? 1.5 : days.length > 10 ? 2.5 : 4;
  const barW = Math.max(3, (innerW - gap * (days.length - 1)) / days.length);
  const labelEvery =
    days.length > 20 ? 5 : days.length > 12 ? 2 : 1;

  const yTicks = uniqueSorted([peak, Math.round(peak * 0.66), Math.round(peak * 0.33), 0]);
  const avgY =
    avgPerDay > 0
      ? pad.top + innerH - (avgPerDay / peak) * innerH
      : null;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto min-w-[280px]"
        role="img"
        aria-label="Outbound clicks by day"
      >
        {/* Plot background */}
        <rect
          x={pad.left}
          y={pad.top}
          width={innerW}
          height={innerH}
          fill="#fafaf9"
          rx={4}
        />

        {/* Grid + Y labels */}
        {yTicks.map((t) => {
          const y = pad.top + innerH - (t / peak) * innerH;
          return (
            <g key={`y-${t}`}>
              <line
                x1={pad.left}
                x2={pad.left + innerW}
                y1={y}
                y2={y}
                stroke="#e7e5e4"
                strokeWidth={1}
                strokeDasharray={t === 0 ? undefined : "3 3"}
              />
              <text
                x={pad.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-stone-400"
                style={{ fontSize: 10, fontVariantNumeric: "tabular-nums" }}
              >
                {t}
              </text>
            </g>
          );
        })}

        {/* Average line */}
        {avgY != null && (
          <g>
            <line
              x1={pad.left}
              x2={pad.left + innerW}
              y1={avgY}
              y2={avgY}
              stroke="#f97316"
              strokeWidth={1.25}
              strokeDasharray="4 3"
              opacity={0.85}
            />
            <text
              x={pad.left + innerW - 2}
              y={avgY - 4}
              textAnchor="end"
              className="fill-[#f97316]"
              style={{ fontSize: 9, fontWeight: 600 }}
            >
              avg {formatNum(avgPerDay)}
            </text>
          </g>
        )}

        {/* Bars */}
        {days.map((d, i) => {
          const h =
            d.count <= 0 ? 0 : Math.max(2, (d.count / peak) * innerH);
          const x = pad.left + i * (barW + gap);
          const y = pad.top + innerH - h;
          const isPeak = d.count === peak && d.count > 0;
          const showLabel =
            i === 0 || i === days.length - 1 || i % labelEvery === 0;

          return (
            <g key={d.day}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={Math.min(3, barW / 2)}
                fill={isPeak ? "#ea580c" : "#f97316"}
                opacity={d.count === 0 ? 0 : isPeak ? 1 : 0.82}
              >
                <title>{`${d.day}: ${d.count} click${d.count === 1 ? "" : "s"}`}</title>
              </rect>
              {/* Zero-day tick mark so empty days stay visible */}
              {d.count === 0 && (
                <line
                  x1={x + barW / 2}
                  x2={x + barW / 2}
                  y1={pad.top + innerH}
                  y2={pad.top + innerH - 3}
                  stroke="#d6d3d1"
                  strokeWidth={1}
                />
              )}
              {showLabel && (
                <text
                  x={x + barW / 2}
                  y={H - 14}
                  textAnchor="middle"
                  className="fill-stone-400"
                  style={{ fontSize: 9, fontVariantNumeric: "tabular-nums" }}
                >
                  {d.day.slice(5)}
                </text>
              )}
            </g>
          );
        })}

        {/* Axis labels */}
        <text
          x={pad.left + innerW / 2}
          y={H - 2}
          textAnchor="middle"
          className="fill-stone-400"
          style={{ fontSize: 9 }}
        >
          Day
        </text>
        <text
          x={12}
          y={pad.top + innerH / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${pad.top + innerH / 2})`}
          className="fill-stone-400"
          style={{ fontSize: 9 }}
        >
          Clicks
        </text>
      </svg>
    </div>
  );
}

function uniqueSorted(nums: number[]): number[] {
  return [...new Set(nums.map((n) => Math.max(0, n)))].sort((a, b) => b - a);
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
