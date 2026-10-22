import { Link, useParams } from "wouter";
import { Breadcrumbs, CreateButton, ExampleBookCard, Section, SectionHeading, SampleBookViewer } from "@/components/marketing";
import { EXAMPLE_BOOKS, getExample, storyPagesOf } from "@/content/examples";
import NotFound from "./NotFound";

export function Examples() {
  return (
    <>
      <Section>
        <SectionHeading
          as="h1"
          title="Example storybooks"
          subtitle="Real books made with StoryBloom's story wizard, exactly as a parent would make them. Open one to flip through every page."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {EXAMPLE_BOOKS.map((book) => (
            <ExampleBookCard key={book.slug} book={book} />
          ))}
        </div>
      </Section>
      <Section className="text-center">
        <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3">Make one starring your child</h2>
        <p className="text-muted-foreground font-story mb-6">Pick a story, add their name and look, and preview it free.</p>
        <CreateButton />
      </Section>
    </>
  );
}

export function ExampleBookPage() {
  const { slug } = useParams<{ slug: string }>();
  const book = getExample(slug);
  if (!book) return <NotFound />;
  const others = EXAMPLE_BOOKS.filter((b) => b.slug !== book.slug);

  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Examples", path: "/examples" }, { name: book.title, path: `/examples/${book.slug}` }]} />
      <Section className="pt-6">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-3">{book.title}</h1>
          <p className="text-muted-foreground font-story">An example personalized storybook made with StoryBloom.</p>
          <dl className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            {[["Starring", book.starring], ["Story", book.story], ["Art style", book.style]].map(([k, v]) => (
              <div key={k} className="rounded-full bg-primary/10 px-3 py-1"><dt className="inline font-semibold text-primary">{k}: </dt><dd className="inline">{v}</dd></div>
            ))}
          </dl>
        </div>
        <SampleBookViewer book={book} />
      </Section>

      <Section className="py-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-display font-bold mb-3">The idea behind this book</h2>
          <p className="font-story text-muted-foreground mb-8">{book.description}</p>
          <h2 className="text-2xl font-display font-bold mb-3">Read the full story</h2>
          <div className="space-y-4 font-story text-lg leading-relaxed">
            {storyPagesOf(book).map((page, i) => (
              <div key={i} className="space-y-4">
                {page.dedication && <p className="italic text-muted-foreground">{page.dedication}</p>}
                <p>{page.text}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="text-center">
        <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3">Make a book like this for your child</h2>
        <p className="text-muted-foreground font-story mb-6">Your child's name, look and favorite things, in about five minutes.</p>
        <CreateButton />
      </Section>

      {others.length > 0 && (
        <Section>
          <h2 className="text-2xl font-display font-bold mb-6 text-center">More example books</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {others.map((b) => <ExampleBookCard key={b.slug} book={b} />)}
          </div>
          <p className="text-center mt-6"><Link href="/examples" className="text-primary font-medium hover:underline">All examples</Link></p>
        </Section>
      )}
    </>
  );
}
