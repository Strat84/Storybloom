import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import config from "@config";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { loadStoryList } from "@/lib/checkout";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const name = user?.apiProfile?.fullName || user?.name || "";
  const email = user?.apiProfile?.email || user?.email || "";

  /** Deleting a story removes its pages, pictures and any uploaded photos. */
  const deleteEverything = async () => {
    setDeleting(true);
    try {
      const stories = await loadStoryList();
      for (const s of stories) await api(`/stories/${s.storyId}`, { method: "DELETE" });
      toast({ title: "Deleted", description: `${stories.length} book${stories.length === 1 ? "" : "s"} and all uploaded photos were deleted.` });
      navigate("/mystories");
    } catch {
      toast({ title: "Something went wrong", description: "Some books may not have been deleted. Please try again.", variant: "destructive" });
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-2xl space-y-6">
      <h1 className="text-3xl sm:text-4xl font-display font-bold">Your account</h1>
      <Card className="p-6 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Name</p>
          <p className="font-medium">{name || "Not set"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{email}</p>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild><Link href="/mystories">My Stories</Link></Button>
          <Button variant="outline" onClick={signOut}>Sign out</Button>
        </div>
      </Card>
      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-semibold">Your photos and books</h2>
        <p className="text-sm text-muted-foreground">
          Photos you upload are private and are deleted automatically within 30 days. You can delete all of your books and photos now.
        </p>
        <Button variant="outline" className="text-destructive border-destructive/40" onClick={() => setConfirming(true)}>Delete my photos and books</Button>
        <p className="text-sm text-muted-foreground">
          To close your account completely, email{" "}
          <a href={`mailto:${config.site.supportEmail}?subject=Delete%20my%20account`} className="text-primary hover:underline">{config.site.supportEmail}</a> from the address on your account.
        </p>
      </Card>

      <AlertDialog open={confirming} onOpenChange={(o) => !o && !deleting && setConfirming(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all your books and photos?</AlertDialogTitle>
            <AlertDialogDescription>Every book, its pictures and any photos you uploaded will be permanently deleted. Purchased PDFs you've already downloaded stay on your device.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); deleteEverything(); }} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
