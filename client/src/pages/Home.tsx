/**
 * Home Page — Edmonds Chess Club
 * Design: "Midnight Tournament" atmospheric immersion
 * Hero with atmospheric chess imagery, club intro, events preview, CTA to play
 */
import { Link } from "wouter";
import { Swords, Calendar, Users, Trophy, ChevronRight } from "lucide-react";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/90669572/iXh5exPpYgD5xJmVVqVMmV/hero-chess-atmosphere-dX7NisvgapvzcESuGGWuV7.webp";
const TOURNAMENT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/90669572/iXh5exPpYgD5xJmVVqVMmV/chess-tournament-atmosphere-hvKk336TLKpfaUozpvMhG3.webp";
const LOGO_IMG = "/manus-storage/club-logo_f7639e7d.jpg";

const features = [
  {
    icon: Swords,
    title: "Play Online",
    description: "Challenge our AI opponents or play against a friend on the same device. Standard chess and custom variants available.",
  },
  {
    icon: Users,
    title: "Join the Club",
    description: "Meet fellow chess enthusiasts every week at Edmonds College. All skill levels welcome.",
  },
  {
    icon: Trophy,
    title: "Custom Variants",
    description: "Try Half-Chess, our original endgame training variant designed to sharpen your skills.",
  },
];

const upcomingEvents = [
  {
    date: "Every Thursday",
    time: "6:00 PM - 9:00 PM",
    title: "Weekly Club Meeting",
    location: "Edmonds College, Lynnwood, WA",
  },
  {
    date: "Monthly",
    time: "First Saturday",
    title: "Rated Tournament",
    location: "Edmonds College, Lynnwood, WA",
  },
  {
    date: "Ongoing",
    time: "Anytime",
    title: "Online Play",
    location: "Right here on this site",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt=""
            className="w-full h-full object-cover opacity-40"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/60 via-transparent to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-dark/40 via-transparent to-navy-dark/40" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container text-center max-w-4xl mx-auto px-4">
          <div className="animate-fade-in-up opacity-0" style={{ animationFillMode: "forwards" }}>
            <img
              src={LOGO_IMG}
              alt="Edmonds Chess Club Logo"
              className="w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-8 rounded-full border-2 border-gold/30 shadow-lg shadow-purple/20"
            />
          </div>
          <h1 className="animate-fade-in-up opacity-0 stagger-1 font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gold-gradient leading-tight" style={{ animationFillMode: "forwards" }}>
            Edmonds Chess Club
          </h1>
          <p className="animate-fade-in-up opacity-0 stagger-2 mt-6 text-lg sm:text-xl text-silver max-w-2xl mx-auto leading-relaxed" style={{ animationFillMode: "forwards" }}>
            Where strategy meets community. Play standard chess, explore our original variants, 
            and sharpen your game with players of all levels in Edmonds, Washington.
          </p>
          <div className="animate-fade-in-up opacity-0 stagger-3 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animationFillMode: "forwards" }}>
            <Link
              href="/play"
              className="px-8 py-4 rounded-lg bg-gold text-navy-dark font-semibold text-lg transition-all duration-200 hover:bg-gold-light hover:shadow-lg hover:shadow-gold/20 btn-press"
            >
              Play Now
            </Link>
            <Link
              href="/about"
              className="px-8 py-4 rounded-lg border border-silver/30 text-silver font-medium text-lg transition-all duration-200 hover:border-gold/50 hover:text-gold-light"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Ambient glow at bottom */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-purple/20 blur-[100px] rounded-full" aria-hidden="true" />
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-28">
        <div className="container max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center text-gold-light mb-4">
            Your Move
          </h2>
          <p className="text-center text-silver-dark max-w-xl mx-auto mb-16">
            Whether you're a beginner learning the basics or a seasoned player seeking competition, 
            the Edmonds Chess Club has something for you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`glass-card rounded-xl p-8 transition-all duration-300 hover:border-gold/30 hover:-translate-y-1 group animate-fade-in-up opacity-0 stagger-${i + 1}`}
                style={{ animationFillMode: "forwards", animationDelay: `${(i + 1) * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-lg bg-purple/20 flex items-center justify-center mb-5 group-hover:bg-purple/30 transition-colors">
                  <feature.icon className="w-6 h-6 text-purple-light" />
                </div>
                <h3 className="font-display text-xl font-semibold text-gold-light mb-3">
                  {feature.title}
                </h3>
                <p className="text-silver-dark leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tournament Atmosphere Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={TOURNAMENT_IMG}
            alt=""
            className="w-full h-full object-cover opacity-30"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background" />
        </div>

        <div className="relative z-10 container max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-gold-light mb-6">
                Upcoming Events
              </h2>
              <p className="text-silver-dark mb-8 leading-relaxed">
                Join us at Edmonds College for weekly meetings, monthly tournaments, 
                and special events. All skill levels are welcome — from first-time players to rated competitors.
              </p>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-gold hover:text-gold-light transition-colors font-medium"
              >
                View all events <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {upcomingEvents.map((event, i) => (
                <div
                  key={event.title}
                  className="glass-card rounded-lg p-5 flex items-start gap-4 transition-all duration-200 hover:border-purple/30"
                >
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-silver mb-1">{event.title}</h4>
                    <p className="text-sm text-silver-dark">
                      {event.date} &middot; {event.time}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{event.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-purple/10 blur-[80px] rounded-full" aria-hidden="true" />
            <div className="relative glass-card rounded-2xl p-10 sm:p-14">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-gold-gradient mb-4">
                Ready to Play?
              </h2>
              <p className="text-silver-dark mb-8 max-w-lg mx-auto">
                Jump into a game right now — play standard chess against our AI, 
                or try Half-Chess, our original endgame training variant.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/play"
                  className="px-8 py-4 rounded-lg bg-gold text-navy-dark font-semibold transition-all duration-200 hover:bg-gold-light hover:shadow-lg hover:shadow-gold/20 btn-press"
                >
                  Start a Game
                </Link>
                <Link
                  href="/variants"
                  className="px-8 py-4 rounded-lg border border-purple/40 text-purple-light font-medium transition-all duration-200 hover:border-purple hover:bg-purple/10"
                >
                  Explore Variants
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
