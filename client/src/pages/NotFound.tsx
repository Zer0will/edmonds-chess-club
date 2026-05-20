import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
      <div className="container max-w-lg mx-auto px-4 text-center">
        <div className="text-6xl mb-4">♚</div>
        <h1 className="font-display text-4xl font-bold text-gold-gradient mb-4">
          Page Not Found
        </h1>
        <p className="text-silver-dark mb-8">
          This square is empty. The page you're looking for doesn't exist.
        </p>
        <Link
          href="/"
          className="px-6 py-3 rounded-lg bg-gold text-navy-dark font-semibold transition-all duration-200 hover:bg-gold-light btn-press"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
