
export const normalizeItems = (items) => {
  if (Array.isArray(items)) return items;

  if (items && typeof items === "object") {
    return Object.values(items).flat();
  }

  return [];
};
