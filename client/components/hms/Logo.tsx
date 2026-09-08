import { ReactElement } from "react";

type LogoProps = {
  className?: string;
  width?: number | string;
  height?: number | string;
  /**
   * Position of the molecular emblem icon relative to the OncoNexa wordmark:
   * - "right": OncoNexa wordmark on left, emblem on right (as in login page)
   * - "left": Emblem on left, OncoNexa wordmark on right
   * - "none": Wordmark only (default when iconPosition is not specified)
   */
  iconPosition?: "left" | "right" | "none";
};

export const MolecularEmblemPaths = () => (
  <>
    <path
      d="M208.65 258.44C213.52 258.09 218.44 258.91 223.06 260.47C258.28 272.4 250.84 324.34 214.5 327.87C209.36 328.37 204.15 327.97 199.24 326.33C162.81 314.19 171.06 261.08 208.65 258.44Z"
      fill="#00baa3"
      stroke="#00baa3"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <path
      d="M459.95 294.5C458.38 297.68 455.55 300.12 453.74 303.27C450.25 309.32 448.75 315.58 447.5 322.36C438.5 317.9 429.5 313.45 420.5 308.99C403.65 322.16 386.8 335.33 369.94 348.5C366.01 343.38 362.34 338.23 356.78 334.68C353.7 332.71 350.23 331.46 347.15 329.5C351.47 325.03 356.61 321.83 361.29 317.81C373.32 307.47 385.65 297.5 398.01 287.5C404.09 282.57 411.13 274.35 419.5 274.2C424.05 274.12 427.6 277.04 431.5 278.99C440.96 283.7 451.24 288.54 459.95 294.5Z"
      fill="#00baa3"
      stroke="#00baa3"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <path
      d="M326.6 335.31C332.09 334.4 338.08 334.55 343.41 336.18C371.95 344.89 374.35 381.4 351.64 398.08C347.82 400.88 344.17 402.88 339.44 403.76C333.74 404.82 327.86 405.01 322.24 403.35C313.69 400.83 306.12 395.71 301.64 387.84C290.02 367.47 303.4 339.13 326.6 335.31Z"
      fill="#00baa3"
      stroke="#00baa3"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <path
      d="M78.7 336.36C83.51 335.49 88.9 335.52 93.63 336.73C102.59 339.02 111.23 344.45 115.8 352.7C126.9 372.73 113.47 399.51 91.47 403.88C85.97 404.97 80.2 404.93 74.74 403.64C38.83 395.17 43.8 342.68 78.7 336.36Z"
      fill="#00baa3"
      stroke="#00baa3"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <path
      d="M84.61 471.49C89.64 471.42 94.59 472.37 99.21 474.33C103.39 476.11 107.57 478.46 110.71 481.78C132.39 504.73 115.63 541.41 84.5 541.37C79.63 541.36 74.55 540.41 70.1 538.41C35.9 523.08 47.61 472 84.61 471.49Z"
      fill="#00baa3"
      stroke="#00baa3"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <path
      d="M324.77 472.41C330.07 471.27 335.44 471.5 340.7 472.67C377.52 480.86 375.65 533.71 339.24 540.61C334.06 541.6 328.55 541.6 323.44 540.19C288.21 530.49 288.97 480.08 324.77 472.41Z"
      fill="#00baa3"
      stroke="#00baa3"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <path
      d="M204.72 547.4C242.77 542.24 260.98 593.77 227.37 612.9C222.53 615.65 216.9 617.13 211.38 617.59C206.97 617.96 202.71 617.37 198.51 616C163.14 604.4 167.97 552.38 204.72 547.4Z"
      fill="#00baa3"
      stroke="#00baa3"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <path
      d="M528.22 317C528.24 321 528.26 325 528.28 329C523.52 369.91 459.23 370.31 455.72 330C455.74 326.22 455.76 322.44 455.78 318.66C459.61 288.75 498.23 278.2 518.83 298.68C523.75 303.57 527.47 310.07 528.22 317Z"
      fill="#082347"
      stroke="#082347"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <path
      d="M168.5 298.35C170.06 305.02 171.59 311.2 175.54 316.95C177.39 319.63 179.81 321.83 181.63 324.5C162.92 335.41 144.21 346.32 125.5 357.23C123.57 351.81 121.01 346.64 117.14 342.33C114.67 339.57 111.04 337.53 109.25 334.5C129 322.45 148.75 310.4 168.5 298.35Z"
      fill="#082347"
      stroke="#082347"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <path
      d="M252.5 299.02C257.4 299.89 261.43 303.25 265.71 305.78C275.9 311.8 286.13 318 296.03 324.47C300.63 327.47 307.05 329.97 310.11 334.5C305.19 338.34 301.17 341.93 297.67 347.19C295.65 350.21 294.77 354.04 292.5 356.73C274.81 345.99 257.13 335.24 239.44 324.5C240.75 321.62 243.51 319.57 245.41 316.9C249.29 311.47 251.28 305.51 252.5 299.02Z"
      fill="#082347"
      stroke="#082347"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <path
      d="M338.08 465.91C335.09 464.35 330.05 464.24 327.05 465.95C324.05 466.63 321.04 467.32 318.04 468C317.79 458 317.54 448 317.29 438C317.29 437 317.29 436 317.29 435C317.56 434.83 317.83 434.67 318.1 434.5C318.09 432.17 318.08 429.83 318.08 427.5C317.81 427.33 317.55 427.17 317.29 427C317.3 425 317.32 423 317.33 421C317.6 420.83 317.86 420.67 318.13 420.5C318.13 417.17 318.12 413.83 318.11 410.5C318.86 410.27 319.6 410.04 320.35 409.81C329.48 411.25 337.66 411.43 346.56 408.5C346.54 428.3 346.52 448.11 346.5 467.91C343.69 467.25 340.89 466.58 338.08 465.91Z"
      fill="#082347"
      stroke="#082347"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <path
      d="M70.5 408.94C80.64 411.52 89.02 410.87 99.17 408.99C99.17 428.5 99.17 448 99.17 467.5C94.25 466.59 89.61 465.21 84.5 465.34C79.53 465.48 74.76 467.24 69.94 467.5C69.19 455.86 69.79 444.16 69.72 432.5C69.67 424.89 68.6 416.31 70.5 408.94Z"
      fill="#082347"
      stroke="#082347"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <path
      d="M126.5 516.92C144.99 527.78 163.49 538.64 181.98 549.5C179.5 553.45 175.63 556.51 173.08 560.63C170.53 564.75 169.37 569.36 167.5 573.77C148.57 562.68 129.64 551.59 110.72 540.5C113.25 537.06 116.83 534.42 119.35 530.81C122.37 526.47 123.81 521.35 126.5 516.92Z"
      fill="#082347"
      stroke="#082347"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <path
      d="M291.5 517.25C295.06 528.66 299.11 532.02 306.61 540.5C288.24 551.58 269.87 562.66 251.5 573.74C248.9 567.43 247.18 561.2 242.77 555.73C240.98 553.51 238.77 551.66 236.94 549.5C255.13 538.75 273.31 528 291.5 517.25Z"
      fill="#082347"
      stroke="#082347"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
  </>
);

