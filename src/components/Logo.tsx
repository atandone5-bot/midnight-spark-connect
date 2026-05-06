export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative h-8 w-8">
        <div className="absolute inset-0 rounded-full bg-primary blur-md opacity-60" />
        <div className="relative h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
          <span className="text-white font-display font-bold text-sm">A</span>
        </div>
      </div>
      <span className="font-display font-bold text-xl tracking-tight">
        After<span className="text-primary">Dark</span>
      </span>
    </div>
  );
}
