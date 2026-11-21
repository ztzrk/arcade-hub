import type { TebakKarakterCharacter } from "@arcade-hub/shared";

interface CharacterPortraitProps {
  character: TebakKarakterCharacter;
  className?: string;
}

export function CharacterPortrait({
  character,
  className = "h-full w-full",
}: CharacterPortraitProps) {
  const {
    bg,
    skin,
    hairStyle,
    hairColor,
    headwear,
    headwearColor = "#c84b3c",
    eyewear,
    facialHair,
    expression,
    accessory,
    shirtColor,
  } = character;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-label={character.name}
      role="img"
    >
      {/* Card Backdrop */}
      <rect width="100" height="100" fill={bg} />
      <circle cx="50" cy="48" r="42" fill="rgba(255,255,255,0.06)" />

      {/* Back Hair Layer */}
      {hairStyle === "long" && (
        <path
          d="M22 44 C20 20, 80 20, 78 44 L80 88 C72 90, 28 90, 20 88 Z"
          fill={hairColor}
        />
      )}
      {hairStyle === "bob" && (
        <path
          d="M23 44 C23 20, 77 20, 77 44 L78 70 C72 74, 65 73, 62 70 L38 70 C35 73, 28 74, 22 70 Z"
          fill={hairColor}
        />
      )}
      {hairStyle === "curly" && (
        <g fill={hairColor}>
          <circle cx="26" cy="44" r="11" />
          <circle cx="74" cy="44" r="11" />
          <circle cx="25" cy="58" r="10" />
          <circle cx="75" cy="58" r="10" />
          <circle cx="34" cy="27" r="12" />
          <circle cx="66" cy="27" r="12" />
          <circle cx="50" cy="22" r="13" />
        </g>
      )}
      {hairStyle === "afro" && (
        <g fill={hairColor}>
          <circle cx="50" cy="36" r="29" />
          <circle cx="27" cy="44" r="14" />
          <circle cx="73" cy="44" r="14" />
        </g>
      )}
      {hairStyle === "ponytail" && (
        <g fill={hairColor}>
          <path d="M68 34 C84 34, 88 56, 80 74 C74 72, 70 60, 68 46 Z" />
          <circle cx="69" cy="35" r="4.5" fill="#d4a24c" />
        </g>
      )}
      {hairStyle === "bun" && (
        <circle cx="50" cy="17" r="11" fill={hairColor} />
      )}

      {/* Shoulders & Shirt */}
      <path
        d="M16 100 C18 79, 32 74, 50 74 C68 74, 82 79, 84 100 Z"
        fill={shirtColor}
      />
      <path
        d="M41 74 L50 83 L59 74"
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Neck */}
      <rect x="43" y="64" width="14" height="14" rx="5" fill={skin} />
      <path
        d="M43 68 Q50 73 57 68"
        fill="none"
        stroke="rgba(0,0,0,0.16)"
        strokeWidth="2"
      />

      {/* Scarf Accessory */}
      {accessory === "scarf" && (
        <g>
          <path
            d="M32 75 Q50 85 68 75 Q65 88 50 88 Q35 88 32 75 Z"
            fill="#d4a24c"
          />
          <path
            d="M52 80 L60 98 L49 98 L46 82 Z"
            fill="#b88735"
          />
        </g>
      )}

      {/* Ears */}
      <circle cx="27.5" cy="49" r="5.5" fill={skin} />
      <circle cx="72.5" cy="49" r="5.5" fill={skin} />
      <circle cx="27.5" cy="49" r="2.5" fill="rgba(0,0,0,0.12)" />
      <circle cx="72.5" cy="49" r="2.5" fill="rgba(0,0,0,0.12)" />

      {/* Earrings */}
      {accessory === "earrings" && (
        <g fill="none" stroke="#f2c96b" strokeWidth="2.2">
          <circle cx="26.5" cy="56.5" r="3.2" />
          <circle cx="73.5" cy="56.5" r="3.2" />
        </g>
      )}

      {/* Head */}
      <rect x="28" y="25" width="44" height="46" rx="21" fill={skin} />

      {/* Bald shine */}
      {hairStyle === "bald" && headwear === "none" && (
        <path
          d="M39 30 Q46 27 52 29"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      )}

      {/* Blush */}
      {accessory === "blush" && (
        <g fill="#e46c6c" opacity="0.45">
          <ellipse cx="36" cy="53" rx="4.8" ry="2.6" />
          <ellipse cx="64" cy="53" rx="4.8" ry="2.6" />
        </g>
      )}

      {/* Freckles */}
      {accessory === "freckles" && (
        <g fill="#8c5438" opacity="0.65">
          <circle cx="35" cy="52" r="1" />
          <circle cx="38" cy="54" r="1" />
          <circle cx="40.5" cy="51.5" r="1" />
          <circle cx="65" cy="52" r="1" />
          <circle cx="62" cy="54" r="1" />
          <circle cx="59.5" cy="51.5" r="1" />
        </g>
      )}

      {/* Facial Hair: Full Beard */}
      {facialHair === "beard" && (
        <path
          d="M28.5 50 C28.5 67, 38 73, 50 73 C62 73, 71.5 67, 71.5 50 C69 56, 63 58, 57 57 C54 56, 46 56, 43 57 C37 58, 31 56, 28.5 50 Z"
          fill={hairColor}
        />
      )}

      {/* Facial Hair: Goatee */}
      {facialHair === "goatee" && (
        <path
          d="M43 60 Q50 58 57 60 L55 70 Q50 72 45 70 Z"
          fill={hairColor}
        />
      )}

      {/* Nose */}
      <path
        d="M50 46 L48 53 L52 53"
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Eyes & Eyebrows */}
      <g>
        {/* Eyebrows */}
        {expression === "surprised" ? (
          <g
            fill="none"
            stroke="#1f1d1c"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M35 39 Q40 35 44 38" />
            <path d="M56 38 Q60 35 65 39" />
          </g>
        ) : (
          <g
            fill="none"
            stroke="#1f1d1c"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M35 41 Q40 39 44 41" />
            <path d="M56 41 Q60 39 65 41" />
          </g>
        )}

        {/* Left Eye */}
        {expression === "chill" ? (
          <g>
            <circle cx="40" cy="46" r="2.7" fill="#1f1d1c" />
            <path
              d="M36 45 H44"
              stroke={skin}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M36 45.5 Q40 44 44 45.5"
              fill="none"
              stroke="#1f1d1c"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
        ) : (
          <g>
            <circle
              cx="40"
              cy="46"
              r={expression === "surprised" ? 3.4 : 2.8}
              fill="#1f1d1c"
            />
            <circle cx="41" cy="45" r="0.9" fill="#ffffff" />
          </g>
        )}

        {/* Right Eye */}
        {expression === "wink" ? (
          <path
            d="M56 46 Q60 43 64 46"
            fill="none"
            stroke="#1f1d1c"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        ) : expression === "chill" ? (
          <g>
            <circle cx="60" cy="46" r="2.7" fill="#1f1d1c" />
            <path
              d="M56 45 H64"
              stroke={skin}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M56 45.5 Q60 44 64 45.5"
              fill="none"
              stroke="#1f1d1c"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
        ) : (
          <g>
            <circle
              cx="60"
              cy="46"
              r={expression === "surprised" ? 3.4 : 2.8}
              fill="#1f1d1c"
            />
            <circle cx="61" cy="45" r="0.9" fill="#ffffff" />
          </g>
        )}
      </g>

      {/* Mouth */}
      {expression === "smile" && (
        <path
          d="M42 59 Q50 66 58 59"
          fill="none"
          stroke={facialHair === "beard" ? "#ebe5d8" : "#241917"}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
      {expression === "wink" && (
        <path
          d="M43 59 Q50 65 58 58"
          fill="none"
          stroke="#241917"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
      {expression === "smirk" && (
        <path
          d="M44 60 Q52 62 58 57.5"
          fill="none"
          stroke="#241917"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
      {expression === "chill" && (
        <path
          d="M44 60 Q50 61.5 56 60"
          fill="none"
          stroke={facialHair === "beard" ? "#ebe5d8" : "#241917"}
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      )}
      {expression === "surprised" && (
        <ellipse cx="50" cy="61" rx="3.4" ry="4.1" fill="#241917" />
      )}

      {/* Facial Hair: Mustache */}
      {facialHair === "mustache" && (
        <path
          d="M40 57 Q45 53 50 56 Q55 53 60 57 Q55 59 50 57.5 Q45 59 40 57 Z"
          fill={hairColor}
        />
      )}

      {/* Eyewear */}
      {eyewear === "round" && (
        <g fill="rgba(255,255,255,0.12)" stroke="#e6d7b8" strokeWidth="2">
          <circle cx="40" cy="46" r="7.5" />
          <circle cx="60" cy="46" r="7.5" />
          <line x1="47.5" y1="46" x2="52.5" y2="46" />
          <line x1="28" y1="45" x2="32.5" y2="46" />
          <line x1="67.5" y1="46" x2="72" y2="45" />
        </g>
      )}
      {eyewear === "square" && (
        <g fill="rgba(255,255,255,0.12)" stroke="#24272c" strokeWidth="2.2">
          <rect x="32.5" y="40" width="15" height="11.5" rx="2.5" />
          <rect x="52.5" y="40" width="15" height="11.5" rx="2.5" />
          <line x1="47.5" y1="45" x2="52.5" y2="45" />
          <line x1="28" y1="44" x2="32.5" y2="45" />
          <line x1="67.5" y1="45" x2="72" y2="44" />
        </g>
      )}
      {eyewear === "sunglasses" && (
        <g stroke="#18181b" strokeWidth="2">
          <rect x="31.5" y="40" width="16.5" height="11.5" rx="3" fill="#18181b" />
          <rect x="52" y="40" width="16.5" height="11.5" rx="3" fill="#18181b" />
          <line x1="48" y1="44" x2="52" y2="44" />
          <line
            x1="34"
            y1="42.5"
            x2="38"
            y2="48.5"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="54.5"
            y1="42.5"
            x2="58.5"
            y2="48.5"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Front Hair Layer */}
      {hairStyle === "short" && (
        <path
          d="M27 41 C27 23, 73 23, 73 41 C70 33, 61 31, 50 31 C39 31, 30 33, 27 41 Z"
          fill={hairColor}
        />
      )}
      {hairStyle === "sidepart" && (
        <path
          d="M27 42 C26 22, 74 22, 73 41 C67 31, 52 29, 36 37 C32 38, 29 40, 27 42 Z"
          fill={hairColor}
        />
      )}
      {hairStyle === "spiky" && (
        <path
          d="M27 40 L31 24 L40 31 L50 18 L59 30 L69 22 L73 40 C66 33, 34 33, 27 40 Z"
          fill={hairColor}
        />
      )}
      {(hairStyle === "bob" ||
        hairStyle === "long" ||
        hairStyle === "ponytail" ||
        hairStyle === "bun") && (
        <path
          d="M27 42 C28 22, 72 22, 73 42 C66 32, 57 30, 50 34 C43 30, 34 32, 27 42 Z"
          fill={hairColor}
        />
      )}
      {hairStyle === "curly" && (
        <g fill={hairColor}>
          <circle cx="34" cy="31" r="7" />
          <circle cx="45" cy="28" r="7.5" />
          <circle cx="56" cy="28" r="7.5" />
          <circle cx="66" cy="31" r="7" />
        </g>
      )}

      {/* Headwear */}
      {headwear === "headband" && (
        <path
          d="M27.5 36 Q50 26 72.5 36"
          fill="none"
          stroke={headwearColor}
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}
      {headwear === "cap" && (
        <g>
          <path d="M26 35 C26 17, 74 17, 74 35 Z" fill={headwearColor} />
          <path
            d="M24 35 Q54 31 82 38 Q56 41 24 35 Z"
            fill={headwearColor}
            filter="brightness(0.85)"
          />
          <circle cx="50" cy="21" r="2.2" fill="rgba(255,255,255,0.4)" />
        </g>
      )}
      {headwear === "beanie" && (
        <g>
          <path d="M26 35 C27 14, 73 14, 74 35 Z" fill={headwearColor} />
          <rect
            x="24.5"
            y="30"
            width="51"
            height="8.5"
            rx="4"
            fill={headwearColor}
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="1.2"
          />
          <circle cx="50" cy="15.5" r="4.5" fill={headwearColor} />
        </g>
      )}
      {headwear === "beret" && (
        <g>
          <path
            d="M25 34 C22 22, 46 15, 72 22 C80 25, 76 34, 72 35 Z"
            fill={headwearColor}
          />
          <line
            x1="49"
            y1="18"
            x2="51"
            y2="14"
            stroke={headwearColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}
