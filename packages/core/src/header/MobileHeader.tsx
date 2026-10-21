"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "../ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion"
import { siteConfig } from "../lib/config"
import type { MenuItem } from "@cbjk_iris/schema"
import { ThemeToggle } from "../theme/ThemeToggle"
import Link from "next/link"
import { buttonVariants } from "../ui/button"
import { SiteLogo } from "../brand/SiteLogo"
import { whatsappUrl } from "../lib/whatsapp"

function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 h-20 w-full flex bg-background/86 backdrop-blur-2xl">
      <nav className="h-full flex flex-row items-center justify-between px-5 w-full">
        <SiteLogo logoClassName="h-14" textClassName="text-xl" />

        <div className="flex items-center gap-1">
        {siteConfig.theme.colorMode === "system" && <ThemeToggle className="mt-4" />}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger aria-label="Abrir menu" className="mt-4 flex cursor-pointer self-center text-foreground">
            <Menu className="size-6.5" />
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader></SheetHeader>
            <div className="mt-4 px-4">
              <MenuList items={siteConfig.menu} onNavigate={() => setOpen(false)} />
            </div>
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={buttonVariants({ className: "my-10" })}
            >
              {siteConfig.texts.headerCta}
            </a>
          </SheetContent>
        </Sheet>
        </div>
      </nav>
    </header>
  )
}

function MenuList({
  items,
  onNavigate,
}: {
  items: MenuItem[]
  onNavigate: () => void
}) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((item) =>
        item.children ? (
          <AccordionItem key={item.title} value={item.title}>
            <AccordionTrigger>{item.title}</AccordionTrigger>
            <AccordionContent>
              <ul className="flex flex-col gap-2 pl-4">
                {item.children.map((child) => (
                  <li key={child.title}>
                    <Link href={child.path ?? "#"} onClick={onNavigate}>
                      {child.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ) : (
          <div key={item.title} className="py-3 border-b">
            <Link href={item.path ?? "#"} onClick={onNavigate}>
              {item.title}
            </Link>
          </div>
        )
      )}
    </Accordion>
  )
}

export default MobileHeader