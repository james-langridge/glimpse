const sizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
};

export default function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div
      className={`${sizes[size]} animate-spin-slow rounded-full border-2 border-zinc-700 border-t-zinc-400`}
    />
  );
}
