import { Bell, Menu, Mic, User, VideoIcon } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { DropdownMenuSeparator } from "@radix-ui/react-dropdown-menu";
import ChannelVideo from "./ChannelVideo";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import OtpDialog from "./OtpDialog";

const Header = () => {
  const { user, loading, logout, handleAuthStateChange } = useUser();

  console.log("Header component - Current user state:", user);
  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogopen, setisdialogopen] = useState(false);
  const router = useRouter();
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchQuery.trim()) {
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-background border-b border-border sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Menu className="w-6 h-6" />
        </Button>
        <Link href={"/"} className="flex items-center gap-1">
          <div className="bg-red-600 p-1 rounded">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <span className="text-xl font-medium">YouTube</span>
          <span className="text-xs text-muted-foreground ml-1">IN</span>
        </Link>
      </div>
      <form
        onSubmit={handleSearch}
        className="flex flex-1 max-w-xl items-center gap-2"
      >
        <div className="flex flex-1">
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onKeyDown={handleKeyDown}
            className="rounded-l-full border-r-0 focus-visible:ring-0"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button
            type="submit"
            className="rounded-r-full px-6 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-l-0"
          ></Button>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Mic className="w-5 h-5" />
        </Button>
      </form>
      {loading ? (
        <div className="w-10 h-10 rounded-full bg-muted animate-pulse"></div>
      ) : user ? (
        <div className="flex items-center gap-2">
          <Link href="/call">
            <Button variant="secondary" size="sm">
              Call
            </Button>
          </Link>
          <Button variant="ghost" size="icon">
            <VideoIcon className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar>
                  <AvatarImage src={user.image} alt={user.name} />
                  <AvatarFallback>
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent forceMount>
              {user?.channelname? (
                <DropdownMenuItem asChild>
                  <Link href={`/channel/${user.id}`}>Your Channel</Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <button
                    className="w-full text-left"
                    onClick={() => setisdialogopen(true)}
                  >
                    Create a Channel
                  </button>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem>
                <Link href={`/history`}>History</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href={`/likedvideos/${user.id}`}>Liked Videos</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href={`/watchlater/${user.id}`}>Watch Later</Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <Button
          className="flex items-center gap-2"
          onClick={handleAuthStateChange}
        >
          <User className="mr-2 w-4 h-4" />
          Sign in
        </Button>
      )}
      <ChannelVideo
        isopen={isdialogopen}
        onclose={() => setisdialogopen(false)}
        mode="create"
      />
      <OtpDialog />
    </header>
  );
};

export default Header;
