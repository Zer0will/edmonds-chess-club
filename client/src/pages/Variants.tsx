/**
 * Variants Page — Edmonds Chess Club
 * Explains each chess variant with rules and how to play
 */
import { Link } from "wouter";
import { Crown, Swords, BookOpen, ArrowRight } from "lucide-react";

const variants = [
  {
    id: "standard",
    title: "Standard Chess",
    subtitle: "The classic game",
    icon: Crown,
    description: "The timeless game of strategy played on a full 8x8 board with all 32 pieces. All standard FIDE rules apply including castling, en passant, pawn promotion, and the fifty-move rule.",
    rules: [
      "Full 32-piece setup: King, Queen, 2 Rooks, 2 Bishops, 2 Knights, 8 Pawns per side",
      "White moves first, players alternate turns",
      "Win by checkmate, or draw by stalemate, repetition, or agreement",
      "Special moves: castling (king-side and queen-side), en passant capture, pawn promotion",
    ],
    difficulty: "All levels",
    playLink: "/play?variant=standard",
  },
  {
    id: "half-chess",
    title: "Half-Chess",
    subtitle: "Edmonds Chess Club Original",
    icon: Swords,
    description: "An Edmonds Chess Club original variant designed to train endgame skills. By starting with only the king-side pieces, players are immediately thrust into positions that demand precise calculation and piece coordination — skills that are critical in real game endgames.",
    rules: [
      "Setup: Only king-side pieces — King, Bishop, Knight, Rook, and 4 Pawns per side",
      "Pieces start in their standard king-side positions (e-h files)",
      "All standard chess rules apply from the starting position",
      "King-side castling is available if neither the king nor the h-file rook has moved (queen-side castling is not possible — there is no queen-side rook)",
      "Pawn promotion follows standard rules",
      "Win by checkmate or resignation; draw by stalemate or agreement",
    ],
    difficulty: "Intermediate+",
    playLink: "/play?variant=half-chess",
    featured: true,
  },
];

export default function Variants() {
  return (
    <div className="flex flex-col">
      {/* Header */}
      <section className="py-20 sm:py-28">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-gold-gradient mb-6 animate-fade-in-up opacity-0" style={{ animationFillMode: "forwards" }}>
            Chess Variants
          </h1>
          <p className="text-silver text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed animate-fade-in-up opacity-0 stagger-1" style={{ animationFillMode: "forwards" }}>
            From the classic game to our original training variants, explore different ways 
            to challenge yourself and improve your chess.
          </p>
        </div>
      </section>

      {/* Variants List */}
      <section className="pb-20 sm:pb-28">
        <div className="container max-w-5xl mx-auto px-4 space-y-8">
          {variants.map((variant) => (
            <article
              key={variant.id}
              className={`glass-card rounded-2xl p-8 sm:p-10 transition-all duration-300 hover:border-gold/20 ${
                variant.featured ? "ring-1 ring-purple/30" : ""
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                <div className="w-14 h-14 rounded-xl bg-purple/15 flex items-center justify-center shrink-0">
                  <variant.icon className="w-7 h-7 text-purple-light" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-gold-light">
                      {variant.title}
                    </h2>
                    {variant.featured && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple/20 text-purple-light border border-purple/30">
                        Club Original
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gold/10 text-gold border border-gold/20">
                      {variant.difficulty}
                    </span>
                  </div>
                  <p className="text-silver-dark leading-relaxed mb-6">
                    {variant.description}
                  </p>

                  {/* Rules */}
                  <div className="mb-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-silver uppercase tracking-wide mb-3">
                      <BookOpen className="w-4 h-4" /> Rules
                    </h3>
                    <ul className="space-y-2">
                      {variant.rules.map((rule, i) => (
                        <li key={i} className="flex items-start gap-3 text-silver-dark">
                          <span className="w-5 h-5 rounded-full bg-navy-light border border-border flex items-center justify-center shrink-0 mt-0.5 text-xs text-muted-foreground">
                            {i + 1}
                          </span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={variant.playLink}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gold text-navy-dark font-semibold transition-all duration-200 hover:bg-gold-light btn-press"
                  >
                    Play {variant.title} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Design Your Own CTA */}
      <section className="pb-20 sm:pb-28">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <div className="glass-card rounded-2xl p-10">
            <h2 className="font-display text-2xl font-bold text-gold-light mb-3">
              Have a Variant Idea?
            </h2>
            <p className="text-silver-dark max-w-lg mx-auto mb-6">
              The Edmonds Chess Club is always experimenting with new variants. 
              Bring your ideas to our Thursday meetings and we'll playtest them together.
            </p>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-gold hover:text-gold-light transition-colors font-medium"
            >
              Find our meeting info <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
