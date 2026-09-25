"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type EditorAction = { id: string; label: string; icon: LucideIcon; active?: boolean; disabled?: boolean; run: () => void };

// Right-click menu for the rich text editor. Mouse-down is cancelled on the menu so the
// editor keeps its focus and selection while an item is chosen.
export function EditorContextMenu({ x, y, groups, onClose }: { x: number; y: number; groups: EditorAction[][]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    el.style.left = `${Math.max(8, Math.min(x, window.innerWidth - width - 8))}px`;
    el.style.top = `${Math.max(8, y + height > window.innerHeight - 8 ? y - height : y)}px`;
    el.style.visibility = "visible";
  }, [x, y]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) onClose(); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  return createPortal(
    <div ref={ref} role="menu" aria-label="Text formatting" onMouseDown={(event) => event.preventDefault()} onContextMenu={(event) => event.preventDefault()} style={{ left: x, top: y, visibility: "hidden" }} className="fixed z-[60] min-w-56 rounded-lg border border-border bg-surface p-1 shadow-panel">
      {groups.map((group, index) => (
        <div key={index} className={cn(index > 0 && "mt-1 border-t border-border pt-1")}>
          {group.map((action) => {
            const Icon = action.icon;
            return (
              <button key={action.id} type="button" role="menuitem" disabled={action.disabled} onClick={() => { action.run(); onClose(); }} className={cn("flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] text-ink transition-colors hover:bg-canvas disabled:pointer-events-none disabled:opacity-40", action.active && "font-semibold")}>
                <Icon className="h-4 w-4 shrink-0 text-ink-muted" />
                <span className="flex-1">{action.label}</span>
                {action.active ? <Check className="h-4 w-4 text-accent" /> : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>,
    document.body,
  );
}
