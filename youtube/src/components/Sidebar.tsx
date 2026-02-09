"use client";

import { Clock, Compass, Crown, Download, Home, PlaySquare, ThumbsUp, User } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";
import { useState } from "react";
import { DropdownMenuItem } from "./ui/dropdown-menu";
import ChannelVideo from "./ChannelVideo";
import { useUser } from "@/lib/AuthContext";

const Sidebar = () => {
  const { user } = useUser();
  const [isdialogopen, setisdialogopen] = useState(false);

  return (
    <aside className="w-64 bg-sidebar border-sidebar-border border-r min-h-screen p-2 flex flex-col text-sidebar-foreground">
      <nav className="space-y-1 flex-1">
        {}
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start">
            <Home className="w-5 h-5 mr-3" />
            Home
          </Button>
        </Link>
        <Link href="/explore">
          <Button variant="ghost" className="w-full justify-start">
            <Compass className="w-5 h-5 mr-3" />
            Explore
          </Button>
        </Link>
        <Link href="/subscriptions">
          <Button variant="ghost" className="w-full justify-start">
            <PlaySquare className="w-5 h-5 mr-3" />
            Subscriptions
          </Button>
        </Link>
        {}

        {user && (
          <>
            <div className="border-t pt-2 mt-2">
              {}
              <Link href="/history">
                <Button variant="ghost" className="w-full justify-start">
                  <Clock className="w-5 h-5 mr-3" />
                  History
                </Button>
              </Link>
              <Link href="/liked">
                <Button variant="ghost" className="w-full justify-start">
                  <ThumbsUp className="w-5 h-5 mr-3" />
                  Liked videos
                </Button>
              </Link>
              <Link href="/watch-later">
                <Button variant="ghost" className="w-full justify-start">
                  <Clock className="w-5 h-5 mr-3" />
                  Watch later
                </Button>
              </Link>
              <Link href="/downloads">
                <Button variant="ghost" className="w-full justify-start">
                  <Download className="w-5 h-5 mr-3" />
                  Downloads
                </Button>
              </Link>

              {user?.channelname ? (
                <Link href={`/channel/${user.id}`}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="w-5 h-5 mr-3" />
                    Your channel
                  </Button>
                </Link>
              ) : (
                <div className="px-2 py-1.5">
                  <Button variant="secondary" className="w-full" size="sm" onClick={() => setisdialogopen(true)}>
                    Create a Channel
                  </Button>
                </div>
              )}
            </div>

            {}
            <div className="border-t pt-2 mt-2">
              <Link href="/premium">
                <Button
                  variant="ghost"
                  className={`w-full justify-start transition-colors ${user?.plan && user.plan !== 'FREE'
                      ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : 'text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                    }`}
                >
                  <Crown className="w-5 h-5 mr-3" />
                  {}
                  {user?.plan && user.plan !== 'FREE'
                    ? `${user.plan} Active`
                    : "Get Subscription Plan"
                  }
                </Button>
              </Link>
            </div>
            {}
          </>
        )}
      </nav>

      {}
      <ChannelVideo
        isopen={isdialogopen}
        onclose={() => setisdialogopen(false)}
        mode="create"
      />
    </aside>
  );
};

export default Sidebar;