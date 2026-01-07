import { SpinWheel } from "@/components/wheel/SpinWheel";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start p-6">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-3">
            Lucky Draw
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            Spin the wheel and test your luck! Every spin is a chance to win amazing prizes.
          </p>
        </div>

        {/* Wheel */}
        <SpinWheel />

        {/* Footer */}
        <p className="text-sm text-muted-foreground/60 mt-8">
          Each spin is completely random • Good luck! 🍀
        </p>
      </div>
    </div>
  );
};

export default Index;
