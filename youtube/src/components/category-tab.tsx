import React, { useState } from "react";
import { Button } from "./ui/button";

const categories = [
  "All",
  "Music",
  "Gaming",
  "Movies",
  "News",
  "Sports",
  "Technology",
  "Comedy",
  "Education",
  "Science",
  "Travel",
  "Food",
  "Fashion",
];

const Categorytab = () => {
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <div className="flex flex-wrap gap-2 m-2 p-2">
      {categories.map((cat) => (
        <Button
          key={cat}
          variant={activeCategory === cat ? "default" : "ghost"}
          onClick={() => setActiveCategory(cat)}
        >
          {cat}
        </Button>
      ))}
    </div>
  );
};

export default Categorytab;
