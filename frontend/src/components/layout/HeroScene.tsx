import { useTheme } from "../../theme/ThemeProvider";

/**
 * 六套主题各自的 Hero 场景插画。
 * 全部使用主题色变量绘制，换肤时插画会跟着一起变。
 */
export function HeroScene({ className = "" }: { className?: string }) {
  const { theme } = useTheme();
  const svgProps = {
    viewBox: "0 0 320 240",
    role: "img" as const,
    "aria-label": "学习主题插画",
    className: `h-auto w-full max-w-[22rem] ${className}`,
  };

  switch (theme) {
    case "whale":
      return <WhaleScene {...svgProps} />;
    case "sunrise":
      return <SunriseScene {...svgProps} />;
    case "ink":
      return <InkScene {...svgProps} />;
    case "mint":
      return <MintScene {...svgProps} />;
    case "aurora":
      return <AuroraScene {...svgProps} />;
    case "sakura":
      return <SakuraScene {...svgProps} />;
    default:
      return null;
  }
}

type SceneProps = {
  viewBox: string;
  role: "img";
  "aria-label": string;
  className: string;
};

function WhaleScene(props: SceneProps) {
  return (
    <svg {...props}>
      <defs>
        <linearGradient id="whale-body" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent-2))" />
          <stop offset="55%" stopColor="rgb(var(--c-accent))" />
          <stop offset="100%" stopColor="rgb(var(--c-accent-2))" />
        </linearGradient>
        <linearGradient id="whale-wave" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.26" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0.02" />
        </linearGradient>
        <clipPath id="whale-clip">
          <path d="M50 146c-2-36 32-64 78-64 48 0 86 28 90 64 2 24-18 38-46 38H98c-26 0-46-16-48-38Z" />
        </clipPath>
      </defs>

      <circle cx="172" cy="106" r="96" fill="rgb(var(--c-accent))" opacity="0.07" />
      <circle cx="172" cy="106" r="64" fill="rgb(var(--c-accent-2))" opacity="0.07" />

      <g className="float-soft">
        <path d="M210 144 272 116 254 148Z" fill="rgb(var(--c-accent-2))" />
        <path d="M210 152 272 180 254 148Z" fill="rgb(var(--c-accent-2))" opacity="0.82" />

        <path
          d="M50 146c-2-36 32-64 78-64 48 0 86 28 90 64 2 24-18 38-46 38H98c-26 0-46-16-48-38Z"
          fill="url(#whale-body)"
        />
        <g clipPath="url(#whale-clip)">
          <ellipse cx="128" cy="200" rx="82" ry="32" fill="#ffffff" opacity="0.4" />
          <path d="M62 116c28-14 62-16 92-4" stroke="#ffffff" strokeOpacity="0.26" strokeWidth="6" strokeLinecap="round" fill="none" />
        </g>
        <path d="M126 180c-6 17-21 29-40 32 9-13 15-23 17-33Z" fill="rgb(var(--c-accent-2))" opacity="0.9" />
        <circle cx="86" cy="126" r="5.6" fill="rgb(var(--hero-ink))" opacity="0.85" />
        <circle cx="88" cy="124" r="1.9" fill="#ffffff" opacity="0.92" />
        <path
          d="M82 144c8 8 20 9 30 3"
          stroke="rgb(var(--hero-ink))"
          strokeOpacity="0.5"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      <g className="drift-soft" fill="rgb(var(--c-accent-2))">
        <circle cx="150" cy="66" r="6" opacity="0.55" />
        <circle cx="160" cy="48" r="4.4" opacity="0.7" />
        <circle cx="146" cy="34" r="3.2" opacity="0.5" />
        <circle cx="168" cy="30" r="2.4" opacity="0.38" />
        <circle cx="136" cy="54" r="2.6" opacity="0.4" />
        <circle cx="154" cy="20" r="1.8" opacity="0.3" />
      </g>

      <g className="drift-soft" fill="rgb(var(--c-accent))" opacity="0.28">
        <circle cx="44" cy="74" r="5" />
        <circle cx="272" cy="56" r="7" />
        <circle cx="292" cy="98" r="4" />
        <circle cx="26" cy="120" r="3.4" />
        <circle cx="60" cy="36" r="2.6" />
      </g>

      <path d="M0 202c26-14 52-14 78 0s52 14 78 0 52-14 78 0 52 14 86 0v38H0Z" fill="url(#whale-wave)" />
      <path
        d="M0 214c26-12 52-12 78 0s52 12 78 0 52-12 78 0 52 12 86 0v26H0Z"
        fill="rgb(var(--c-accent))"
        opacity="0.1"
      />
    </svg>
  );
}

