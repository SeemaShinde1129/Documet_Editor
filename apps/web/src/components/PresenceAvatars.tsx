"use client";

type PresenceAvatarsProps = {
  users: string[];
  maxVisible?: number;
  className?: string;
};

const avatarPalettes = [
  "bg-sky-100 text-sky-800 ring-sky-200",
  "bg-emerald-100 text-emerald-800 ring-emerald-200",
  "bg-violet-100 text-violet-800 ring-violet-200",
  "bg-amber-100 text-amber-800 ring-amber-200",
  "bg-rose-100 text-rose-800 ring-rose-200",
  "bg-cyan-100 text-cyan-800 ring-cyan-200",
  "bg-lime-100 text-lime-800 ring-lime-200",
  "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200",
];

const getUserInitials = (username: string) => {
  const normalizedUsername = username.includes("@")
    ? username.split("@")[0]
    : username;
  const words = normalizedUsername.trim().split(/[\s._-]+/).filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const getUserColorClass = (username: string) => {
  const hash = Array.from(username).reduce((total, character) => {
    return total + character.charCodeAt(0);
  }, 0);

  return avatarPalettes[hash % avatarPalettes.length];
};

export function PresenceAvatars({
  users,
  maxVisible = 4,
  className = "",
}: PresenceAvatarsProps) {
  const uniqueUsers = Array.from(new Set(users.filter(Boolean)));
  const visibleUsers = uniqueUsers.slice(0, maxVisible);
  const hiddenUserCount = Math.max(uniqueUsers.length - visibleUsers.length, 0);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center">
        {visibleUsers.map((username, index) => (
          <div
            key={username}
            className="group relative"
            style={{ zIndex: visibleUsers.length - index }}
          >
            <div
              className={`relative flex size-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold shadow-sm ring-1 transition-transform hover:-translate-y-0.5 hover:scale-105 ${getUserColorClass(username)} ${
                index > 0 ? "-ml-2" : ""
              }`}
              title={username}
            >
              {getUserInitials(username)}
              <span
                className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.15)]"
                aria-hidden="true"
              />
            </div>

            <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-950 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
              {username}
            </div>
          </div>
        ))}

        {hiddenUserCount > 0 ? (
          <div className="-ml-2 flex size-8 items-center justify-center rounded-full border-2 border-white bg-neutral-100 text-xs font-semibold text-neutral-600 shadow-sm ring-1 ring-neutral-200">
            +{hiddenUserCount}
          </div>
        ) : null}
      </div>

      <span className="hidden text-sm text-neutral-500 sm:inline">
        {uniqueUsers.length === 1
          ? "1 collaborator"
          : `${uniqueUsers.length} collaborators`}
      </span>
    </div>
  );
}

export default PresenceAvatars;
