import Categorytab from "@/components/category-tab";
import Videogrid from "@/components/videogrid";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="flex-1 p-4">
      <Categorytab />
      <Suspense fallback={<div>Loading Video...</div>}>
        <Videogrid />
      </Suspense>
    </main>
  );
}
