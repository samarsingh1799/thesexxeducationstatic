/** Renders a JSON-LD `<script>` tag from real structured-data objects (see lib/seo/schema.ts). Accepts one object or an array so a page can emit several blocks (e.g. Article + BreadcrumbList) without nesting components. */
export function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
      ))}
    </>
  );
}
