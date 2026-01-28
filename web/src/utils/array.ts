export const unique = <T>(array: T[] | undefined): T[] => {
  return Array.from(new Set(array));
};

export const uniqueBy = <T, K>(
  array: T[] | undefined,
  keyGetter: (item: T) => K,
): T[] => {
  const seen = new Set<K>();
  return (
    array?.filter((item) => {
      const key = keyGetter(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }) ?? []
  );
};
