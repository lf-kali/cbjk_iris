import "./theme.css";
import { inter, playfair } from "./fonts";
import type { Theme } from "@/types/theme";

const theme: Theme = {
  name: "oceano",
  fontClassName: `${inter.variable} ${playfair.variable}`,
};

export default theme;
