import React, { useEffect, useState } from "react";
import Videocard from "./Videocard";
import axiosInstance from "@/lib/axiosinstance";

const Videogrid = () => {
  const [videos, setvideo] = useState<any[]>([]);
  const [loading, setloading] = useState(true);

  useEffect(() => {
    const fetchvideo = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        setvideo(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {loading ? (
        <>Loading..</>
      ) : videos.length === 0 ? (
        <>No videos found</>
      ) : (
        videos.map((video: any) => (
          <Videocard key={video._id} video={video} />
        ))
      )}
    </div>
  );
};

export default Videogrid;