/**
 * Standalone Molecular Emblem Icon component (scaled from favcon2.svg)
 */
export const OncoNexaEmblem: React.FC<{
  className?: string;
  size?: number | string;
}> = ({ className, size = 48 }): ReactElement => {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="35 258 494 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <MolecularEmblemPaths />
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({
  className,
  width,
  height,
  iconPosition = "none",
}: LogoProps): ReactElement => {
  const textStartX = iconPosition === "left" ? 250 : 35;
  const taglineStartX = iconPosition === "left" ? 255 : 40;
  const viewBoxWidth =
    iconPosition === "none" ? 800 : iconPosition === "left" ? 820 : 810;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewBoxWidth} 220`}
    >
      <defs>
        <style>{`
          .wordmark {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-weight: 700;
            font-size: 108px;
          }
          .brand-navy {
            fill: #082347;
          }
          .brand-teal {
            fill: #00baa3;
          }
          .tagline {
            fill: #5b758a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-weight: 700;
            font-size: 26.5px;
            letter-spacing: 0.33em;
          }
        `}</style>
      </defs>

      {/* Emblem on Left */}
      {iconPosition === "left" && (
        <g transform="translate(20, 35) scale(0.4167) translate(-35, -258)">
          <MolecularEmblemPaths />
        </g>
      )}

      {/* Main Wordmark: OncoNexa */}
      <text x={textStartX} y="125" className="wordmark">
        <tspan className="brand-navy">Onco</tspan>
        <tspan className="brand-teal">Nexa</tspan>
      </text>

      {/* Subtitle Tagline: PRECISION ONCOLOGY EMR */}
      <text x={taglineStartX} y="174" className="tagline">
        PRECISION ONCOLOGY EMR
      </text>

      {/* Emblem on Right */}
      {iconPosition === "right" && (
        <g transform="translate(575, 35) scale(0.4167) translate(-35, -258)">
          <MolecularEmblemPaths />
        </g>
      )}
    </svg>
  );
};

export default Logo;