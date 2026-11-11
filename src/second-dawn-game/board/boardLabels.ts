export const humanize = (text: string) =>
  text.replaceAll('-', ' ').replace(/^./, (c) => c.toUpperCase());
