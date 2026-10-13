"use client"

import { useState } from "react"
import Logo from "@/public/JRiso.svg"
import MenuIcon from "@/public/menuIcon.svg"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { siteConfig } from "@/site.config"
import type { MenuItem } from "@/types/site-config"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import Link from "next/link"
import { Button } from "@/components/ui/button"

function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 h-20 w-full flex bg-white/86 backdrop-blur-2xl dark:bg-black/86">
      <nav className="h-full flex flex-row items-center justify-between px-5 w-full">
        <div className="flex flex-row cursor-pointer items-end gap-1 text-foreground">
          <Logo className="h-14" />
          <h1 className="font-mont font-extrabold text-xl">Acabamentos</h1>
        </div>

        <div className="flex items-center gap-1">
        {siteConfig.theme.colorMode === "system" && <ThemeToggle className="mt-4" />}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger>
            <div className="flex self-center">
              <MenuIcon className="h-6.5 mt-4 cursor-pointer" />
            </div>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader></SheetHeader>
            <div className="mt-4 px-4">
              <MenuList items={siteConfig.menu} onNavigate={() => setOpen(false)} />
            </div>
            <Button className="my-10" onClick={() => setOpen(false)}>
              FAÇA SEU ORÇAMENTO
            </Button>
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