import { Active, Over } from "@dnd-kit/core";

export function hasDraggableData(
  element: Active | Over | null
): element is Active & { data: { current: { type: string } } } {
  if (!element || !("data" in element) || !element.data) {
    return false;
  }

  const data = element.data.current;
  return !!data && "type" in data;
}