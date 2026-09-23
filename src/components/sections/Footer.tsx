import { Wordmark } from "@/components/Wordmark";

export function Footer() {
  return (
    <footer className="border-t border-line px-5 py-10 md:px-10">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 text-[13px] text-ivory-faint md:flex-row md:items-center md:justify-between">
        <Wordmark className="text-ivory" />
        <p className="max-w-[52ch] leading-relaxed">
          A demonstration project. Elström, the Aubade and every figure on this page
          are invented for it. Vehicle model CC BY 4.0, see the case study.
        </p>
        <a href="mailto:hello@elstrom.example" className="text-ivory-dim transition-colors hover:text-ivory">
          hello@elstrom.example
        </a>
      </div>
    </footer>
  );
}
