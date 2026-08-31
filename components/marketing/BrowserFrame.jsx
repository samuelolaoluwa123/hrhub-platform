import Image from "next/image";

// Wraps a product screenshot in a minimal browser chrome so it reads as
// "the real app" rather than a floating, context-less image.
//
// `aspect` should match the source image's real width/height (e.g.
// "1618/912") — these screenshots aren't a uniform ratio, and forcing one
// via object-cover cropped real content off the edge of wider ones
// (recruitment's table lost its rightmost columns). Matching the real
// ratio means object-cover never has anything to crop.
export default function BrowserFrame({
  src,
  alt,
  aspect = "16/9",
  sizes = "(max-width: 768px) 100vw, 460px",
  className = "",
}) {
  return (
    <div
      className={`rounded-2xl overflow-hidden bg-white shadow-[0_30px_80px_-20px_rgba(19,4,34,0.35)] border border-black/[0.06] ${className}`}
    >
      <div className="flex items-center gap-1.5 px-4 py-3 bg-[#f3f2f5] border-b border-black/[0.06]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#e5484d]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#f5a524]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#45a049]" />
      </div>
      <div className="relative w-full" style={{ aspectRatio: aspect }}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          quality={92}
          className="object-cover object-top"
        />
      </div>
    </div>
  );
}
