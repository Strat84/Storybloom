import config from "@config";
import { digitalPrice, formatPrice, lowestPrintPrice, shippingMethod } from "@/lib/pricing";

export interface Faq {
  question: string;
  answer: string;
}

const standard = shippingMethod("standard");
const express = shippingMethod("express");

/** General FAQ. Answers must stay true to how the product works today. */
export function generalFaqs(): Faq[] {
  const faqs: Faq[] = [
    {
      question: "How does StoryBloom work?",
      answer:
        "Pick a story theme, tell us your child's name, age and what they look like, and choose an art style. StoryBloom writes a personalized story with your child as the hero and illustrates every page. You can review and edit the text and pictures, then download it as a PDF or order a printed book.",
    },
    {
      question: "How much does a personalized book cost?",
      answer: `Creating and previewing your story is free. A digital PDF is ${formatPrice(digitalPrice())}, and printed books start at ${formatPrice(lowestPrintPrice())} plus shipping (from ${formatPrice(standard.price)}).`,
    },
    {
      question: "How long does it take to make a book?",
      answer:
        "The story is usually written in a few minutes, and the illustrations take a few minutes more. You can edit any page before you buy.",
    },
    {
      question: "When will my printed book arrive?",
      answer: `Every book is printed to order. Standard shipping takes about ${standard.minDays}–${standard.maxDays} business days and express about ${express.minDays}–${express.maxDays} business days. Printed books currently ship to US addresses.`,
    },
    {
      question: "What ages are StoryBloom books for?",
      answer:
        "Stories are written for ages 3 to 9, with the reading level matched to your child's age. Younger children love having them read aloud.",
    },
    {
      question: "Can I change the story or pictures?",
      answer: `Yes. You can edit the text and the picture descriptions for each page before the illustrations are made, and redraw up to ${config.story.regenerationLimit} illustrations per book with your own feedback.`,
    },
    {
      question: "Will the illustrations look like my child?",
      answer: config.features.photoUpload
        ? "Upload one to three photos and StoryBloom builds an illustrated character with your child's hair, skin tone, eye color and glasses, then keeps that character consistent on every page and the cover."
        : "You describe your child's hair, skin tone, eye color and glasses, and StoryBloom uses that description for the hero on every page and the cover. You can adjust any illustration if it isn't quite right.",
    },
    {
      question: "Is my child's information private?",
      answer:
        "Your stories are private to your account and are never shown publicly. Only a parent or guardian creates the account. You can delete a story at any time from My Stories.",
    },
    {
      question: "What if there's a problem with my printed book?",
      answer:
        "Because every book is made to order from the story you approved, please review your preview carefully. If your book arrives damaged or with a printing defect, contact us and we'll replace it.",
    },
  ];
  return faqs;
}

export function christmasFaqs(): Faq[] {
  return [
    {
      question: "When do I need to order for Christmas delivery?",
      answer: `Order a printed book with standard shipping by ${new Date(`${config.holiday.printCutoffDate}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}, or with express shipping by ${new Date(`${config.holiday.expressCutoffDate}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}, for delivery by Christmas. A digital PDF is ready instantly, any time.`,
    },
    {
      question: "Can I make a Hanukkah or non-Christmas winter book?",
      answer:
        "Yes. Alongside the Christmas stories there's a Hanukkah story, \"[Name]'s First Hanukkah Lights\", and you can always write your own winter story.",
    },
  ];
}
