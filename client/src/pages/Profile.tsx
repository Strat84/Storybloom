import { Link } from "wouter";
import config from "@config";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

export default function Profile() {
  const { user, signOut } = useAuth();
  const name = user?.apiProfile?.fullName || user?.name || "";
  const email = user?.apiProfile?.email || user?.email || "";

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
      <Card className="p-6 space-y-2">
        <h2 className="text-lg font-semibold">Your data</h2>
        <p className="text-sm text-muted-foreground">
          You can delete any story from My Stories. To delete your account and everything in it, email{" "}
          <a href={`mailto:${config.site.supportEmail}?subject=Delete%20my%20account`} className="text-primary hover:underline">{config.site.supportEmail}</a>{" "}
          from the address on your account.
        </p>
      </Card>
    </div>
  );
}
