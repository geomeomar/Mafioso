"use client";

import { AVATAR_OPTIONS, type AvatarId } from "@/types/game";

interface AvatarSelectorProps {
  selected: AvatarId;
  onSelect: (id: AvatarId) => void;
}

export function AvatarSelector({ selected, onSelect }: AvatarSelectorProps) {
  return (
    <div>
      <label className="block text-muted-foreground mb-2 text-sm">اختر صورة</label>
      <div className="grid grid-cols-4 gap-2">
        {AVATAR_OPTIONS.map((avatar) => (
          <button
            key={avatar.id}
            onClick={() => onSelect(avatar.id)}
            className={`flex items-center justify-center p-3 rounded-xl transition-all ${
              selected === avatar.id
                ? "bg-accent/20 border-2 border-accent scale-105"
                : "bg-card border border-border hover:border-muted-foreground"
            }`}
          >
            <span className="text-2xl">{avatar.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
