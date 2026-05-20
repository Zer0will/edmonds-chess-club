/**
 * About Page — Edmonds Chess Club
 * Club history, mission, meeting times, location info
 */
import { MapPin, Clock, Users, Trophy, BookOpen } from "lucide-react";

const WATERFRONT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/90669572/iXh5exPpYgD5xJmVVqVMmV/edmonds-waterfront-AnJ69xwVUE2M29VrEMFkfa.webp";
const PIECES_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/90669572/iXh5exPpYgD5xJmVVqVMmV/chess-pieces-closeup-YQiCSdcVRZwgTnDxhmwcmC.webp";

const meetingInfo = [
  {
    icon: Clock,
    label: "When",
    value: "Every Thursday, 6:00 PM – 9:00 PM",
  },
  {
    icon: MapPin,
    label: "Where",
    value: "Edmonds College, Lynnwood, WA",
  },
  {
    icon: Users,
    label: "Who",
    value: "All skill levels welcome — beginners to experts",
  },
  {
    icon: Trophy,
    label: "Tournaments",
    value: "Monthly rated tournaments, first Saturday of each month",
  },
];

const values = [
  {
    icon: Users,
    title: "Community First",
    description: "Chess is better together. We foster a welcoming environment where players of all backgrounds and skill levels can learn, compete, and grow.",
  },
  {
    icon: BookOpen,
    title: "Continuous Learning",
    description: "From opening theory to endgame technique, we encourage study and improvement. Our custom variants are designed as training tools.",
  },
  {
    icon: Trophy,
    title: "Friendly Competition",
    description: "Regular tournaments and rated play give members the chance to test their skills in a supportive, competitive environment.",
  },
];

export default function About() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={WATERFRONT_IMG}
            alt=""
            className="w-full h-full object-cover opacity-25"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        </div>

        <div className="relative z-10 container max-w-4xl mx-auto px-4">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-gold-gradient text-center mb-6 animate-fade-in-up opacity-0" style={{ animationFillMode: "forwards" }}>
            About Our Club
          </h1>
          <p className="text-center text-silver text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed animate-fade-in-up opacity-0 stagger-1" style={{ animationFillMode: "forwards" }}>
            The Edmonds Chess Club brings together chess enthusiasts from across the 
            Pacific Northwest for weekly play, study, and competition.
          </p>
        </div>
      </section>

      {/* Mission & History */}
      <section className="py-16 sm:py-20">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl font-bold text-gold-light mb-6">
                Our Mission
              </h2>
              <div className="space-y-4 text-silver-dark leading-relaxed">
                <p>
                  The Edmonds Chess Club exists to promote the game of chess in the Edmonds, Washington 
                  community and beyond. We believe chess builds critical thinking, patience, and 
                  sportsmanship — skills that extend far beyond the 64 squares.
                </p>
                <p>
                  Based at Edmonds College, we provide a welcoming space for players of all ages 
                  and skill levels. Whether you're learning how the pieces move or preparing for 
                  your next rated tournament, you'll find a home here.
                </p>
                <p>
                  We're also innovators — developing original chess variants like Half-Chess that 
                  serve as focused training tools for specific aspects of the game.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-purple/10 blur-[60px] rounded-full" aria-hidden="true" />
              <img
                src={PIECES_IMG}
                alt="Ornate chess pieces on a board"
                className="relative rounded-xl border border-border/50 shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-20 border-t border-border/30">
        <div className="container max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center text-gold-light mb-12">
            What We Stand For
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value) => (
              <div key={value.title} className="text-center">
                <div className="w-14 h-14 rounded-xl bg-purple/15 flex items-center justify-center mx-auto mb-5">
                  <value.icon className="w-7 h-7 text-purple-light" />
                </div>
                <h3 className="font-display text-xl font-semibold text-gold-light mb-3">
                  {value.title}
                </h3>
                <p className="text-silver-dark leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meeting Information */}
      <section className="py-16 sm:py-20 border-t border-border/30">
        <div className="container max-w-4xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center text-gold-light mb-12">
            Join Us
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {meetingInfo.map((item) => (
              <div
                key={item.label}
                className="glass-card rounded-xl p-6 flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-1">
                    {item.label}
                  </p>
                  <p className="text-silver font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 glass-card rounded-xl p-8 text-center">
            <h3 className="font-display text-xl font-semibold text-gold-light mb-3">
              No Membership Required
            </h3>
            <p className="text-silver-dark max-w-lg mx-auto">
              Just show up on any Thursday evening. Bring a chess set if you have one, 
              but we have boards available. New players are always welcome.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
