interface TypingIndicatorProps {
  size?: "sm" | "md";
}

const dotSizes = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
};

export default function TypingIndicator({ size = "md" }: TypingIndicatorProps) {
  const dotClass = dotSizes[size];

  return (
    <div className="flex gap-1">
      <span
        className={`${dotClass} bg-gray-400 rounded-full animate-bounce`}
        style={{ animationDelay: "0ms" }}
      />
      <span
        className={`${dotClass} bg-gray-400 rounded-full animate-bounce`}
        style={{ animationDelay: "150ms" }}
      />
      <span
        className={`${dotClass} bg-gray-400 rounded-full animate-bounce`}
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}
