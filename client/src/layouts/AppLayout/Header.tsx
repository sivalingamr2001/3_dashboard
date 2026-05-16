import { Bell, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";

interface HeaderProps {
  onMenuToggle: () => void;
  onNotificationToggle: () => void;
  toggleSidebarCollapsed: () => void;
  sidebarCollapsed: boolean;
  pageCopy: {
    title: string;
  };
}

export const Header = ({
  onMenuToggle,
  onNotificationToggle,
  toggleSidebarCollapsed,
  sidebarCollapsed,
  pageCopy,
}: HeaderProps) => {
  return (
    <header className="bg-card/90 z-20 shrink-0 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-4 md:px-6">
        {/* LEFT SECTION */}
        <div className="flex min-w-0 items-center gap-3 md:gap-5">
          {/* MOBILE MENU BUTTON */}
          <Button
            onClick={onMenuToggle}
            size="icon"
            variant="outline"
            className="bg-background flex h-11 w-11 rounded-2xl shadow-sm lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* DESKTOP COLLAPSE BUTTON */}
          <Button
            onClick={toggleSidebarCollapsed}
            size="icon"
            variant="outline"
            className="bg-background hidden h-11 w-11 rounded-2xl shadow-sm lg:flex"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>

          <div>
            {/* DIVIDER */}
            <Separator orientation="vertical" className="hidden h-8 lg:block" />
          </div>

          {/* PAGE TITLE */}
          <div className="min-w-0">
            <h1
              key={pageCopy.title}
              className="animate-title-slide text-foreground truncate text-xl font-semibold tracking-[-0.03em] md:text-2xl"
            >
              {pageCopy.title}
            </h1>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-3 md:gap-5">
          {/* NOTIFICATION */}
          <Button
            onClick={onNotificationToggle}
            size="icon"
            variant="ghost"
            className="bg-background relative hidden h-11 w-11 rounded-full shadow-sm lg:flex"
          >
            <Bell className="h-5 w-5" />

            {/* NOTIFICATION DOT */}
            <span className="bg-primary ring-background absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full ring-2" />
          </Button>

          {/* DIVIDER */}
          <div>
            <Separator orientation="vertical" className="hidden h-10 sm:block" />
          </div>

          {/* PROFILE */}
          <div className="flex items-center gap-3">
            {/* AVATAR */}
            <Avatar size="lg">
              <AvatarImage src="https://i.pravatar.cc/100?img=12" alt="Profile" />
              <AvatarFallback>JS</AvatarFallback>
            </Avatar>

            {/* USER INFO */}
            <div className="hidden leading-tight md:block">
              <p className="text-foreground text-sm font-semibold">Jessin Sam</p>

              <p className="text-muted-foreground text-xs">jessin@gmail.com</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
