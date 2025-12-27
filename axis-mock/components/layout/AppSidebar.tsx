"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Compass, PlusCircle, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const ROUTES = [
  {
    label: "Explore",
    icon: Compass,
    href: "/",
    color: "text-sky-500",
  },
  {
    label: "Create Vault",
    icon: PlusCircle,
    href: "/create",
    color: "text-emerald-500",
  },
  {
    label: "Portfolio",
    icon: LayoutDashboard,
    href: "/portfolio",
    color: "text-violet-500",
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Menu />
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="w-72 border-neutral-800 bg-neutral-950 p-0 text-white">
          <SheetHeader className="border-b border-neutral-800 p-6">
            <SheetTitle className="text-xl font-bold text-white">Axis Protocol</SheetTitle>
            <SheetDescription className="text-xs text-neutral-500">Navigation</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-1 p-4">
            {ROUTES.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex w-full cursor-pointer justify-start rounded-lg p-3 text-sm font-medium transition hover:bg-white/10 hover:text-white",
                  pathname === route.href ? "bg-white/10 text-white" : "text-neutral-400"
                )}
              >
                <div className="flex flex-1 items-center">
                  <route.icon className={cn("mr-3 h-5 w-5", route.color)} />
                  {route.label}
                </div>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
