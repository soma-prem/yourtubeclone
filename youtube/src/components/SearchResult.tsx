import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";

const SearchResult = ({ query }: any) => {
  if (!query.trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Enter a search term to see results.</p>
      </div>
    );
  }
  const [video, setvideo] = useState<any>(null);
  const Videos = async () => {
    const allvideos = [
      {
        _id: "1",
        videotitle: "Amazing Nature Documentary",
        filename: "vdo.mp4",
        filetype: "video/mp4",
        filepath: "/video/vdo.mp4",
        filesize: "500MB",
        videochanel: "Nature Channel",
        Like: 1250,
        Dislike: 50,
        views: 45000,
        uploader: "nature_lover",
        createdAt: new Date().toISOString(),
      },
      {
        _id: "2",
        videotitle: "Cooking Tutorial: Perfect Pasta",
        filename: "vdo.mp4",
        filetype: "video/mp4",
        filepath: "/video/vdo.mp4",
        filesize: "300MB",
        videochanel: "Chef's Kitchen",
        Like: 890,
        Dislike: 20,
        views: 23000,
        uploader: "chef_master",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    let results = allvideos.filter(
      (video) =>
        video.videotitle.toLowerCase().includes(query.toLowerCase()) ||
        video.videochanel.toLowerCase().includes(query.toLowerCase())
    );
    setvideo(results);
  };
  useEffect(() => {
    Videos();
  }, [query]);

  if (!video || video.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found for "{query}"</h2>
        <p className="text-muted-foreground">
            Try different keywords or remove search filters
        </p>
      </div>
    );
  }
  const hasResults = video ? video.length > 0 : true;
  if (!hasResults) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-muted-foreground">
          Try different keywords or remove search filters
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {video.length > 0 && (
        <div className="space-y-4">
          {video.map((video: any) => (
            <div key={video._id} className="flex gap-4 group">
              <Link href={`/watch/${video._id}`} className="flex-shrink-0">
                <div className="relative w-80 aspect-video bg-muted rounded-lg overflow-hidden">
                  <video
                    src={video.filepath}
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
                    10:24
                  </div>
                </div>
              </Link>

              <div className="flex-1 min-w-0 py-1">
                <Link href={`/watch/${video._id}`}>
                  <h3 className="font-medium text-lg line-clamp-2 group-hover:text-blue-600 mb-2">
                    {video.videotitle}
                  </h3>
                </Link>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span>{video.views.toLocaleString()} views</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(video.createdAt))} ago
                  </span>
                </div>

                <Link
                  href={`/channel/${video.uploader}`}
                  className="flex items-center gap-2 mb-2 hover:text-blue-600"
                >
                  <Avatar className="w-6h-6">
                    <AvatarImage src="/placeholder.svg?height=24&width=24" />
                    <AvatarFallback className="text-xs">
                      {video.videochanel[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {video.videochanel}
                  </span>
                </Link>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  Sample video description that would show search-relevant
                  content and help users understand what the video is about
                  before clicking.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasResults && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Showing {Videos.length} results for "{query}"
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchResult;
