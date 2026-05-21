"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";

type Mode = "day" | "night";
type Unit = "C" | "F";
type CustomStyle = CSSProperties & Record<`--${string}`, string | number>;

type EnvData = {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  weather: string;
  description: string;
  clouds: number;
  rainChance: number;
  aqi: number;
  dayHigh: number;
  dayLow: number;
  nightHigh: number;
  nightLow: number;
};

type HourlyItem = {
  h: string;
  t: number;
  r: number;
  ic: string;
};

type ApiRecord = Record<string, unknown>;

/* ─────────────────────────────────────────────────────────── */
/*  FONTS                                                       */
/* ─────────────────────────────────────────────────────────── */
const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Figtree:wght@300;400;500;600;700&family=Fira+Code:wght@300;400;500&display=swap";

/* ─────────────────────────────────────────────────────────── */
/*  DESIGN TOKENS — day vs night                               */
/* ─────────────────────────────────────────────────────────── */
const THEMES = {
  day: {
    bg: "linear-gradient(145deg,#0b1c2c 0%,#102d45 40%,#1a4a6b 100%)",
    nebula1: "rgba(56,189,248,0.07)",
    nebula2: "rgba(251,191,36,0.05)",
    orb: "radial-gradient(circle at 35% 35%,#fff9c4,#fde68a 40%,#f59e0b 80%)",
    orbGlow: "0 0 80px rgba(251,191,36,0.55), 0 0 160px rgba(251,191,36,0.18)",
    orbSize: 90,
    accentA: "#fbbf24" /* amber – main accent */,
    accentB: "#38bdf8" /* sky blue */,
    accentC: "#34d399" /* emerald */,
    accentD: "#f472b6" /* pink */,
    card: "rgba(255,255,255,0.055)",
    cardBorder: "rgba(255,255,255,0.10)",
    cardHover: "rgba(255,255,255,0.09)",
    text: "#f0f9ff",
    muted: "rgba(186,230,255,0.50)",
    label: "rgba(186,230,255,0.36)",
    stars: false,
  },
  night: {
    bg: "linear-gradient(145deg,#03050d 0%,#06101e 50%,#091628 100%)",
    nebula1: "rgba(99,102,241,0.07)",
    nebula2: "rgba(167,139,250,0.05)",
    orb: "radial-gradient(circle at 38% 38%,#f0f4ff,#c7d8ff 55%,#93b4f5 100%)",
    orbGlow:
      "0 0 55px rgba(160,185,255,0.45), 0 0 110px rgba(160,185,255,0.14)",
    orbSize: 76,
    accentA: "#a5b4fc" /* indigo */,
    accentB: "#67e8f9" /* cyan */,
    accentC: "#34d399" /* emerald */,
    accentD: "#f9a8d4" /* pink */,
    card: "rgba(255,255,255,0.04)",
    cardBorder: "rgba(255,255,255,0.07)",
    cardHover: "rgba(255,255,255,0.07)",
    text: "#e8f0ff",
    muted: "rgba(180,195,255,0.48)",
    label: "rgba(160,180,255,0.32)",
    stars: true,
  },
};

/* ─────────────────────────────────────────────────────────── */
/*  AQI CONFIG                                                  */
/* ─────────────────────────────────────────────────────────── */
const AQI_BANDS = [
  { max: 50, label: "Good", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  {
    max: 100,
    label: "Moderate",
    color: "#facc15",
    bg: "rgba(250,204,21,0.12)",
  },
  {
    max: 150,
    label: "Unhealthy·S",
    color: "#fb923c",
    bg: "rgba(251,146,60,0.12)",
  },
  {
    max: 200,
    label: "Unhealthy",
    color: "#f87171",
    bg: "rgba(248,113,113,0.12)",
  },
  {
    max: 300,
    label: "Very Unhealthy",
    color: "#c084fc",
    bg: "rgba(192,132,252,0.12)",
  },
  {
    max: 500,
    label: "Hazardous",
    color: "#f43f5e",
    bg: "rgba(244,63,94,0.12)",
  },
];
function aqiBand(v: number) {
  return AQI_BANDS.find((b) => v <= b.max) || AQI_BANDS[AQI_BANDS.length - 1];
}

/* ─────────────────────────────────────────────────────────── */
/*  STAR FIELD (deterministic, no Math.random)                 */
/* ─────────────────────────────────────────────────────────── */
const STARS = Array.from({ length: 80 }, (_, i) => ({
  x: (i * 97 + 13) % 100,
  y: (i * 61 + 29) % 72,
  r: ((i * 11 + 3) % 3) + 0.8,
  dur: 2 + ((i * 7) % 5),
  dly: -((i * 0.31) % 5),
  lo: 0.15 + ((i * 17) % 6) / 12,
}));

const RAIN_DROPS = Array.from({ length: 10 }, (_, i) => ({
  id: `rain-drop-${i}`,
  left: `${8 + i * 9}%`,
  duration: `${0.55 + i * 0.06}s`,
  delay: `${-(i * 0.09)}s`,
}));

/* ─────────────────────────────────────────────────────────── */
/*  GLOBAL CSS                                                  */
/* ─────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
@import url('${FONT_URL}');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{color-scheme:dark}
html{scroll-behavior:smooth}
body{
  font-family:'Figtree',sans-serif;
  -webkit-font-smoothing:antialiased;
  overflow-x:hidden;
}

/* ── animations ── */
@keyframes twinkle{
  0%,100%{opacity:var(--lo,0.3);transform:scale(1)}
  50%{opacity:1;transform:scale(1.4)}
}
@keyframes fadeUp{
  from{opacity:0;transform:translateY(20px)}
  to{opacity:1;transform:translateY(0)}
}
@keyframes spin{
  from{transform:rotate(0deg)}
  to{transform:rotate(360deg)}
}
@keyframes pulseRing{
  0%{transform:scale(0.85);opacity:.9}
  70%{transform:scale(1.8);opacity:0}
  100%{transform:scale(1.8);opacity:0}
}
@keyframes shimmer{
  0%{background-position:200% center}
  100%{background-position:-200% center}
}
@keyframes floatY{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-8px)}
}
@keyframes scanBar{
  0%{top:0%}100%{top:102%}
}
@keyframes raindrop{
  0%{transform:translateY(-6px);opacity:0}
  20%{opacity:1}
  100%{transform:translateY(30px);opacity:0}
}
@keyframes popIn{
  0%{transform:scale(0.82);opacity:0}
  70%{transform:scale(1.04)}
  100%{transform:scale(1);opacity:1}
}

