import stringSimilarity from 'string-similarity';

export function scoreDocuments(query, docs, limit = 5) {
  if (!query) return [];
  const normalizedQuery = query.toLowerCase();
  const scored = docs.map((doc) => {
    const rating = stringSimilarity.compareTwoStrings(
      normalizedQuery,
      `${doc.content} ${JSON.stringify(doc.metadata || {})}`.toLowerCase()
    );
    return { doc, rating };
  });

  return scored
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit)
    .filter((item) => item.rating > 0);
}

