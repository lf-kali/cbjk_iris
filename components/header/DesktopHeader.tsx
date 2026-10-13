import Link from "next/link"
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
import Logo from "@/public/JRiso.svg"
import { Button } from '@/components/ui/button';

function DesktopHeader() {
  return (
    
    <header className="sticky h-25 w-full flex backdrop-blur-2xl bg-background/86">
      <nav className="h-full flex flex-row items-center justify-between px-5 w-full">
        <div className="flex flex-row cursor-pointer items-end mb-2 gap-1 text-foreground">
          <Logo className="h-16" />
          <h1 className="font-heading font-extrabold text-2xl">Acabamentos</h1>
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
            <Button className="h-12 w-60">
                FAÇA SEU ORÇAMENTO!
            </Button>
        </div>

      </nav>
    </header>
  )
}

export default DesktopHeader