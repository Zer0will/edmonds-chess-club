import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Menu, X, Crown, LogOut, User } from "lucide-react";
import { useAuth, getLoginUrl } from "@/hooks/useAuth";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/variants", label: "Variants" },
  { href: "/about", label: "About" },
  { href: "/stats", label: "Leaderboard" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-atmosphere flex flex-col relative">
      <div className="bg-atmosphere-layer" aria-hidden="true" />
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
          <div className="hidden lg:flex items-center gap-1">
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

          {/* Auth + Play CTA (Desktop) */}
          <div className="hidden lg:flex items-center gap-3">
            <AuthBlock />
            <Link
              href="/play"
              className="px-5 py-2 rounded-md bg-gold text-navy-dark font-semibold text-sm transition-all duration-200 hover:bg-gold-light btn-press"
            >
              Play Now
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 text-silver hover:text-gold transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border/50 bg-navy-dark/95 backdrop-blur-xl">
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
              <div className="pt-2 border-t border-border/30 mt-2">
                <AuthBlock mobile onAction={() => setMobileMenuOpen(false)} />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-16 relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-navy-dark/60 backdrop-blur-sm">
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

function AuthBlock({ mobile = false, onAction }: { mobile?: boolean; onAction?: () => void }) {
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className={mobile ? "px-4 py-3 text-sm text-muted-foreground" : "text-sm text-muted-foreground"}>
        ...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <a
        href={getLoginUrl()}
        onClick={onAction}
        className={
          mobile
            ? "flex items-center justify-center gap-2 px-4 py-3 rounded-md border border-gold/40 text-gold-light font-medium"
            : "flex items-center gap-2 px-4 py-2 rounded-md border border-gold/40 text-gold-light text-sm font-medium hover:bg-gold/10 transition-colors"
        }
      >
        <User className="w-4 h-4" />
        Sign In
      </a>
    );
  }

  return (
    <div className={mobile ? "flex flex-col gap-2" : "flex items-center gap-3"}>
      <Link
        href="/profile"
        onClick={onAction}
        className={
          mobile
            ? "flex items-center gap-3 px-4 py-3 rounded-md bg-white/5 border border-border/40"
            : "flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-border/40 hover:bg-white/10 transition-colors"
        }
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple/40 to-gold/40 flex items-center justify-center text-xs font-bold text-gold-light">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className={mobile ? "flex-1" : "hidden lg:flex flex-col"}>
          <span className="text-sm text-silver leading-tight">{user.name}</span>
          <span className="text-xs text-gold/70 leading-tight">{user.rating} • {user.wins}W</span>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => {
          logout();
          onAction?.();
        }}
        className={
          mobile
            ? "flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm text-muted-foreground hover:text-silver border border-border/40"
            : "p-2 rounded-md text-muted-foreground hover:text-silver hover:bg-white/5 transition-colors"
        }
        aria-label="Sign out"
      >
        <LogOut className="w-4 h-4" />
        {mobile && <span>Sign Out</span>}
      </button>
    </div>
  );
}