function SunriseScene(props: SceneProps) {
  return (
    <svg {...props}>
      <defs>
        <radialGradient id="sun-glow">
          <stop offset="0%" stopColor="rgb(var(--c-accent-2))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="rgb(var(--c-accent-2))" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sun-hill-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.26" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="sun-hill-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0.14" />
        </linearGradient>
      </defs>

      <circle cx="204" cy="96" r="108" fill="url(#sun-glow)" />
      <g className="float-soft">
        <circle cx="204" cy="96" r="48" fill="rgb(var(--c-accent-2))" />
        <circle cx="204" cy="96" r="48" fill="none" stroke="rgb(var(--c-accent))" strokeOpacity="0.28" strokeWidth="10" />
        <circle cx="204" cy="96" r="34" fill="rgb(var(--c-accent))" opacity="0.12" />
      </g>
      <g stroke="rgb(var(--c-accent))" strokeWidth="3.2" strokeLinecap="round" opacity="0.45">
        <path d="M204 26v-12" />
        <path d="M146 46 138 36" />
        <path d="M262 46 270 36" />
        <path d="M126 96h-14" />
        <path d="M296 96h-14" />
      </g>

      <path d="M-10 198c50-46 96-46 146 0 44-38 92-38 138 0 22-18 44-24 66-18v70H-10Z" fill="url(#sun-hill-far)" />
      <path d="M-10 216c54-32 104-32 158 0 48-26 98-26 148 0 14-6 24-8 34-6v40H-10Z" fill="url(#sun-hill-near)" />

      <g stroke="rgb(var(--hero-ink))" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.38">
        <path d="M60 76c6-6 12-6 18 0" />
        <path d="M82 64c5-5 10-5 15 0" />
        <path d="M44 96c4-4 8-4 12 0" opacity="0.7" />
      </g>
      <g fill="rgb(var(--c-accent))" opacity="0.4">
        <circle cx="54" cy="126" r="3.4" />
        <circle cx="86" cy="146" r="2.2" />
        <circle cx="42" cy="160" r="2.6" />
      </g>
    </svg>
  );
}

function InkScene(props: SceneProps) {
  return (
    <svg {...props}>
      <defs>
        <linearGradient id="ink-mountain-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-ink))" stopOpacity="0.34" />
          <stop offset="100%" stopColor="rgb(var(--c-ink))" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="ink-mountain-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-ink))" stopOpacity="0.62" />
          <stop offset="100%" stopColor="rgb(var(--c-ink))" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="ink-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-ink))" stopOpacity="0.1" />
          <stop offset="100%" stopColor="rgb(var(--c-ink))" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="230" cy="64" r="34" fill="rgb(var(--c-accent))" opacity="0.1" />
      <circle cx="230" cy="64" r="34" fill="none" stroke="rgb(var(--c-accent))" strokeOpacity="0.22" strokeWidth="1.5" />

      <path d="M-20 190 66 112 112 158 152 124 216 190Z" fill="url(#ink-mountain-far)" />
      <path d="M112 192 198 108 246 158 288 126 336 192Z" fill="url(#ink-mountain-near)" />
      <path d="M-20 192h360v48h-360Z" fill="url(#ink-ground)" />

      <g stroke="rgb(var(--c-ink))" strokeOpacity="0.22" strokeWidth="1.6" strokeLinecap="round">
        <path d="M20 176h74" />
        <path d="M232 178h62" opacity="0.7" />
        <path d="M40 158h44" opacity="0.5" />
      </g>

      <g opacity="0.55" fill="rgb(var(--c-ink))">
        <path d="M92 184c7 4 17 4 24 0l-3 6H95z" />
        <path d="M104 184v-12" stroke="rgb(var(--c-ink))" strokeWidth="1.4" />
      </g>

      <g className="float-soft" style={{ animationDuration: "9s" }}>
        <rect x="252" y="140" width="42" height="42" rx="6" fill="rgb(var(--c-accent))" opacity="0.92" />
        <text x="273" y="170" textAnchor="middle" fontFamily="Songti SC, serif" fontSize="23" fill="rgb(var(--c-on-accent))">
          学
        </text>
      </g>

      <g fill="rgb(var(--c-ink))" opacity="0.2">
        <circle cx="58" cy="60" r="4" />
        <circle cx="80" cy="44" r="2.4" />
        <circle cx="40" cy="40" r="2" />
      </g>
    </svg>
  );
}

function MintScene(props: SceneProps) {
  return (
    <svg {...props}>
      <defs>
        <linearGradient id="mint-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent-2))" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" />
        </linearGradient>
      </defs>
      <circle cx="176" cy="112" r="94" fill="rgb(var(--c-accent))" opacity="0.07" />
      <circle cx="176" cy="112" r="64" fill="rgb(var(--c-accent))" opacity="0.06" />
      <g className="float-soft">
        <path
          d="M208 34c36 32 38 88 6 120-30 30-76 26-96-4-14-20-8-46 12-62 26-22 54-38 78-54Z"
          fill="url(#mint-leaf)"
          opacity="0.92"
        />
        <path
          d="M106 180c28-40 56-68 96-88"
          stroke="rgb(var(--c-panel))"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
        <path
          d="M96 92c-26 10-38 34-30 58 22 2 42-12 48-32 4-12 0-22-8-26-3-1-6-1-10 0Z"
          fill="rgb(var(--c-accent-2))"
          opacity="0.5"
        />
      </g>
      <g fill="none" stroke="rgb(var(--c-accent))" strokeWidth="2.4" opacity="0.4">
        <circle cx="250" cy="152" r="16" />
        <circle cx="266" cy="186" r="9" />
        <circle cx="70" cy="52" r="11" />
      </g>
      <g fill="rgb(var(--c-accent))" opacity="0.32">
        <circle cx="62" cy="142" r="5" />
        <circle cx="86" cy="162" r="3" />
        <circle cx="278" cy="92" r="4" />
      </g>
      <path d="M-8 208c50-22 96-22 146 0s96 22 146 0 44-14 44-14v46H-8Z" fill="rgb(var(--c-accent))" opacity="0.1" />
    </svg>
  );
}

