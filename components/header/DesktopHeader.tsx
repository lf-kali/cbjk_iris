import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { siteConfig } from "@/site.config"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { buttonVariants } from "@/components/ui/button"
import { SiteLogo } from "@/components/brand/SiteLogo"
import { whatsappUrl } from "@/lib/whatsapp"

function DesktopHeader() {
  return (
    
    <header className="sticky h-25 w-full flex backdrop-blur-2xl bg-background/86">
      <nav className="h-full flex flex-row items-center justify-between px-5 w-full">
        <div className="mb-2">
          <SiteLogo logoClassName="h-16" textClassName="text-2xl" />
        </div>
        <NavigationMenu className="mt-6.5">
            <NavigationMenuList>
                {siteConfig.menu.map((item) =>
                item.children ? (
                    <NavigationMenuItem key={item.title}>
                    <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
                    <NavigationMenuContent>
                        <ul className="grid w-[300px] gap-2 p-4">
                        {item.children.map((child) => (
                            <li key={child.title}>
                                <NavigationMenuLink href={child.path ?? "#"}>
                                    {child.title}
                                </NavigationMenuLink>
                            </li>
                        ))}
                        </ul>
                    </NavigationMenuContent>
                    </NavigationMenuItem>
                ) : (
                    <NavigationMenuItem key={item.title}>
                        <NavigationMenuLink href={item.path ?? "#"}>
                            {item.title}
                        </NavigationMenuLink>
                    </NavigationMenuItem>
                )
                )}
            </NavigationMenuList>
        </NavigationMenu>
        <div className="mt-1.5 flex items-center gap-2">
            {siteConfig.theme.colorMode === "system" && <ThemeToggle />}
            <a
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ className: "h-12 w-60" })}
            >
                {siteConfig.texts.headerCta}
            </a>
        </div>

      </nav>
    </header>
  )
}

export default DesktopHeader