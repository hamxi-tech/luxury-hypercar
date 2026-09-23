/*
  The wordmark is set in the display face; the two dots over the ö are the
  brand's only mark. They are the same two points of light the headlamps make
  in the reveal, which is why the reveal starts with them.
*/
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`display-wide inline-flex items-baseline text-[13px] ${className}`}>
      ELSTR
      <span className="relative inline-block">
        O
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-[-0.32em] flex -translate-x-1/2 gap-[0.32em]"
        >
          <span className="block size-[0.16em] rounded-full bg-ice" />
          <span className="block size-[0.16em] rounded-full bg-ice" />
        </span>
      </span>
      M
    </span>
  );
}
