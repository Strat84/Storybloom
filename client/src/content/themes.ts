/**
 * Structured story templates (P0-3).
 *
 * Each theme has a fixed plot outline, a default page count and illustration
 * guidance, so the AI output is predictable. The wizard turns a theme plus the
 * child's details into a prompt for the existing /stories/generate endpoint.
 */

export type Pronouns = "she" | "he" | "they";

export interface HeroDetails {
  name: string;
  age: number;
  pronouns: Pronouns;
}

export interface StoryTheme {
  id: string;
  season: "holiday" | "evergreen";
  /** Display name with a placeholder, e.g. "[Name] Saves Christmas". */
  label: string;
  title(hero: HeroDetails): string;
  tagline: string;
  /** One paragraph for theme cards and landing pages. */
  description: string;
  defaultPages: 10 | 15 | 20;
  /** Plot beats in order. Roughly one per interior page. */
  outline(hero: HeroDetails): string[];
  /** Setting, palette and recurring visual elements for every illustration. */
  illustrationGuide: string;
  /** Emoji-free accent used on cards. */
  accent: string;
  /** SEO landing page for this theme, if any. */
  landingPath?: string;
}

export const PRONOUNS: Record<Pronouns, { subject: string; object: string; possessive: string; label: string }> = {
  she: { subject: "she", object: "her", possessive: "her", label: "She / her" },
  he: { subject: "he", object: "him", possessive: "his", label: "He / him" },
  they: { subject: "they", object: "them", possessive: "their", label: "They / them" },
};

