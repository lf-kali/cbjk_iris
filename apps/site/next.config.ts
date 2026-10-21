import { withIris } from "@cbjk_iris/engine/next";
import { siteConfig } from "./site.config";

// allowedDevOrigins só quando TAILNET_ADDRESS existe (acesso ao next dev pela Tailscale)
export default withIris(
  siteConfig,
  process.env.TAILNET_ADDRESS ? { allowedDevOrigins: [process.env.TAILNET_ADDRESS] } : {},
);