function AuroraScene(props: SceneProps) {
  return (
    <svg {...props}>
      <defs>
        <linearGradient id="aurora-band-1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
          <stop offset="38%" stopColor="rgb(var(--c-accent))" stopOpacity="0.8" />
          <stop offset="100%" stopColor="rgb(var(--c-accent-2))" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="aurora-band-2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(var(--c-accent-2))" stopOpacity="0" />
          <stop offset="52%" stopColor="rgb(var(--c-accent-2))" stopOpacity="0.6" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
        </linearGradient>
        <filter id="aurora-blur" x="-30%" y="-80%" width="160%" height="280%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <g filter="url(#aurora-blur)" className="drift-soft">
        <path
          d="M-40 118c70-72 128-24 190-58s110 6 170-26"
          stroke="url(#aurora-band-1)"
          strokeWidth="30"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M-40 168c78-52 136-8 198-44s104 4 162-30"
          stroke="url(#aurora-band-2)"
          strokeWidth="18"
          fill="none"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M-40 128c72-68 132-18 192-52s108 6 168-24"
        stroke="url(#aurora-band-1)"
        strokeWidth="5"
        fill="none"
        opacity="0.5"
        strokeLinecap="round"
      />

      <g fill="#ffffff" opacity="0.8">
        {[
          [46, 44, 1.7], [92, 30, 1.2], [140, 54, 1.5], [196, 34, 1.1],
          [248, 60, 1.6], [286, 40, 1.2], [70, 82, 1], [264, 96, 1], [30, 96, 0.9],
        ].map(([cx, cy, r], index) => (
          <circle key={index} cx={cx} cy={cy} r={r} />
        ))}
      </g>

      <path d="M150 168c10-16 22-22 36-22" stroke="rgb(var(--c-accent-2))" strokeWidth="2" fill="none" opacity="0.4" />
    </svg>
  );
}

function SakuraScene(props: SceneProps) {
  const blossoms: Array<[number, number, number]> = [
    [254, 64, 1.05],
    [224, 100, 1.15],
    [200, 148, 0.85],
    [212, 42, 0.75],
    [176, 96, 0.7],
    [236, 168, 0.6],
    [188, 188, 0.52],
    [160, 128, 0.46],
  ];
  return (
    <svg {...props}>
      <defs>
        <linearGradient id="sakura-petal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent-2))" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" />
        </linearGradient>
      </defs>
      <circle cx="176" cy="108" r="92" fill="rgb(var(--c-accent))" opacity="0.06" />

      <g className="float-soft">
        <path
          d="M330 26c-44 8-82 30-108 62-18 22-26 46-24 70"
          stroke="rgb(var(--c-accent))"
          strokeOpacity="0.4"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M256 60c-12-12-26-18-42-18"
          stroke="rgb(var(--c-accent))"
          strokeOpacity="0.35"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M216 112c-14-6-26-6-38 0"
          stroke="rgb(var(--c-accent))"
          strokeOpacity="0.3"
          strokeWidth="3.4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M206 156c-12 10-22 24-26 40"
          stroke="rgb(var(--c-accent))"
          strokeOpacity="0.26"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        {blossoms.map(([cx, cy, scale], index) => (
          <g key={index} transform={`translate(${cx} ${cy}) scale(${scale})`}>
            {[0, 72, 144, 216, 288].map((angle) => (
              <ellipse
                key={angle}
                cx="0"
                cy="-10"
                rx="5.6"
                ry="9.6"
                fill="url(#sakura-petal)"
                transform={`rotate(${angle})`}
                opacity="0.94"
              />
            ))}
            <circle r="3" fill="rgb(var(--c-warn))" opacity="0.85" />
          </g>
        ))}
      </g>

      <g fill="rgb(var(--c-accent-2))" opacity="0.5" className="drift-soft">
        <ellipse cx="126" cy="74" rx="5.4" ry="3.2" transform="rotate(-24 126 74)" />
        <ellipse cx="96" cy="132" rx="4.6" ry="2.8" transform="rotate(18 96 132)" />
        <ellipse cx="152" cy="170" rx="4" ry="2.4" transform="rotate(-12 152 170)" />
        <ellipse cx="72" cy="102" rx="3.4" ry="2" transform="rotate(28 72 102)" />
      </g>
      <path d="M-8 206c46-20 90-20 136 0s90 20 136 0 44-12 44-12v46H-8Z" fill="rgb(var(--c-accent))" opacity="0.09" />
    </svg>
  );
}
