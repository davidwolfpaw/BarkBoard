export async function loadLayout() {
  const stored = await browser.storage.local.get("layout");
  const layout = stored.layout ?? { order: [], sizes: {} };
  // Migrate: sizes were plain numbers (col span only) before row support was added.
  for (const [id, size] of Object.entries(layout.sizes)) {
    if (typeof size === "number") layout.sizes[id] = { cols: size };
  }
  return layout;
}

export async function saveLayout(layout) {
  await browser.storage.local.set({ layout });
}

// Returns services sorted by saved order. Services not yet in the saved order
// (e.g. newly added) are appended at the end in their default position.
export function applyOrder(services, savedOrder) {
  if (!savedOrder.length) return services;
  const rank = new Map(savedOrder.map((id, i) => [id, i]));
  return [...services].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id) : Infinity;
    const rb = rank.has(b.id) ? rank.get(b.id) : Infinity;
    return ra - rb;
  });
}
