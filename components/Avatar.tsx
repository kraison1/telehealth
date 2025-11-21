interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  variant?: "blue" | "gray";
}

const sizeClasses = {
  sm: "w-7 h-7 text-xs",
  md: "w-10 h-10 text-lg",
  lg: "w-12 h-12 text-lg",
};

const variantClasses = {
  blue: "bg-gradient-to-br from-blue-400 to-blue-600",
  gray: "bg-gradient-to-br from-gray-400 to-gray-600",
};

export default function Avatar({
  name,
  size = "md",
  variant = "blue",
}: AvatarProps) {
  return (
    <div
      className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-full flex items-center justify-center text-white font-bold`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
