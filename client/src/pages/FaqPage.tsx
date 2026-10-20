import { CreateButton, FaqSection, Section, SectionHeading } from "@/components/marketing";
import { christmasFaqs, generalFaqs } from "@/content/faq";

export function allFaqs() {
  return [...generalFaqs(), ...christmasFaqs()];
}

export default function FaqPage() {
  return (
    <>
      <Section className="pb-0">
        <SectionHeading as="h1" title="Frequently asked questions" subtitle="Everything about making, ordering and shipping your StoryBloom book." />
      </Section>
      <FaqSection faqs={allFaqs()} title="Questions and answers" />
      <Section className="text-center">
        <CreateButton />
      </Section>
    </>
  );
}
