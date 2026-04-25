import type { Metadata, Site, Socials } from "@types";

export const SITE: Site = {
  TITLE: "Rhytham Negi",
  DESCRIPTION: "AI Engineer building advanced AI infrastructure and automated business insights with Generative AI and Large Language Models.",
  EMAIL: "rhythamnegi@example.com", // Placeholder, user can update
  NUM_POSTS_ON_HOMEPAGE: 5,
  NUM_PROJECTS_ON_HOMEPAGE: 3,
};

export const HOME: Metadata = {
  TITLE: "Home",
  DESCRIPTION: "Rhytham Negi - AI Engineer Portfolio.",
};

export const BLOG: Metadata = {
  TITLE: "Blog",
  DESCRIPTION: "A collection of articles on topics I am passionate about.",
};

export const PROJECTS: Metadata = {
  TITLE: "Projects",
  DESCRIPTION:
    "A collection of my projects with links to repositories and live demos.",
};

export const SOCIALS: Socials = [
  {
    NAME: "LinkedIn",
    HREF: "https://linkedin.com/in/rhythamnegi",
  },
  {
    NAME: "GitHub",
    HREF: "https://github.com/Rhythamtech",
  },
  {
    NAME: "Website",
    HREF: "https://rhythamnegi.com",
  },
];
