import { Link } from "wouter";
import { SiTiktok, SiInstagram, SiFacebook, SiYoutube } from "react-icons/si";
import config from "@config";
import { enabledLandingPages } from "@/content/landing";

const linkClass = "text-sm text-muted-foreground hover:text-primary transition-colors";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { name: "TikTok", icon: SiTiktok, href: config.site.social.tiktok },
    { name: "Instagram", icon: SiInstagram, href: config.site.social.instagram },
    { name: "Facebook", icon: SiFacebook, href: config.site.social.facebook },
    { name: "YouTube", icon: SiYoutube, href: config.site.social.youtube },
  ].filter((s) => s.href);

  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1 space-y-3">
            <p className="text-lg font-display font-bold text-primary">StoryBloom</p>
            <p className="text-sm text-muted-foreground font-story">
              Personalized storybooks where your child is the hero. Printed keepsakes and instant digital books.
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-4 pt-1">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label={`StoryBloom on ${social.name}`}
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <nav aria-label="Personalized books" className="space-y-3">
            <p className="text-sm font-semibold">Personalized books</p>
            <ul className="flex flex-col gap-2">
              {enabledLandingPages().map((p) => (
                <li key={p.path}>
                  <Link href={p.path} className={linkClass}>
                    {p.breadcrumb}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="StoryBloom" className="space-y-3">
            <p className="text-sm font-semibold">StoryBloom</p>
            <ul className="flex flex-col gap-2">
              <li><Link href="/create" className={linkClass}>Create a book</Link></li>
              <li><Link href="/examples" className={linkClass}>Example books</Link></li>
              <li><Link href="/pricing" className={linkClass}>Pricing &amp; shipping</Link></li>
              <li><Link href="/faq" className={linkClass}>FAQ</Link></li>
              <li><Link href="/partners" className={linkClass}>Partner program</Link></li>
            </ul>
          </nav>

          <nav aria-label="Help and legal" className="space-y-3">
            <p className="text-sm font-semibold">Help</p>
            <ul className="flex flex-col gap-2">
              <li><a href={`mailto:${config.site.supportEmail}`} className={linkClass}>{config.site.supportEmail}</a></li>
              <li><Link href="/terms" className={linkClass}>Terms of Service</Link></li>
              <li><Link href="/privacy" className={linkClass}>Privacy Policy</Link></li>
            </ul>
          </nav>
        </div>

        <div className="pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground">© {currentYear} StoryBloom. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
