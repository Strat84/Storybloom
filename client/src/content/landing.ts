import config from "@config";
import type { Faq } from "./faq";

export interface LandingSection {
  heading: string;
  paragraphs: string[];
}

export interface LandingPage {
  path: string;
  /** Only prerendered, linked and listed in the sitemap when true. */
  enabled: boolean;
  metaTitle: string;
  metaDescription: string;
  breadcrumb: string;
  eyebrow: string;
  h1: string;
  intro: string;
  ctaLabel: string;
  /** Themes shown on the page; the first is preselected in the wizard. */
  themeIds: string[];
  /** Holiday pages show the shipping deadline block. */
  holiday?: boolean;
  /** Example book to show sample pages from. */
  sampleSlug?: string;
  benefits: { title: string; text: string }[];
  sections: LandingSection[];
  faqs: Faq[];
}

const photo = config.features.photoUpload;

export const LANDING_PAGES: LandingPage[] = [
  {
    path: "/christmas-book-for-kids",
    enabled: true,
    metaTitle: "Personalized Christmas Book for Kids | StoryBloom",
    metaDescription:
      "Make a personalized Christmas storybook starring your child. Pick a holiday story, choose an art style, and give a printed keepsake or an instant digital gift.",
    breadcrumb: "Christmas books",
    eyebrow: "Christmas 2026",
    h1: "A personalized Christmas book starring your child",
    intro:
      "Your child saves Christmas, spends a night at the North Pole, or rescues a lost reindeer, with their name on the cover and their look on every page. Create it in minutes, preview it free, and give it as a printed keepsake or an instant digital gift.",
    ctaLabel: "Create their Christmas book",
    themeIds: ["saves-christmas", "north-pole-night", "lost-reindeer", "hanukkah-lights"],
    holiday: true,
    benefits: [
      { title: "Their name, their story", text: "Your child is the hero of a complete holiday adventure, with their name in the title." },
      { title: "Four holiday stories", text: "Three Christmas adventures and a Hanukkah story, each with a carefully planned plot." },
      { title: "A gift that lasts", text: "A printed book they'll read every December, or a PDF that's ready instantly." },
    ],
    sections: [
      {
        heading: "A Christmas story where your child is the hero",
        paragraphs: [
          "Most Christmas books are about someone else. A StoryBloom book is about your child. They're the one Santa calls when the sleigh won't fly, the one who gets a golden invitation to the North Pole, the one who helps a baby reindeer find its way home.",
          "Every holiday story follows a planned plot with a warm beginning, a gentle adventure and a happy ending, so the book reads like a real picture book, not a random AI story. You add the details that make it theirs: their name, age, favorite animal or toy, and a personal dedication on the first page.",
        ],
      },
      {
        heading: "Pick the art style they'll love",
        paragraphs: [
          "Choose traditional cartoon, anime, 3D animation or chibi illustrations. Your child appears in that style on the cover and every page, from the snowy workshop to the sleigh ride across the stars.",
        ],
      },
      {
        heading: "Printed keepsake or instant gift",
        paragraphs: [
          "Order a professionally printed book shipped to your door, or download a full-color PDF to read on a tablet or print at home. Ordering late? The digital book is ready the moment you finish, so it works as a last-minute gift on Christmas morning.",
        ],
      },
    ],
    faqs: [],
  },
  {
    path: "/hanukkah-book-for-kids",
    enabled: true,
    metaTitle: "Personalized Hanukkah Book for Kids | StoryBloom",
    metaDescription:
      "A personalized Hanukkah storybook starring your child: lighting the menorah, spinning the dreidel and sharing the light, with their name on the cover.",
    breadcrumb: "Hanukkah books",
    eyebrow: "Hanukkah 2026",
    h1: "A personalized Hanukkah book for your child",
    intro:
      "In \"[Name]'s First Hanukkah Lights\", your child is finally old enough to help light the menorah. Across eight nights they make latkes, spin the dreidel, hear the story of the oil that lasted, and discover the light they bring to their family.",
    ctaLabel: "Create their Hanukkah book",
    themeIds: ["hanukkah-lights"],
    holiday: true,
    benefits: [
      { title: "A story about them", text: "Your child's name, age and look throughout a warm, eight-night Hanukkah story." },
      { title: "Traditions explained gently", text: "The menorah, the dreidel's letters, latkes and sufganiyot, told simply for young readers." },
      { title: "Read it every year", text: "A printed keepsake for the family bookshelf, or a PDF that's ready instantly." },
    ],
    sections: [
      {
        heading: "Eight nights, one hero",
        paragraphs: [
          "Hanukkah books for kids are wonderful, but few of them star your child. In this story, your child helps light the shamash and the first candle, learns what nun, gimel, hei and shin mean on the dreidel, and shares Hanukkah gelt and kindness with a neighbor.",
          "Add a personal dedication from parents or grandparents on the first page, and choose an art style: traditional cartoon, anime, 3D animation or chibi.",
        ],
      },
      {
        heading: "A gift for the whole family",
        paragraphs: [
          "Order a printed book to give on the first night, or download the PDF instantly. Grandparents can make one for each grandchild.",
        ],
      },
    ],
    faqs: [],
  },
  {
    path: "/personalized-birthday-book",
    enabled: true,
    metaTitle: "Personalized Birthday Book for Kids | StoryBloom",
    metaDescription:
      "A personalized birthday storybook where your child is the hero. Their name, age and favorite things in a magical birthday adventure. Printed or instant PDF.",
    breadcrumb: "Birthday books",
    eyebrow: "Birthday gift idea",
    h1: "A personalized birthday book where your child is the hero",
    intro:
      "On their birthday, your child's wish comes true: a map hidden in the cake leads to a treasure hunt through a land of giant balloons, a lemonade river and a dragon who just wants someone to sing to him. Their name, their age, their adventure.",
    ctaLabel: "Create their birthday book",
    themeIds: ["birthday-adventure", "space-explorer"],
    sampleSlug: "the-birthday-that-grew",
    benefits: [
      { title: "Made for their age", text: "The story celebrates the exact birthday they're turning, with a reading level to match." },
      { title: "Their favorite things", text: "Add a favorite animal, toy or hobby and it becomes part of the adventure." },
      { title: "A keepsake for every year", text: "A printed book to mark the birthday, or an instant PDF for a party-day surprise." },
    ],
    sections: [
      {
        heading: "A birthday gift they'll keep for years",
        paragraphs: [
          "Toys get outgrown, but a book with their name on the cover goes on the shelf and gets read again every birthday. StoryBloom's birthday adventure is written around your child's name and age, and you can add a personal message on the first page.",
          "Grandparents, aunts and uncles love it as a gift that's personal without being complicated: it takes a few minutes to make, and you can preview the whole story before you buy.",
        ],
      },
      {
        heading: "Choose the adventure",
        paragraphs: [
          "Go with the birthday treasure hunt, or pick another story they'll love, like a space mission to help a lost alien get home. Every story has a planned plot, so it reads like a real picture book.",
        ],
      },
    ],
    faqs: [],
  },
  {
    path: "/new-sibling-book",
    enabled: true,
    metaTitle: "Big Brother & Big Sister Book, Personalized | StoryBloom",
    metaDescription:
      "Help your child get ready for a new baby with a personalized big brother or big sister book. A gentle story about big feelings and important new jobs.",
    breadcrumb: "New sibling books",
    eyebrow: "New baby on the way",
    h1: "A personalized book for your new big brother or big sister",
    intro:
      "A gentle, reassuring story for a child who's about to welcome a new baby: feeling excited and a little worried, helping get ready, meeting the baby, and discovering there's plenty of love to go around, all starring your child as the proud new big brother or sister.",
    ctaLabel: "Create their big brother or sister book",
    themeIds: ["big-sibling"],
    benefits: [
      { title: "Names the big feelings", text: "Excited, curious and a little worried are all okay, and the story says so." },
      { title: "Important new jobs", text: "Singing lullabies, fetching diapers and making silly faces make them proud helpers." },
      { title: "Any family", text: "Grown-ups are kept gentle and non-specific so every family sees itself." },
    ],
    sections: [
      {
        heading: "Help them get ready for the new baby",
        paragraphs: [
          "Becoming a big brother or sister is a big change. Reading a story where your child is the big brother or big sister helps young children picture what's coming and talk about how they feel. The story reassures them that love grows bigger, not smaller, when a family grows.",
          "Choose whether your child is a boy or a girl to make it a big brother or big sister story, add a dedication from the family, and choose an art style.",
        ],
      },
      {
        heading: "A perfect gift from the new baby",
        paragraphs: [
          "Many families give the book \"from the baby\" when they first meet. Order a printed copy ahead of the due date, or download the PDF instantly.",
        ],
      },
    ],
    faqs: [],
  },
  {
    path: "/gift-for-grandchild",
    enabled: true,
    metaTitle: "Personalized Gift for a Grandchild | StoryBloom",
    metaDescription:
      "A storybook starring your grandchild, with a personal dedication from you. Pick an adventure, make it in minutes, and send a printed book or instant PDF.",
    breadcrumb: "Gifts for grandchildren",
    eyebrow: "For grandparents",
    h1: "A storybook starring your grandchild, with a note from you",
    intro:
      "Give your grandchild a book where they're the hero and you're on the first page. Pick an adventure, add their name and a few favorite things, write a personal dedication, and send it as a printed book or an instant digital gift.",
    ctaLabel: "Create a book for your grandchild",
    themeIds: ["saves-christmas", "birthday-adventure", "space-explorer", "big-sibling"],
    sampleSlug: "the-turtle-who-wanted-to-be-fast",
    benefits: [
      { title: "Your words on page one", text: "A personal dedication from Grandma, Grandpa or whatever they call you." },
      { title: "Simple to make", text: "Step-by-step: pick a story, add their name and favorite things, and preview it free." },
      { title: "Shipped to their door", text: "Send the printed book straight to your grandchild's home, or share the PDF." },
    ],
    sections: [
      {
        heading: "A gift that's personal, not complicated",
        paragraphs: [
          "Finding a gift that feels personal for a grandchild can be hard, especially from far away. A StoryBloom book puts them at the center of the story, with their name on the cover and a few of their favorite things woven in, and you can sign it with a dedication on the first page.",
          "You don't need to be good with technology. The guided steps walk you through it, and you can see the whole story before you pay.",
        ],
      },
      {
        heading: "One for every grandchild",
        paragraphs: [
          "Make a different adventure for each grandchild: a Christmas rescue for one, a space mission for another, a big-sibling story when a new baby arrives. Each book is printed to order and shipped to US addresses.",
        ],
      },
    ],
    faqs: [],
  },
  {
    path: "/personalized-space-book",
    enabled: true,
    metaTitle: "Personalized Space Book for Kids | StoryBloom",
    metaDescription:
      "Your child becomes a space explorer in a personalized storybook: blast off to the Moon, loop Saturn's rings and help a lost alien get home.",
    breadcrumb: "Space books",
    eyebrow: "For little astronauts",
    h1: "A personalized space adventure starring your child",
    intro:
      "Your child's cardboard rocket really flies. As captain, they bounce on the Moon, races past Mars, loops Saturn's rings and helps a friendly lost alien collect starlight to get home.",
    ctaLabel: "Create their space adventure",
    themeIds: ["space-explorer"],
    benefits: [
      { title: "Real space facts", text: "Low gravity on the Moon, the Red Planet and Saturn's icy rings, told simply." },
      { title: "Brave and kind", text: "The mission is about helping a new friend, not fighting anyone." },
      { title: "Bedtime ready", text: "It ends back in bed with a tiny star twinkling on the ceiling." },
    ],
    sections: [
      {
        heading: "For kids who love rockets and stars",
        paragraphs: [
          "If your child builds rockets out of boxes and knows the planets in order, this is their book. The story mixes a gentle adventure with simple space facts, and your child is the captain the whole way.",
          "Add their favorite animal or toy as a co-pilot, choose an art style, and write a dedication for the first page.",
        ],
      },
    ],
    faqs: [],
  },
  {
    path: "/personalized-book-with-childs-photo",
    enabled: photo,
    metaTitle: "Personalized Book with Your Child's Photo | StoryBloom",
    metaDescription:
      "Upload a photo and your child becomes the illustrated hero of their own storybook, looking like themselves on every page and the cover.",
    breadcrumb: "Photo storybooks",
    eyebrow: "Upload a photo",
    h1: "Upload a photo and your child becomes the hero",
    intro:
      "Upload one to three photos of your child. StoryBloom creates an illustrated character with their hair, skin tone, eye color and glasses, and keeps them looking like themselves on every page and the cover.",
    ctaLabel: "Upload a photo to start",
    themeIds: ["saves-christmas", "birthday-adventure", "space-explorer", "big-sibling"],
    benefits: [
      { title: "Looks like them", text: "An illustrated character built from your photos, consistent on every page." },
      { title: "Private by design", text: "Photos are stored privately, deleted automatically, and never used to train AI." },
      { title: "Siblings and pets too", text: "Add a brother or sister, a grandparent or the family pet, each from a photo or a short description." },
    ],
    sections: [
      {
        heading: "From photo to picture-book hero",
        paragraphs: [
          "Choose one to three clear photos of your child. StoryBloom draws them as an illustrated character in the art style you pick, from traditional cartoon to anime, 3D animation or chibi, keeping what makes them recognizable: their hair, skin tone, eyes, freckles and glasses.",
          "That character then appears on the cover and every page of the story, looking the same throughout. Brothers, sisters, friends, grandparents and pets can join the adventure too.",
        ],
      },
      {
        heading: "No photo? No problem",
        paragraphs: [
          "Photos are optional. If you'd rather not upload one, describe your child instead: hair color and style, skin tone, eye color and glasses. The story is just as personal.",
        ],
      },
      {
        heading: "Your photos stay private",
        paragraphs: [
          "Only a parent or guardian (or someone with their permission) can upload photos. They're stored privately, used only to draw your book, deleted automatically within 30 days, and never used to train AI. You can delete your photos and books any time from your account.",
        ],
      },
    ],
    faqs: [],
  },
];

export function enabledLandingPages() {
  return LANDING_PAGES.filter((p) => p.enabled);
}

export function landingFor(path: string) {
  return LANDING_PAGES.find((p) => p.path === path && p.enabled);
}
