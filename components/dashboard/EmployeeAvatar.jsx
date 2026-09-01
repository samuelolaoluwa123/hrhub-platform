import Image from "next/image";

const GRADIENTS = [
  "linear-gradient(135deg,#9b50e9,#8224e3)",
  "linear-gradient(135deg,#4a9eff,#2f6fd1)",
  "linear-gradient(135deg,#f5a623,#d68a1f)",
  "linear-gradient(135deg,#3ee87a,#1a9c5f)",
  "linear-gradient(135deg,#9089a0,#706f83)",
];

function gradientFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function initials(first, last) {
  return `${(first || "?")[0]}${(last || "")[0] || ""}`.toUpperCase();
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Renders the real uploaded passport photo once one exists (3.3 — it has
// to actually become the profile picture, not just sit in a documents
// table) — falls back to the existing initials-gradient circle
// otherwise. avatar_path points into the public employee-avatars
// bucket, so this is a plain public URL, no signed-URL round trip.
export default function EmployeeAvatar({ firstName, lastName, avatarPath, size = 32, className = "" }) {
  const initial = initials(firstName, lastName);
  const px = `${size}px`;

  if (avatarPath && SUPABASE_URL) {
    const src = `${SUPABASE_URL}/storage/v1/object/public/employee-avatars/${avatarPath}`;
    return (
      <div
        className={`relative rounded-full overflow-hidden shrink-0 ${className}`}
        style={{ width: px, height: px }}
      >
        <Image src={src} alt={`${firstName} ${lastName}`} fill sizes={px} className="object-cover" unoptimized />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${className}`}
      style={{ width: px, height: px, background: gradientFor(`${firstName}${lastName}`), fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}
