import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <Image src="/Mafia.png" alt="مافيوزو" width={160} height={160} className="mb-4 invert" priority />
      <h1 className="text-5xl font-bold text-foreground mb-4">مافيوزو</h1>
      <p className="text-muted-foreground text-lg mb-12 text-center">
        لعبة الجريمة والاتهام - اكتشف مين المافيوزو قبل ما الوقت يخلص
      </p>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <a
          href="/create"
          className="bg-accent hover:bg-accent/90 text-accent-foreground text-center py-4 px-6 rounded-xl text-lg font-semibold transition-colors"
        >
          أنشئ أوضة جديدة
        </a>
        <a
          href="/join"
          className="bg-card hover:bg-card/80 text-card-foreground border border-border text-center py-4 px-6 rounded-xl text-lg font-semibold transition-colors"
        >
          ادخل أوضة
        </a>
      </div>
    </div>
  );
}
