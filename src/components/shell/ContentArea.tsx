type ContentAreaProps = {
  children: React.ReactNode;
  className?: string;
};

export default function ContentArea({ children, className }: ContentAreaProps) {
  return (
    <main className={`min-w-0 flex-1 overflow-y-auto ${className ?? ""}`}>
      {children}
    </main>
  );
}