/* ── utility ── */
.fu{animation:fadeUp .55s ease both}
.pi{animation:popIn .45s cubic-bezier(.34,1.56,.64,1) both}
.glass{
  backdrop-filter:blur(22px);
  -webkit-backdrop-filter:blur(22px);
  border-radius:22px;
  transition:background .4s,border-color .4s,transform .2s,box-shadow .25s;
}
.glass:hover{transform:translateY(-4px)}
.star{
  position:absolute;border-radius:50%;background:#fff;
  animation:twinkle var(--dur,3s) ease-in-out infinite;
  animation-delay:var(--dly,0s);
}
.orb-float{animation:floatY 6s ease-in-out infinite}
.live-dot{
  width:8px;height:8px;border-radius:50%;display:inline-block;
  position:relative;
}
.live-dot::before{
  content:'';position:absolute;inset:-4px;border-radius:50%;
  background:inherit;opacity:.45;
  animation:pulseRing 2s ease-out infinite;
}
.shimmer-text{
  background:linear-gradient(
    90deg,
    var(--sa) 0%,
    var(--sb) 35%,
    #fff 50%,
    var(--sb) 65%,
    var(--sa) 100%
  );
  background-size:200% auto;
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
  animation:shimmer 4s linear infinite;
}
.aqi-needle{
  transition:transform 1.2s cubic-bezier(.4,0,.2,1);
  transform-origin:50% 100%;
}
.scroll-x::-webkit-scrollbar{height:3px}
.scroll-x::-webkit-scrollbar-track{background:transparent}
.scroll-x::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:2px}
.hourly-card:hover{transform:scale(1.06)}
`;

/* ─────────────────────────────────────────────────────────── */
/*  FALLBACK DATA (shown before first backend response)        */
/* ─────────────────────────────────────────────────────────── */
const FALLBACK: EnvData = {
  temperature: 28,
  humidity: 68,
  pressure: 1012,
  windSpeed: 14,
  weather: "Partly Cloudy",
  description: "Partly cloudy afternoon",
  clouds: 35,
  rainChance: 40,
  aqi: 87,
  dayHigh: 31,
  dayLow: 22,
  nightHigh: 23,
  nightLow: 17,
};

const HOURLY_DAY: HourlyItem[] = [
  { h: "6AM", t: 24, r: 5, ic: "🌅" },
  { h: "9AM", t: 27, r: 8, ic: "☀" },
  { h: "12PM", t: 30, r: 15, ic: "☀" },
  { h: "Now", t: 28, r: 40, ic: "⛅" },
  { h: "3PM", t: 29, r: 55, ic: "🌦" },
  { h: "6PM", t: 25, r: 30, ic: "🌤" },
  { h: "9PM", t: 22, r: 10, ic: "🌙" },
];
const HOURLY_NIGHT: HourlyItem[] = [
  { h: "9PM", t: 22, r: 10, ic: "🌙" },
  { h: "12AM", t: 20, r: 8, ic: "🌙" },
  { h: "Now", t: 18, r: 5, ic: "⭐" },
  { h: "3AM", t: 17, r: 4, ic: "🌙" },
  { h: "6AM", t: 19, r: 6, ic: "🌅" },
  { h: "9AM", t: 23, r: 10, ic: "☀" },
  { h: "12PM", t: 28, r: 18, ic: "☀" },
];

/* ─────────────────────────────────────────────────────────── */
/*  SMALL HELPERS                                              */
/* ─────────────────────────────────────────────────────────── */
function toF(c: number) {
  return Math.round((c * 9) / 5 + 32);
}
function fmt(c: number, unit: Unit) {
  return unit === "C" ? `${c}°` : `${toF(c)}°`;
}

function Tag({
  label,
  color,
  borderColor,
}: {
  label: string;
  color: string;
  borderColor?: string;
}) {
  return (
    <span
      style={{
        fontFamily: "'Fira Code',monospace",
        fontSize: 10,
        letterSpacing: "0.13em",
        padding: "3px 11px",
        borderRadius: 999,
        border: `1px solid ${borderColor || color}`,
        color,
        textTransform: "uppercase",
        opacity: 0.8,
      }}
    >
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  PRESSURE GAUGE                                             */
/* ─────────────────────────────────────────────────────────── */
function PressureGauge({
  value,
  accent,
  muted,
  text,
}: {
  value: number;
  accent: string;
  muted: string;
  text: string;
}) {
  const min = 990,
    max = 1030;
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const R = 52,
    CX = 68,
    CY = 68;
  const circ = 2 * Math.PI * R;
  const arcDeg = 270;
  const arcLen = (arcDeg / 360) * circ;
  const filled = pct * arcLen;
  const label = value < 1000 ? "Low" : value < 1015 ? "Normal" : "High";
  const lcolor = value < 1000 ? "#f97316" : value < 1015 ? accent : "#34d399";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div style={{ position: "relative", width: 136, height: 136 }}>
        <svg
          width={136}
          height={136}
          viewBox="0 0 136 136"
          aria-label="Pressure gauge"
          role="img"
        >
          {/* Track */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={9}
            strokeDasharray={`${arcLen} ${circ}`}
            strokeLinecap="round"
            style={{ transform: "rotate(-225deg)", transformOrigin: "center" }}
          />
          {/* Fill */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={accent}
            strokeWidth={9}
            strokeDasharray={`${filled} ${circ}`}
            strokeLinecap="round"
            style={{
              transform: "rotate(-225deg)",
              transformOrigin: "center",
              transition: "stroke-dasharray 1.3s cubic-bezier(.4,0,.2,1)",
              filter: `drop-shadow(0 0 6px ${accent}90)`,
            }}
          />
          {/* Tick marks */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const ang = ((-225 + t * 270) * Math.PI) / 180;
            return (
              <line
                key={t}
                x1={CX + 44 * Math.cos(ang)}
                y1={CY + 44 * Math.sin(ang)}
                x2={CX + 52 * Math.cos(ang)}
                y2={CY + 52 * Math.sin(ang)}
                stroke="rgba(255,255,255,0.20)"
                strokeWidth={1.5}
              />
            );
          })}
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 28,
              color: text,
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            {value}
          </span>
          <span
            style={{
              fontFamily: "'Fira Code'",
              fontSize: 9,
              color: muted,
              letterSpacing: "0.15em",
              marginTop: 1,
            }}
          >
            hPa
          </span>
        </div>
      </div>
      <span
        style={{
          fontFamily: "'Fira Code'",
          fontSize: 11,
          fontWeight: 500,
          color: lcolor,
          letterSpacing: "0.1em",
        }}
      >
        {label.toUpperCase()} PRESSURE
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  AQI SEMICIRCLE                                             */
/* ─────────────────────────────────────────────────────────── */
function AQIGauge({ aqi, muted }: { aqi: number; muted: string }) {
  const band = aqiBand(aqi);
  const pct = Math.min(1, aqi / 300);
  // needle angle: -90° (left) to +90° (right), 180° total sweep
  const needleAngle = -90 + pct * 180;

  const R = 70,
    CX = 90,
    CY = 90;

  // Build colored band segments on top half
  const segments = [
    { from: 0, to: 50, color: "#4ade80" },
    { from: 50, to: 100, color: "#facc15" },
    { from: 100, to: 150, color: "#fb923c" },
    { from: 150, to: 200, color: "#f87171" },
    { from: 200, to: 300, color: "#c084fc" },
  ];

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div
        style={{
          position: "relative",
          width: 180,
          height: 100,
          overflow: "hidden",
        }}
      >
        <svg
          aria-label="Air quality index gauge"
          role="img"
          width={180}
          height={180}
          viewBox="0 0 180 180"
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          {/* Track half-circle */}
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={10}
          />
          {/* Colored band segments */}
          {segments.map((seg) => {
            const startPct = seg.from / 300;
            const endPct = Math.min(seg.to, 300) / 300;
            const startAng = Math.PI + startPct * Math.PI; // 180°→360°
            const endAng = Math.PI + endPct * Math.PI;
            const x1 = CX + R * Math.cos(startAng);
            const y1 = CY + R * Math.sin(startAng);
            const x2 = CX + R * Math.cos(endAng);
            const y2 = CY + R * Math.sin(endAng);
            const large = endAng - startAng > Math.PI ? 1 : 0;
            return (
              <path
                key={`${seg.from}-${seg.to}`}
                d={`M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`}
                fill="none"
                stroke={seg.color}
                strokeWidth={9}
                strokeOpacity={0.7}
                strokeLinecap="butt"
              />
            );
          })}
          {/* Needle */}
          <g
            style={{
              transform: `rotate(${needleAngle}deg)`,
              transformOrigin: `${CX}px ${CY}px`,
              transition: "transform 1.4s cubic-bezier(.4,0,.2,1)",
            }}
          >
            <line
              x1={CX}
              y1={CY}
              x2={CX}
              y2={CY - R + 8}
              stroke={band.color}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <circle cx={CX} cy={CY} r={5} fill={band.color} />
          </g>
          {/* Labels */}
          <text
            x={CX - R - 2}
            y={CY + 3}
            textAnchor="middle"
            style={{
              fontFamily: "'Fira Code'",
              fontSize: "9px",
              fill: "rgba(255,255,255,0.3)",
            }}
          >
            0
          </text>
          <text
            x={CX + R + 2}
            y={CY + 3}
            textAnchor="middle"
            style={{
              fontFamily: "'Fira Code'",
              fontSize: "9px",
              fill: "rgba(255,255,255,0.3)",
            }}
          >
            300
          </text>
        </svg>
      </div>
      {/* AQI number */}
      <div style={{ marginTop: -4, textAlign: "center" }}>
        <span
          style={{
            fontFamily: "'Bebas Neue'",
            fontSize: 48,
            color: band.color,
            letterSpacing: "0.02em",
            lineHeight: 1,
            filter: `drop-shadow(0 0 10px ${band.color}80)`,
          }}
        >
          {aqi}
        </span>
        <div
          style={{
            fontFamily: "'Fira Code'",
            fontSize: 11,
            color: band.color,
            letterSpacing: "0.12em",
            marginTop: 2,
            fontWeight: 500,
          }}
        >
          {band.label.toUpperCase()}
        </div>
        <div
          style={{
            fontFamily: "'Figtree'",
            fontSize: 12,
            color: muted,
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          {aqi <= 50
            ? "Air quality is excellent."
            : aqi <= 100
              ? "Acceptable — some pollutants present."
              : aqi <= 150
                ? "Sensitive groups may be affected."
                : aqi <= 200
                  ? "Everyone may experience effects."
                  : "Avoid prolonged outdoor activity."}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  HUMIDITY RING                                              */
/* ─────────────────────────────────────────────────────────── */
function HumidityRing({
  pct,
  accent,
  text,
  muted,
}: {
  pct: number;
  accent: string;
  text: string;
  muted: string;
}) {
  const R = 36,
    circ = 2 * Math.PI * R;
  const fill = (pct / 100) * circ;
  const comfort =
    pct < 40
      ? "Dry"
      : pct < 60
        ? "Comfortable"
        : pct < 75
          ? "Humid"
          : "Very Humid";
  const ccolor = pct < 60 ? "#34d399" : pct < 75 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div
        style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}
      >
        <svg
          width={90}
          height={90}
          viewBox="0 0 90 90"
          aria-label="Humidity gauge"
          role="img"
        >
          <circle
            cx={45}
            cy={45}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={7}
          />
          <circle
            cx={45}
            cy={45}
            r={R}
            fill="none"
            stroke={accent}
            strokeWidth={7}
            strokeDasharray={`${fill} ${circ}`}
            strokeLinecap="round"
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "center",
              transition: "stroke-dasharray 1.2s ease",
              filter: `drop-shadow(0 0 5px ${accent}80)`,
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 22,
              color: text,
              lineHeight: 1,
            }}
          >
            {pct}%
          </span>
          <span
            style={{
              fontFamily: "'Fira Code'",
              fontSize: 8,
              color: muted,
              letterSpacing: "0.1em",
            }}
          >
            HUM
          </span>
        </div>
      </div>
      <div>
        <div
          style={{
            fontFamily: "'Fira Code'",
            fontSize: 10,
            color: muted,
            letterSpacing: "0.1em",
            marginBottom: 6,
          }}
        >
          COMFORT LEVEL
        </div>
        <div
          style={{
            fontFamily: "'Figtree'",
            fontSize: 18,
            fontWeight: 700,
            color: ccolor,
            marginBottom: 4,
          }}
        >
          {comfort}
        </div>
        <div
          style={{
            width: 32,
            height: 2.5,
            background: ccolor,
            borderRadius: 2,
            opacity: 0.7,
          }}
        />
        <div
          style={{
            fontFamily: "'Fira Code'",
            fontSize: 11,
            color: muted,
            marginTop: 8,
          }}
        >
          Dew·{fmt(Math.round(pct * 0.15 + 10), "C")} · Cloud·
          {Math.round(pct * 0.6)}%
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  RAIN CHANCE BAR                                            */
/* ─────────────────────────────────────────────────────────── */
function RainBar({
  pct,
  text,
  muted,
}: {
  pct: number;
  text: string;
  muted: string;
}) {
  const color = pct < 25 ? "#4ade80" : pct < 55 ? "#60a5fa" : "#818cf8";
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: "'Fira Code'",
            fontSize: 10,
            color: muted,
            letterSpacing: "0.12em",
          }}
        >
          PRECIPITATION
        </span>
        <span
          style={{
            fontFamily: "'Bebas Neue'",
            fontSize: 22,
            color: text,
            letterSpacing: "0.04em",
            lineHeight: 1,
          }}
        >
          {pct}%
        </span>
      </div>
      {/* Bar */}
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: `linear-gradient(90deg,${color},${color}aa)`,
            transition: "width 1.3s cubic-bezier(.4,0,.2,1)",
            boxShadow: `0 0 8px ${color}70`,
          }}
        />
      </div>
      {/* Rain drop animation */}
      {pct > 35 && (
        <div
          style={{
            position: "relative",
            height: 34,
            marginTop: 10,
            overflow: "hidden",
          }}
        >
          {RAIN_DROPS.slice(0, Math.min(10, Math.floor(pct / 8))).map(
            (drop) => (
              <div
                key={drop.id}
                style={{
                  position: "absolute",
                  left: drop.left,
                  width: 2,
                  height: 10,
                  background: `${color}bb`,
                  borderRadius: 1,
                  animation: `raindrop ${drop.duration} linear infinite`,
                  animationDelay: drop.delay,
                }}
              />
            ),
          )}
        </div>
      )}
      <div
        style={{
          fontFamily: "'Figtree'",
          fontSize: 12,
          color: muted,
          marginTop: pct > 35 ? 4 : 14,
          lineHeight: 1.5,
        }}
      >
        {pct < 25
          ? "Clear skies expected — no umbrella needed."
          : pct < 55
            ? "Possible showers — carry an umbrella."
            : "High rain probability — stay prepared."}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  HOURLY STRIP                                               */
/* ─────────────────────────────────────────────────────────── */
function HourlyStrip({
  items,
  unit,
  accent,
  card,
  cardBorder,
  accentSoft,
  text,
  muted,
}: {
  items: HourlyItem[];
  unit: Unit;
  accent: string;
  card: string;
  cardBorder: string;
  accentSoft: string;
  text: string;
  muted: string;
}) {
  return (
    <div
      className="scroll-x"
      style={{
        display: "flex",
        gap: 10,
        overflowX: "auto",
        paddingBottom: 6,
      }}
    >
      {items.map((h, i) => (
        <div
          key={`${h.h}-${h.t}-${h.ic}`}
          className="hourly-card"
          style={{
            flexShrink: 0,
            minWidth: 68,
            background: i === 3 ? accentSoft : card,
            border: `1px solid ${i === 3 ? `${accent}44` : cardBorder}`,
            borderRadius: 16,
            padding: "12px 10px",
            textAlign: "center",
            backdropFilter: "blur(18px)",
            transition: "transform .15s",
            cursor: "default",
          }}
        >
          <div
            style={{
              fontFamily: "'Fira Code'",
              fontSize: 9,
              color: muted,
              letterSpacing: "0.08em",
              marginBottom: 6,
            }}
          >
            {h.h}
          </div>
          <div style={{ fontSize: 20, marginBottom: 6 }}>{h.ic}</div>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 18,
              color: text,
              letterSpacing: "0.04em",
              marginBottom: 4,
              lineHeight: 1,
            }}
          >
            {fmt(h.t, unit)}
          </div>
          <div
            style={{
              fontFamily: "'Fira Code'",
              fontSize: 9,
              color: h.r > 40 ? "#60a5fa" : muted,
            }}
          >
            {h.r}%
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  STAT TILE                                                  */
/* ─────────────────────────────────────────────────────────── */
function StatTile({
  icon,
  label,
  value,
  card,
  cardBorder,
  text,
  muted,
  delay = 0,
}: {
  icon: string;
  label: string;
  value: string;
  card: string;
  cardBorder: string;
  text: string;
  muted: string;
  delay?: number;
}) {
  return (
    <div
      className="glass fu"
      style={{
        background: card,
        border: `1px solid ${cardBorder}`,
        padding: "16px 18px",
        animationDelay: `${delay}s`,
      }}
    >
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <div
        style={{
          fontFamily: "'Fira Code'",
          fontSize: 9,
          color: muted,
          letterSpacing: "0.12em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Figtree'",
          fontSize: 15,
          fontWeight: 600,
          color: text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  SECTION LABEL                                              */
/* ─────────────────────────────────────────────────────────── */
function SectionLabel({
  children,
  muted,
  border,
}: {
  children: ReactNode;
  muted: string;
  border: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "'Fira Code'",
        fontSize: 9,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: muted,
        marginBottom: 18,
      }}
    >
      {children}
      <div style={{ flex: 1, height: 1, background: border }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  MAIN COMPONENT                                             */
/* ─────────────────────────────────────────────────────────── */
export default function EnviroBoard() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>("day");
  const [unit, setUnit] = useState<Unit>("C");
  const [time, setTime] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState("");
  const [city, setCity] = useState("Bangalore, Karnataka");
  const [data, setData] = useState<EnvData>(FALLBACK);

  const TH = THEMES[mode];

  // Accent softs
  const accentSoft =
    mode === "day" ? "rgba(251,191,36,0.14)" : "rgba(165,180,252,0.12)";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Clock
  useEffect(() => {
    if (!mounted) return;
    const tick = () =>
      setTime(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mounted]);

  // Fetch
  useEffect(() => {
    if (!mounted) return;

    const API = "https://environmental-detection-system.onrender.com";

    const asRecord = (value: unknown): ApiRecord =>
      value && typeof value === "object" ? (value as ApiRecord) : {};

    const readNumber = (value: unknown, fallback: number) => {
      return typeof value === "number" ? value : fallback;
    };

    const readString = (value: unknown, fallback: string) => {
      return typeof value === "string" ? value : fallback;
    };

    const fetchData = async () => {
      try {
        const sensorResponse = await fetch(`${API}/sensor-data`);
        const sensorData = asRecord(await sensorResponse.json());

        const predictionResponse = await fetch(`${API}/predict`);
        const predictionData = asRecord(await predictionResponse.json());

        const nextRainChance = readNumber(
          predictionData.rainChance,
          readNumber(sensorData.rainChance, FALLBACK.rainChance),
        );

        setData((current) => ({
          ...current,
          temperature: readNumber(sensorData.temperature, current.temperature),
          humidity: readNumber(sensorData.humidity, current.humidity),
          pressure: readNumber(sensorData.pressure, current.pressure),
          windSpeed: readNumber(sensorData.windSpeed, current.windSpeed),
          weather: readString(sensorData.weather, current.weather),
          description: readString(
            sensorData.description,
            readString(predictionData.rainPrediction, current.description),
          ),
          clouds: readNumber(sensorData.clouds, current.clouds),
          rainChance: nextRainChance,
          aqi: readNumber(sensorData.aqi, current.aqi),
        }));

        setCity(readString(sensorData.city, "Bangalore, Karnataka"));

        try {
          const historyResponse = await fetch(`${API}/history`);
          const historyData: unknown = await historyResponse.json();

          if (Array.isArray(historyData)) {
            const temperatures = historyData
              .map((item) => readNumber(asRecord(item).temperature, NaN))
              .filter(Number.isFinite);

            if (temperatures.length > 0) {
              setData((current) => ({
                ...current,
                dayHigh: Math.max(...temperatures),
                dayLow: Math.min(...temperatures),
              }));
            }
          }
        } catch {
          console.log("History API not available");
        }

        setLastSync(new Date().toLocaleTimeString("en-IN", { hour12: false }));
        setErr(null);
      } catch (error) {
        console.error("Backend Error:", error);
        setErr("Cannot connect to backend server");
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [mounted]);

  if (!mounted) return null;

  const curHigh = mode === "day" ? data.dayHigh : data.nightHigh;
  const curLow = mode === "day" ? data.dayLow : data.nightLow;
  const hourly = mode === "day" ? HOURLY_DAY : HOURLY_NIGHT;

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div
        style={{
          minHeight: "100vh",
          background: TH.bg,
          color: TH.text,
          position: "relative",
          overflow: "hidden",
          paddingBottom: 70,
          transition: "background 1.2s ease",
        }}
      >
        {/* ── NEBULA BLOBS ── */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 400,
            left: "-10%",
            top: "10%",
            borderRadius: "50%",
            background: TH.nebula1,
            filter: "blur(80px)",
            pointerEvents: "none",
            transition: "background 1.2s",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 350,
            right: "-5%",
            bottom: "15%",
            borderRadius: "50%",
            background: TH.nebula2,
            filter: "blur(70px)",
            pointerEvents: "none",
            transition: "background 1.2s",
          }}
        />

        {/* ── STARS ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: TH.stars ? 1 : 0,
            transition: "opacity 1.4s ease",
          }}
        >
          {STARS.map((s, i) => (
            <div
              key={`star-${s.x}-${s.y}-${i}`}
              className="star"
              style={
                {
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: s.r * 2,
                  height: s.r * 2,
                  "--dur": `${s.dur}s`,
                  "--dly": `${s.dly}s`,
                  "--lo": s.lo,
                } as CustomStyle
              }
            />
          ))}
        </div>

        {/* ── SUN / MOON ORB ── */}
        <div
          className="orb-float"
          style={{
            position: "absolute",
            top: 56,
            right: 72,
            transition: "all 1.2s ease",
          }}
        >
          <div
            style={{
              width: TH.orbSize,
              height: TH.orbSize,
              borderRadius: "50%",
              background: TH.orb,
              boxShadow: TH.orbGlow,
              transition: "all 1.2s ease",
              position: "relative",
            }}
          >
            {/* Moon craters */}
            {mode === "night" && (
              <>
                <div
                  style={{
                    position: "absolute",
                    width: 13,
                    height: 13,
                    borderRadius: "50%",
                    background: "rgba(100,130,200,0.28)",
                    top: 14,
                    left: 18,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "rgba(100,130,200,0.20)",
                    top: 34,
                    left: 42,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "rgba(100,130,200,0.22)",
                    top: 22,
                    left: 48,
                  }}
                />
              </>
            )}
          </div>
        </div>

        {/* ── ERROR BANNER ── */}
        {err && (
          <div
            style={{
              margin: "16px 44px 0",
              padding: "12px 18px",
              borderRadius: 14,
              background: "rgba(127,29,29,0.28)",
              border: "1px solid rgba(248,113,113,0.28)",
              color: "#fca5a5",
              fontFamily: "'Fira Code',monospace",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            ⚠ {err}
          </div>
        )}

        {/* ─────────── HEADER ─────────── */}
        <header
          style={{
            height: 66,
            borderBottom: `1px solid ${TH.cardBorder}`,
            display: "flex",
            alignItems: "center",
            padding: "0 44px",
            position: "sticky",
            top: 0,
            zIndex: 100,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            background: "rgba(0,0,0,0.25)",
            transition: "border-color .4s",
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                border: `1px solid ${TH.accentA}40`,
                background: `${TH.accentA}12`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              🌍
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 22,
                  color: TH.text,
                  letterSpacing: "0.06em",
                  lineHeight: 1,
                }}
              >
                EnviroBoard
              </div>
              <div
                style={{
                  fontFamily: "'Fira Code'",
                  fontSize: 9,
                  color: TH.muted,
                  letterSpacing: "0.14em",
                  marginTop: 1,
                }}
              >
                ENVIRONMENTAL INTELLIGENCE
              </div>
            </div>
          </div>

          {/* Right */}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 22,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="live-dot" style={{ background: TH.accentC }} />
              <span
                style={{
                  fontFamily: "'Fira Code'",
                  fontSize: 10,
                  color: TH.accentC,
                  letterSpacing: "0.12em",
                }}
              >
                LIVE
              </span>
            </div>
            {lastSync && (
              <span
                style={{
                  fontFamily: "'Fira Code'",
                  fontSize: 10,
                  color: TH.muted,
                }}
              >
                sync <span style={{ color: TH.text }}>{lastSync}</span>
              </span>
            )}
            <span
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 20,
                color: TH.accentA,
                letterSpacing: "0.06em",
              }}
            >
              {time}
            </span>
          </div>
        </header>

        {/* ─────────── PAGE BODY ─────────── */}
        <div style={{ padding: "40px 44px 0" }}>
          {/* ── HERO ROW ── */}
          <div
            className="fu"
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 20,
              marginBottom: 12,
            }}
          >
            <div>
              {/* Tags */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                <Tag label="Real-time" color={TH.accentA} />
                <Tag label="IoT Sensor" color={TH.accentB} />
                <Tag label="AI-Powered" color={TH.accentC} />
              </div>

              {/* Big temp */}
              <div
                style={
                  {
                    fontFamily: "'Bebas Neue'",
                    fontSize: "clamp(72px,11vw,130px)",
                    lineHeight: 1,
                    letterSpacing: "0.01em",
                    "--sa": TH.accentA,
                    "--sb": TH.accentB,
                  } as CustomStyle
                }
                className="shimmer-text"
              >
                {fmt(data.temperature, "C" === unit ? "C" : "F")}
              </div>

              {/* Description + location */}
              <div
                style={{
                  fontFamily: "'Figtree'",
                  fontSize: 15,
                  color: TH.muted,
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>📍</span>
                <span style={{ color: TH.accentB }}>{city}</span>
                <span style={{ opacity: 0.4 }}>—</span>
                <span>{data.description}</span>
              </div>
            </div>

            {/* Controls */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                alignItems: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setMode((m) => (m === "day" ? "night" : "day"))}
                style={{
                  fontFamily: "'Fira Code'",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  padding: "8px 20px",
                  borderRadius: 999,
                  cursor: "pointer",
                  border: `1px solid ${TH.accentA}50`,
                  background: `${TH.accentA}14`,
                  color: TH.accentA,
                  transition: "all .3s",
                }}
              >
                {mode === "day" ? "☀ DAY" : "☽ NIGHT"}
              </button>
              <button
                type="button"
                onClick={() => setUnit((u) => (u === "C" ? "F" : "C"))}
                style={{
                  fontFamily: "'Fira Code'",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  padding: "8px 20px",
                  borderRadius: 999,
                  cursor: "pointer",
                  border: `1px solid ${TH.cardBorder}`,
                  background: TH.card,
                  color: TH.text,
                  transition: "all .3s",
                }}
              >
                °{unit}
              </button>
            </div>
          </div>

          {/* ── HIGH / LOW STRIP ── */}
          <div
            className="fu"
            style={{
              display: "flex",
              marginBottom: 40,
              background: TH.card,
              border: `1px solid ${TH.cardBorder}`,
              borderRadius: 16,
              padding: "14px 24px",
              backdropFilter: "blur(18px)",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 0,
              animationDelay: ".05s",
            }}
          >
            {[
              { l: "HIGH", v: fmt(curHigh, unit), color: TH.accentA },
              { l: "LOW", v: fmt(curLow, unit), color: TH.muted },
              {
                l: "FEELS LIKE",
                v: fmt(data.temperature - 2, unit),
                color: TH.text,
              },
              { l: "WIND", v: `${data.windSpeed} m/s`, color: TH.accentB },
              { l: "CLOUDS", v: `${data.clouds}%`, color: TH.accentC },
            ].map((s, i) => (
              <div key={s.l} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && (
                  <div
                    style={{
                      width: 1,
                      height: 28,
                      background: TH.cardBorder,
                      margin: "0 22px",
                    }}
                  />
                )}
                <div>
                  <div
                    style={{
                      fontFamily: "'Fira Code'",
                      fontSize: 9,
                      color: TH.label,
                      letterSpacing: "0.12em",
                      marginBottom: 2,
                    }}
                  >
                    {s.l}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Bebas Neue'",
                      fontSize: 24,
                      color: s.color,
                      letterSpacing: "0.04em",
                      lineHeight: 1,
                    }}
                  >
                    {s.v}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── MAIN METRIC CARDS ── */}
          <SectionLabel muted={TH.muted} border={TH.cardBorder}>
            Core Readings
          </SectionLabel>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))",
              gap: 20,
              marginBottom: 36,
            }}
          >
            {/* RAIN CHANCE */}
            <div
              className="glass fu"
              style={{
                background: TH.card,
                border: `1px solid ${TH.cardBorder}`,
                padding: "26px 26px 22px",
                animationDelay: ".08s",
              }}
            >
              <div
                style={{
                  fontFamily: "'Fira Code'",
                  fontSize: 9,
                  color: TH.label,
                  letterSpacing: "0.18em",
                  marginBottom: 18,
                }}
              >
                🌧 RAIN PROBABILITY
              </div>
              <RainBar pct={data.rainChance} text={TH.text} muted={TH.muted} />
            </div>

            {/* HUMIDITY */}
            <div
              className="glass fu"
              style={{
                background: TH.card,
                border: `1px solid ${TH.cardBorder}`,
                padding: "26px 26px 22px",
                animationDelay: ".14s",
              }}
            >
              <div
                style={{
                  fontFamily: "'Fira Code'",
                  fontSize: 9,
                  color: TH.label,
                  letterSpacing: "0.18em",
                  marginBottom: 18,
                }}
              >
                💧 HUMIDITY
              </div>
              <HumidityRing
                pct={data.humidity}
                accent={TH.accentB}
                text={TH.text}
                muted={TH.muted}
              />
            </div>

            {/* PRESSURE */}
            <div
              className="glass fu"
              style={{
                background: TH.card,
                border: `1px solid ${TH.cardBorder}`,
                padding: "26px 26px 22px",
                animationDelay: ".20s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'Fira Code'",
                  fontSize: 9,
                  color: TH.label,
                  letterSpacing: "0.18em",
                  marginBottom: 14,
                  alignSelf: "flex-start",
                }}
              >
                🌡 PRESSURE
              </div>
              <PressureGauge
                value={data.pressure}
                accent={TH.accentA}
                muted={TH.muted}
                text={TH.text}
              />
            </div>
          </div>

          {/* ── POLLUTION CARD ── */}
          <SectionLabel muted={TH.muted} border={TH.cardBorder}>
            Air Quality Index
          </SectionLabel>

          <div
            className="glass fu"
            style={{
              background: TH.card,
              border: `1px solid ${TH.cardBorder}`,
              padding: "28px 32px 28px",
              marginBottom: 36,
              animationDelay: ".24s",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 32,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <AQIGauge aqi={data.aqi} muted={TH.muted} />
              </div>
              {/* Pollutant breakdown */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  minWidth: 200,
                }}
              >
                {[
                  {
                    label: "PM2.5",
                    v: Math.round(data.aqi * 0.28),
                    unit: "µg/m³",
                    color: "#f87171",
                  },
                  {
                    label: "PM10",
                    v: Math.round(data.aqi * 0.45),
                    unit: "µg/m³",
                    color: "#fb923c",
                  },
                  {
                    label: "NO₂",
                    v: Math.round(data.aqi * 0.18),
                    unit: "ppb",
                    color: "#facc15",
                  },
                  {
                    label: "O₃",
                    v: Math.round(data.aqi * 0.22),
                    unit: "ppb",
                    color: "#34d399",
                  },
                  {
                    label: "CO",
                    v: +(data.aqi * 0.006).toFixed(1),
                    unit: "ppm",
                    color: "#60a5fa",
                  },
                ].map((p) => (
                  <div key={p.label}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Fira Code'",
                          fontSize: 10,
                          color: TH.muted,
                          letterSpacing: "0.08em",
                        }}
                      >
                        {p.label}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Fira Code'",
                          fontSize: 10,
                          color: p.color,
                        }}
                      >
                        {p.v} {p.unit}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 3,
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.07)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, (p.v / 150) * 100)}%`,
                          height: "100%",
                          background: p.color,
                          borderRadius: 999,
                          transition: "width 1.2s ease",
                          boxShadow: `0 0 5px ${p.color}70`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── HOURLY FORECAST ── */}
          <SectionLabel muted={TH.muted} border={TH.cardBorder}>
            Hourly Forecast
          </SectionLabel>

          <div
            className="fu"
            style={{ marginBottom: 36, animationDelay: ".28s" }}
          >
            <HourlyStrip
              items={hourly}
              unit={unit}
              accent={TH.accentA}
              card={TH.card}
              cardBorder={TH.cardBorder}
              accentSoft={accentSoft}
              text={TH.text}
              muted={TH.muted}
            />
          </div>

          {/* ── BOTTOM STAT TILES ── */}
          <SectionLabel muted={TH.muted} border={TH.cardBorder}>
            At a Glance
          </SectionLabel>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(128px,1fr))",
              gap: 14,
            }}
          >
            {[
              { icon: "🌅", label: "SUNRISE", value: "06:08 AM" },
              { icon: "🌇", label: "SUNSET", value: "06:42 PM" },
              { icon: "💨", label: "WIND", value: `${data.windSpeed} m/s` },
              { icon: "👁", label: "VISIBILITY", value: "9.4 km" },
              {
                icon: "☀",
                label: "UV INDEX",
                value: mode === "day" ? "6 — High" : "0 — None",
              },
              { icon: "🌊", label: "HUMIDITY", value: `${data.humidity}%` },
            ].map((s, i) => (
              <StatTile
                key={s.label}
                {...s}
                card={TH.card}
                cardBorder={TH.cardBorder}
                text={TH.text}
                muted={TH.muted}
                delay={0.3 + i * 0.04}
              />
            ))}
          </div>
        </div>
        {/* end page body */}
      </div>
    </>
  );
}
