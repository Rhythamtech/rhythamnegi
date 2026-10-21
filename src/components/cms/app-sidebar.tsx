import * as React from "react"
import {
  FileText,
  FolderKanban,
  Images,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sparkles,
  SquareUser,
  UserRound,
  IdCard,
  type LucideIcon
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@src/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@src/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from "@src/components/ui/sidebar"

export type NavItem = {
  title: string
  url: string
  icon: LucideIcon
  key: string
}

export type AppSidebarProps = {
  user: string
  avatarUrl?: string
  siteTitle: string
  active: string
}

export function AppSidebar(props: AppSidebarProps) {
  const { user, avatarUrl, siteTitle, active } = props

  const navMain: NavItem[] = [
    { key: "dashboard", title: "Dashboard", url: "/cms", icon: LayoutDashboard },
    { key: "posts", title: "Posts", url: "/cms/posts", icon: FileText },
    { key: "projects", title: "Projects", url: "/cms/projects", icon: FolderKanban },
    { key: "profile", title: "Profile & Site", url: "/cms/profile", icon: SquareUser },
    { key: "about", title: "About Page", url: "/cms/about", icon: IdCard },
    { key: "images", title: "Images", url: "/cms/images", icon: Images },
    { key: "ai", title: "AI Assist", url: "/cms/ai", icon: Sparkles },
    { key: "account", title: "Account", url: "/cms/account", icon: ShieldCheck }
  ]

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip={siteTitle}>
              <a href="/cms" className="gap-2">
                <Avatar className="size-8 rounded-md">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={siteTitle} /> : null}
                  <AvatarFallback className="rounded-md">{siteTitle.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Devfolio CMS</span>
                  <span className="truncate text-xs text-muted-foreground">{siteTitle}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild isActive={active === item.key} tooltip={item.title}>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Public site</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="View site">
                  <a href="/" target="_blank" rel="noopener noreferrer">
                    <UserRound />
                    <span>View site</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function NavUser({ user }: { user: string }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg">{user.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user}</span>
                <span className="truncate text-xs text-muted-foreground">Signed in</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="top"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">{user.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user}</span>
                  <span className="truncate text-xs text-muted-foreground">CMS admin</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action="/cms/api/logout" method="post">
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full cursor-pointer">
                  <LogOut />
                  Log out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
