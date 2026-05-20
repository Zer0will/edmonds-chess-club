import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Menu, X, Crown } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/variants", label: "Variants" },
  { href: "/about", label: "About" },
  { href: "/stats", label: "Stats" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-atmosphere flex flex-col">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-navy-dark/80 backdrop-blur-xl">
        <nav className="container flex items-center justify-between h-16" aria-label="Main navigation">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2 group" aria-label="Edmonds Chess Club Home">
            <Crown className="w-6 h-6 text-gold transition-transform duration-200 group-hover:scale-110" />
            <span className="font-display font-bold text-lg text-gold-light hidden sm:block">
              Edmonds Chess Club
            </span>
            <span className="font-display font-bold text-lg text-gold-light sm:hidden">
              ECC
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  location === link.href
                    ? "text-gold bg-gold/10 border border-gold/20"
                    : "text-silver hover:text-gold-light hover:bg-white/5"
                }`}
                aria-current={location === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Play CTA (Desktop) */}
          <div className="hidden md:block">
            <Link
              href="/play"
              className="px-5 py-2 rounded-md bg-gold text-navy-dark font-semibold text-sm transition-all duration-200 hover:bg-gold-light btn-press"
            >
              Play Now
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-silver hover:text-gold transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-navy-dark/95 backdrop-blur-xl">
            <div className="container py-4 flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-3 rounded-md text-base font-medium transition-all duration-200 ${
                    location === link.href
                      ? "text-gold bg-gold/10 border border-gold/20"
                      : "text-silver hover:text-gold-light hover:bg-white/5"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={location === link.href ? "page" : undefined}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/play"
                className="mt-2 px-5 py-3 rounded-md bg-gold text-navy-dark font-semibold text-center transition-all duration-200 hover:bg-gold-light"
                onClick={() => setMobileMenuOpen(false)}
              >
                Play Now
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-navy-dark/60 backdrop-blur-sm">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-gold/60" />
              <span className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Edmonds Chess Club. Edmonds, Washington.
              </span>
            </div>
            <div className="flex items-center gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-silver transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
