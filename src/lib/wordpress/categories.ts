import { wpFetch } from "./client";
import { cacheTags } from "@/lib/cache/tags";
import { decodeEntities } from "@/lib/content/html";
import type { Category, CategoryWithChildren } from "@/types/content";
import type { WPCategory } from "./wp-types";

function normalizeCategory(term: WPCategory): Category {
  return {
    id: term.id,
    name: decodeEntities(term.name),
    slug: term.slug,
    description: term.description ? decodeEntities(term.description) : undefined,
    count: term.count,
    parentId: term.parent || undefined,
  };
}

export async function getAllCategories(): Promise<Category[]> {
  const result = await wpFetch<WPCategory[]>("/wp-json/wp/v2/categories", {
    searchParams: { per_page: 100, orderby: "name", order: "asc", hide_empty: true },
    tags: [cacheTags.categoriesList()],
  });
  return (result?.data ?? []).map(normalizeCategory);
}

function buildHierarchy(categories: Category[]): CategoryWithChildren[] {
  const topLevel = categories.filter((category) => !category.parentId);
  return topLevel.map((category) => ({
    ...category,
    children: categories.filter((candidate) => candidate.parentId === category.id),
  }));
}

export async function getCategoryHierarchy(): Promise<CategoryWithChildren[]> {
  const categories = await getAllCategories();
  return buildHierarchy(categories);
}

export function getDescendantCategoryIds(categoryId: number, hierarchy: CategoryWithChildren[]): number[] {
  const topLevelMatch = hierarchy.find((category) => category.id === categoryId);
  return topLevelMatch ? [categoryId, ...topLevelMatch.children.map((child: Category) => child.id)] : [categoryId];
}

export function getCategorySlugsForIds(ids: number[], hierarchy: CategoryWithChildren[]): string[] {
  const flat = hierarchy.flatMap((category) => [category, ...category.children]);
  return ids
    .map((id) => flat.find((candidate) => candidate.id === id)?.slug)
    .filter((slug): slug is string => Boolean(slug));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const result = await wpFetch<WPCategory[]>("/wp-json/wp/v2/categories", {
    searchParams: { slug, per_page: 1 },
    tags: [cacheTags.category(slug), cacheTags.categoriesList()],
  });
  const term = result?.data?.[0];
  return term ? normalizeCategory(term) : null;
}
