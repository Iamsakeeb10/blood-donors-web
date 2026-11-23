import type { ReactNode, SVGProps } from "react";

type SvgProps = Omit<SVGProps<SVGSVGElement>, "children"> & { children: ReactNode };

function Svg({ children, className = "h-5 w-5", ...props }: SvgProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export function DropIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path
        d="M12 3.2c3.3 3.7 6 7.1 6 10.3a6 6 0 0 1-12 0c0-3.2 2.7-6.6 6-10.3Z"
        fill="currentColor"
        stroke="none"
      />
    </Svg>
  );
}

export function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M7.5 3.5h-2A1.5 1.5 0 0 0 4 5.2c.3 7.6 6.2 13.5 13.8 13.8a1.5 1.5 0 0 0 1.7-1.5v-2a1.5 1.5 0 0 0-1.2-1.5l-2.6-.5a1.5 1.5 0 0 0-1.5.6l-.8 1a11.4 11.4 0 0 1-4.9-4.9l1-.8a1.5 1.5 0 0 0 .6-1.5l-.5-2.6a1.5 1.5 0 0 0-1.6-1.2Z" />
    </Svg>
  );
}

export function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4.9A7.5 7.5 0 1 1 20 11.5Z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
    </Svg>
  );
}

export function ShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" />
    </Svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </Svg>
  );
}

export function ArrowLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Svg>
  );
}

export function WarningIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M10.3 4.2 3 17a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4M12 16.8h.01" />
    </Svg>
  );
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M4.5 6.5h15M9.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7" />
      <path d="M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5" />
      <path d="M10 10.5v6M14 10.5v6" />
    </Svg>
  );
}

export function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5.8A1.8 1.8 0 0 0 13.2 4H5.8A1.8 1.8 0 0 0 4 5.8v7.4A1.8 1.8 0 0 0 5.8 15" />
    </Svg>
  );
}

export function LocationIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 21s6.5-5.4 6.5-10.2a6.5 6.5 0 0 0-13 0C5.5 15.6 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.3" />
    </Svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Svg>
  );
}

