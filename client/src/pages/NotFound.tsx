import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-20 text-center max-w-lg">
      <h1 className="text-3xl font-display font-bold mb-3">Page not found</h1>
      <p className="text-muted-foreground mb-6">That page doesn't exist, but your next story is just a few clicks away.</p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button asChild><Link href="/">Go home</Link></Button>
        <Button asChild variant="outline"><Link href="/create">Create a book</Link></Button>
      </div>
    </div>
  );
}
