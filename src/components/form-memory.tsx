"use client";

import { useEffect } from "react";

const SKIP = new Set(["hidden", "password", "submit", "button", "file"]);

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function fieldsOf(form: HTMLFormElement): Field[] {
  return Array.from(form.elements).filter(
    (element): element is Field =>
      (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) &&
      !!element.name &&
      !element.name.startsWith("cf-") &&
      !SKIP.has(element.type),
  );
}

/** Sets a value the way typing would, so React's onChange and other listeners see it. */
function setValue(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
  const proto = Object.getPrototypeOf(field) as object;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(field, value);
  field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

/**
 * Keeps what someone typed when a server action sends them back with ?error=.
 * On submit it copies the form's visible fields to this tab's sessionStorage; when the
 * page comes back with an error it puts them back once and forgets them. Nothing leaves
 * the browser, and contact details never go into the URL.
 */
export function FormMemory({ formId, storageKey }: { formId: string; storageKey: string }) {
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    const save = () => {
      const saved: Record<string, string> = {};
      for (const field of fieldsOf(form)) {
        if (field instanceof HTMLInputElement && (field.type === "radio" || field.type === "checkbox")) {
          if (field.checked) saved[field.name] = field.value;
        } else if (field.value) {
          saved[field.name] = field.value;
        }
      }
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(saved));
      } catch {
        // Private mode or storage off: the form still submits, it just won't refill.
      }
    };
    form.addEventListener("submit", save);

    if (new URLSearchParams(window.location.search).has("error")) {
      let saved: Record<string, string> = {};
      try {
        saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "{}") as Record<string, string>;
        sessionStorage.removeItem(storageKey);
      } catch {
        saved = {};
      }
      const fields = fieldsOf(form);
      // Choices first: they can reveal fields (guests of honor) that the text values fill.
      for (const field of fields) {
        const value = saved[field.name];
        if (value === undefined) continue;
        if (field instanceof HTMLInputElement && field.type === "radio") {
          if (field.value === value && !field.checked) field.click();
        } else if (field instanceof HTMLSelectElement && field.value !== value) {
          setValue(field, value);
        }
      }
      for (const field of fields) {
        const value = saved[field.name];
        if (!value || field instanceof HTMLSelectElement || (field instanceof HTMLInputElement && (field.type === "radio" || field.type === "checkbox"))) continue;
        setValue(field, value);
        const details = field.closest("details");
        if (details) details.open = true;
      }
    }
    return () => form.removeEventListener("submit", save);
  }, [formId, storageKey]);
  return null;
}