export function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${suffix}`;
}

function siblingWord(pronouns: Pronouns) {
  return pronouns === "she" ? "Sister" : pronouns === "he" ? "Brother" : "Sibling";
}

export const THEMES: StoryTheme[] = [
  {
    id: "saves-christmas",
    season: "holiday",
    label: "[Name] Saves Christmas",
    title: (h) => `${h.name} Saves Christmas`,
    tagline: "Santa's sleigh is stuck, and only one kid can help.",
    description:
      "On Christmas Eve, Santa's sleigh won't fly. Your child is called to the North Pole to find the missing spark of Christmas cheer, team up with the elves, and get every present delivered before sunrise.",
    defaultPages: 10,
    outline: (h) => [
      `On Christmas Eve, ${h.name} hears sleigh bells and finds a worried elf named Pip at the window.`,
      `Pip explains Santa's sleigh has lost its Christmas spark and can't fly. Only a kind and brave kid can help.`,
      `${h.name} rides a magic snow-globe to the North Pole, where the workshop lights are flickering.`,
      `${h.name} meets Santa, who is kind but worried, and the reindeer, who are sleepy and sad.`,
      `${h.name} discovers the spark comes from kindness and starts small: helping elves wrap the last gifts.`,
      `${h.name} cheers up the reindeer with a silly song and the workshop lights glow a little brighter.`,
      `${h.name} finds the final missing piece: a forgotten letter from a child who only wished for a friend.`,
      `${h.name} adds a kind note to that child's gift, and the spark bursts back to life.`,
      `The sleigh lifts off with ${h.name} helping Santa deliver presents across a sparkling night sky.`,
      `${h.name} wakes up at home on Christmas morning, with a tiny golden bell and a thank-you note from Santa.`,
    ],
    illustrationGuide:
      "Cozy, glowing Christmas palette: deep reds, evergreen, warm gold light, soft snow. Recurring elements: Pip the elf (green hat with a bell), Santa's red sleigh, the golden spark of light.",
    accent: "from-red-500/15 to-emerald-500/15",
    landingPath: "/christmas-book-for-kids",
  },
  {
    id: "north-pole-night",
    season: "holiday",
    label: "A Night at the North Pole with [Name]",
    title: (h) => `A Night at the North Pole with ${h.name}`,
    tagline: "A cozy overnight adventure in Santa's village.",
    description:
      "Your child gets a golden invitation for one magical night at the North Pole: a tour of the toy workshop, cocoa with Mrs. Claus, reindeer flight school, and a starry sleigh ride home.",
    defaultPages: 10,
    outline: (h) => [
      `${h.name} finds a golden envelope under the pillow: an invitation to spend one night at the North Pole.`,
      `A gentle polar bear named Bramble arrives to carry ${h.name} through the snowy northern lights.`,
      `${h.name} arrives at a candy-cane gate and sees the twinkling village of Santa's helpers.`,
      `Inside the toy workshop, ${h.name} helps the elves test toys and paints the stripes on a rocking horse.`,
      `Mrs. Claus serves hot cocoa and cookies and asks ${h.name} to taste-test a brand-new recipe.`,
      `${h.name} visits reindeer flight school and helps the youngest reindeer take a first wobbly hop.`,
      `The village gathers to watch the northern lights dance, and ${h.name} makes a wish on the brightest star.`,
      `Santa thanks ${h.name} for being such a good helper and gives ${PRONOUNS[h.pronouns].object} a special ornament.`,
      `${h.name} rides home in the sleigh, waving goodbye to new friends below.`,
      `Back in bed, ${h.name} smiles: the ornament on the nightstand is glowing softly.`,
    ],
    illustrationGuide:
      "Soft, dreamy night palette: indigo sky, aurora greens and purples, warm window light, fluffy snow. Recurring elements: Bramble the polar bear (red scarf), the golden invitation, the glowing ornament.",
    accent: "from-indigo-500/15 to-emerald-400/15",
    landingPath: "/christmas-book-for-kids",
  },
  {
    id: "lost-reindeer",
    season: "holiday",
    label: "[Name] and the Lost Reindeer",
    title: (h) => `${h.name} and the Lost Reindeer`,
    tagline: "A little reindeer is lost, and Christmas is days away.",
    description:
      "A baby reindeer lands in the backyard, lost and far from home. Your child follows clues through a snowy forest, makes animal friends along the way, and helps the reindeer find its way back to Santa in time for Christmas.",
    defaultPages: 10,
    outline: (h) => [
      `Just before Christmas, ${h.name} finds a tiny reindeer named Juniper stuck in the backyard snow.`,
      `Juniper is too young to fly far and got lost during flying practice. ${h.name} promises to help.`,
      `${h.name} and Juniper follow a trail of glittering hoofprints into the snowy forest.`,
      `A clever owl gives them a riddle that points them toward the tallest pine tree.`,
      `At the frozen pond, a family of rabbits helps them cross safely by showing the strongest ice path.`,
      `A snowstorm starts, and ${h.name} keeps Juniper warm and brave with a cozy song.`,
      `When the snow clears, they see the North Star shining right above the hill.`,
      `${h.name} cheers Juniper on with a big "You can do it!", and Juniper flies for the very first time.`,
      `Santa's sleigh appears, and the whole reindeer team cheers for Juniper's return.`,
      `On Christmas morning, ${h.name} finds a silver bell and hoofprints on the roof.`,
    ],
    illustrationGuide:
      "Wintry woodland palette: snowy whites, pine greens, berry reds, soft blue shadows. Recurring elements: Juniper the baby reindeer (tiny red nose ribbon), the glittering hoofprints, the North Star.",
    accent: "from-sky-500/15 to-rose-400/15",
    landingPath: "/christmas-book-for-kids",
  },
  {
    id: "hanukkah-lights",
    season: "holiday",
    label: "[Name]'s First Hanukkah Lights",
    title: (h) => `${h.name}'s First Hanukkah Lights`,
    tagline: "Eight nights of light, family and a little miracle.",
    description:
      "Your child is finally old enough to help light the menorah. Across eight nights of Hanukkah they spin the dreidel, help make latkes, hear the story of the oil that lasted, and discover the light they bring to their family.",
    defaultPages: 10,
    outline: (h) => [
      `It's the first night of Hanukkah, and ${h.name} is finally old enough to help light the menorah.`,
      `${h.name}'s family tells the story of the Maccabees and the small jar of oil that lasted eight nights.`,
      `${h.name} carefully helps light the shamash and the first candle while the family sings together.`,
      `On another night, ${h.name} helps grate potatoes and make crispy, golden latkes in the kitchen.`,
      `${h.name} spins the dreidel with cousins and learns what nun, gimel, hei and shin mean.`,
      `A snowy evening brings sufganiyot, jelly doughnuts dusted with sugar, and lots of giggles.`,
      `${h.name} decides to share Hanukkah gelt and kindness with a neighbor who is spending the holiday alone.`,
      `The neighbor joins the family, and the room feels even brighter with one more friend.`,
      `On the eighth night, all the candles glow together in the window for everyone to see.`,
      `${h.name} realizes the brightest light of all is the love and kindness ${PRONOUNS[h.pronouns].subject} share${h.pronouns === "they" ? "" : "s"} with others.`,
    ],
    illustrationGuide:
      "Warm, glowing palette: candlelight gold, deep blues and silver, cozy home interiors. Recurring elements: the family menorah in the window (nine branches), a blue-and-white dreidel, winter snow outside.",
    accent: "from-blue-500/15 to-amber-300/20",
  },
  {
    id: "birthday-adventure",
    season: "evergreen",
    label: "[Name]'s Birthday Adventure",
    title: (h) => `${h.name}'s Birthday Adventure`,
    tagline: "A birthday wish that opens a door to adventure.",
    description:
      "On their birthday, your child's wish comes true in the most surprising way: a map hidden in the cake leads to a treasure hunt through magical places, ending in the best birthday party ever.",
    defaultPages: 10,
    outline: (h) => [
      `It's ${h.name}'s ${ordinal(h.age)} birthday, and ${PRONOUNS[h.pronouns].subject} wake${h.pronouns === "they" ? "" : "s"} up feeling extra sparkly.`,
      `When ${h.name} blows out the candles and makes a wish, a tiny map pops out of the cake.`,
      `The map leads through a door in the garden to a land of giant balloons and talking flowers.`,
      `${h.name} helps a balloon creature named Pop find his lost string and gains a loyal friend.`,
      `They cross the Lemonade River on a cookie raft, laughing all the way.`,
      `A friendly dragon guards the next clue and only wants someone to sing him "Happy Birthday" too.`,
      `${h.name} shares a slice of cake with the dragon, who gives ${PRONOUNS[h.pronouns].object} the final clue.`,
      `The treasure chest is full of ${h.age} glowing wishes, one for every year of ${h.name}'s life.`,
      `${h.name} uses a wish to bring all the new friends to a giant birthday party.`,
      `Back home, ${h.name} finds the tiny map tucked into a birthday card: "Happy Birthday, adventurer."`,
    ],
    illustrationGuide:
      "Bright, celebratory palette: confetti colors, sunny yellows, candy pinks and sky blues. Recurring elements: the birthday cake with candles, Pop the balloon creature, the treasure map.",
    accent: "from-pink-500/15 to-amber-300/20",
    landingPath: "/personalized-birthday-book",
  },
  {
    id: "space-explorer",
    season: "evergreen",
    label: "[Name] the Space Explorer",
    title: (h) => `${h.name} the Space Explorer`,
    tagline: "Blast off to the stars on a mission to help a lost alien.",
    description:
      "Your child becomes captain of a cardboard rocket that really flies. They visit the Moon, ring Saturn's rings, meet a friendly lost alien, and use courage and curiosity to help it get home.",
    defaultPages: 10,
    outline: (h) => [
      `${h.name} builds a rocket out of a cardboard box, and at bedtime it starts to hum and glow.`,
      `Captain ${h.name} straps in, counts down from ten, and blasts off into the starry sky.`,
      `${h.name} lands on the Moon, bounces in low gravity and plants a flag with ${PRONOUNS[h.pronouns].possessive} name on it.`,
      `A blinking signal leads ${h.name} to a small, friendly alien named Zib whose ship has run out of starlight.`,
      `${h.name} and Zib zoom past Mars and learn why it is called the Red Planet.`,
      `They loop around Saturn's rings, which sparkle like ice and dust.`,
      `${h.name} has a clever idea: collect starlight from a shooting star to refuel Zib's ship.`,
      `Working together, they catch the shooting star's glow in a jar.`,
      `Zib's ship powers up, and Zib gives ${h.name} a tiny star that will always light the way home.`,
      `${h.name} lands back in bed, and the tiny star twinkles on the ceiling all night long.`,
    ],
    illustrationGuide:
      "Deep space palette: navy and violet skies, glowing planets, starlight silver, warm cockpit lights. Recurring elements: the cardboard rocket with a hand-drawn logo, Zib the green alien with three eyes, the tiny star.",
    accent: "from-violet-500/15 to-sky-400/15",
  },
  {
    id: "big-sibling",
    season: "evergreen",
    label: "[Name] Becomes a Big Brother / Sister",
    title: (h) => `${h.name} the Big ${siblingWord(h.pronouns)}`,
    tagline: "A gentle story for welcoming a new baby.",
    description:
      "A reassuring story for a child about to welcome a new baby. Big feelings, important jobs, and the discovery that there is plenty of love to go around, with your child as the proud new big sibling.",
    defaultPages: 10,
    outline: (h) => [
      `${h.name}'s family has big news: a new baby is coming, and ${h.name} is going to be a big ${siblingWord(h.pronouns).toLowerCase()}.`,
      `${h.name} feels excited, curious and a little bit worried all at once, and that's okay.`,
      `${h.name} helps get the baby's room ready and picks out a special toy to share.`,
      `${h.name} wonders if there will still be enough love for ${PRONOUNS[h.pronouns].object}. A grown-up gives a big hug and explains love grows bigger, not smaller.`,
      `The baby arrives! ${h.name} meets the tiny new sibling and sees how small their fingers are.`,
      `${h.name} learns that babies cry, sleep and need lots of gentle help.`,
      `${h.name} discovers important big-${siblingWord(h.pronouns).toLowerCase()} jobs: singing lullabies, fetching diapers and making silly faces.`,
      `The baby smiles for the very first time, right at ${h.name}.`,
      `${h.name} still gets special one-on-one time with grown-ups and feels proud and loved.`,
      `${h.name} tucks in the baby and whispers, "I'm your big ${siblingWord(h.pronouns).toLowerCase()}, and I'll always look out for you."`,
    ],
    illustrationGuide:
      "Soft, warm family palette: pastels, gentle morning light, cozy home interiors. Recurring elements: the shared toy, the baby's crib with a star mobile. Keep family members gentle and non-specific so any family sees itself.",
    accent: "from-rose-400/15 to-teal-400/15",
    landingPath: "/new-sibling-book",
  },
];

export function getTheme(id: string | null | undefined) {
  return THEMES.find((t) => t.id === id);
}

export const HOLIDAY_THEMES = THEMES.filter((t) => t.season === "holiday");
export const EVERGREEN_THEMES = THEMES.filter((t) => t.season === "evergreen");
