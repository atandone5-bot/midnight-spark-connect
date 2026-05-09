export const PICKUP_LINES = [
  "Hey 👋 if I said you had a beautiful aura, would you hold it against me?",
  "I was gonna text something clever, then I saw your photo and forgot 😅",
  "Tonight feels too good to spend it on apps. Coffee or wine?",
  "I'm new around here. What's your favorite late-night spot?",
  "Be honest — early bird or after-dark soul?",
  "If we skipped the small talk, what would you actually want me to know?",
  "What's the most spontaneous thing you've done this month?",
  "I have two questions: are you free tonight, and do you like good music?",
  "You give 'main character' energy. What's your story?",
  "Pick one: rooftop, beach, or somewhere quiet?",
];

export const EMOJIS = [
  "😀","😁","😂","🤣","😊","😍","🥰","😘","😉","😎",
  "🤔","🙃","😏","🥺","😢","😭","😤","🤯","🥳","😴",
  "👍","👎","👏","🙌","🙏","💪","🤝","✌️","🤞","🫶",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","💖","💔",
  "🔥","✨","⭐","🌙","☀️","🌹","🍷","🍻","🍕","🍔",
  "🎉","🎊","🎁","🎵","💃","🕺","💋","💯","👀","🌚",
] as const;

export const QUICK_REACTIONS = ["❤️", "😂", "😮", "🔥", "👍", "🙏"] as const;

export type ChatTheme = {
  id: string;
  name: string;
  bg: string;            // tailwind-friendly background CSS
  bubbleMine: string;
  bubbleTheirs: string;
};

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: "luxury",
    name: "Midnight Luxury",
    bg: "bg-[radial-gradient(circle_at_20%_-10%,oklch(0.32_0.10_330/0.55),transparent_60%),radial-gradient(circle_at_80%_110%,oklch(0.30_0.08_280/0.45),transparent_60%),oklch(0.10_0.02_280)]",
    bubbleMine: "bg-primary text-primary-foreground",
    bubbleTheirs: "bg-white/10 backdrop-blur-md text-foreground",
  },
  {
    id: "purple",
    name: "Royal Purple",
    bg: "bg-[radial-gradient(circle_at_30%_10%,oklch(0.40_0.18_300/0.7),transparent_55%),oklch(0.13_0.06_300)]",
    bubbleMine: "bg-[oklch(0.55_0.22_300)] text-white",
    bubbleTheirs: "bg-[oklch(0.20_0.05_300)] text-foreground",
  },
  {
    id: "noir",
    name: "Pure Black",
    bg: "bg-black",
    bubbleMine: "bg-primary text-primary-foreground",
    bubbleTheirs: "bg-zinc-900 text-zinc-100 border border-zinc-800",
  },
  {
    id: "sunset",
    name: "Sunset Rose",
    bg: "bg-[radial-gradient(circle_at_20%_20%,oklch(0.55_0.20_30/0.55),transparent_60%),oklch(0.14_0.04_25)]",
    bubbleMine: "bg-[oklch(0.62_0.22_25)] text-white",
    bubbleTheirs: "bg-[oklch(0.20_0.05_25)] text-foreground",
  },
];
