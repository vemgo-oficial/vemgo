"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, PointerEvent, RefObject, SetStateAction } from "react";

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDrawerInteractions(open: boolean, setOpen: Dispatch<SetStateAction<boolean>>) {
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focusOnOpen, setFocusOnOpen] = useState(false);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openFromHover = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    cancelClose();
    setFocusOnOpen(false);
    setOpen(true);
  }, [cancelClose, setOpen]);

  const scheduleClose = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    if (event.currentTarget.tagName.toLowerCase() === "aside" && event.currentTarget.contains(document.activeElement)) return;
    cancelClose();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setFocusOnOpen(false);
      setOpen(false);
    }, 180);
  }, [cancelClose, setOpen]);

  const toggleFromClick = useCallback((event: { detail: number }) => {
    cancelClose();
    setFocusOnOpen(!open && event.detail === 0);
    setOpen(!open);
  }, [cancelClose, open, setOpen]);
  const clearFocus = useCallback(() => setFocusOnOpen(false), []);

  useEffect(() => () => cancelClose(), [cancelClose]);

  return {
    focusOnOpen,
    onPointerEnter: openFromHover,
    onPointerLeave: scheduleClose,
    onClick: toggleFromClick,
    cancelClose,
    clearFocus,
  };
}

export function useAccessibleDrawer(
  open: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
  triggerRef: RefObject<HTMLButtonElement | null>,
  focusOnOpen = false,
  onEscape?: () => void,
) {
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const activeDrawer = drawer;
    const trigger = triggerRef.current;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscape?.();
        setOpen(false);
        return;
      }

    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (activeDrawer.contains(document.activeElement)) trigger?.focus();
    };
  }, [onEscape, open, setOpen, triggerRef]);

  useEffect(() => {
    if (!open || !focusOnOpen) return;
    const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();
  }, [focusOnOpen, open]);

  return drawerRef;
}
